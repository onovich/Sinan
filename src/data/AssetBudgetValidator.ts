import type { AssetManifestData, AssetMetadataData, AssetType } from '../schemas/asset.schema';
import { RenderStyleProfileSchema } from '../schemas/renderStyle.schema';
import type { ReferenceValidationIssue } from './ReferenceResolver';

export type SupportedModelCompressionCodec = NonNullable<AssetMetadataData['compression']>['codec'];

export interface AssetBudgetValidationInput {
  assets: AssetManifestData;
  availablePublicAssetByteSizes?: ReadonlyMap<string, number>;
  supportedModelCompressionCodecs?: ReadonlySet<SupportedModelCompressionCodec>;
}

const DEFAULT_SUPPORTED_MODEL_COMPRESSION_CODECS = new Set<SupportedModelCompressionCodec>([
  'none',
]);

export function validateAssetBudgets(
  input: AssetBudgetValidationInput,
): ReferenceValidationIssue[] {
  const issues: ReferenceValidationIssue[] = [];
  const supportedModelCompressionCodecs =
    input.supportedModelCompressionCodecs ?? DEFAULT_SUPPORTED_MODEL_COMPRESSION_CODECS;

  for (const [assetId, asset] of Object.entries(input.assets.assets)) {
    const metadataPath = `data/assets.manifest.json.assets.${assetId}.metadata`;
    const metadata = asset.metadata;

    if (!metadata) {
      issues.push({
        severity: 'error',
        path: metadataPath,
        message: `Asset "${assetId}" is missing metadata.`,
      });
      continue;
    }

    if (metadata.sizeBudgetBytes === undefined) {
      issues.push({
        severity: 'error',
        path: `${metadataPath}.sizeBudgetBytes`,
        message: `Asset "${assetId}" must declare metadata.sizeBudgetBytes.`,
      });
    }

    const byteSize = input.availablePublicAssetByteSizes?.get(asset.url);
    if (byteSize !== undefined && metadata.sizeBudgetBytes !== undefined) {
      addByteBudgetIssue(assetId, byteSize, metadata.sizeBudgetBytes, metadataPath, issues);
    }

    addTypeSpecificMetadataIssues(
      assetId,
      asset.type,
      metadata,
      metadataPath,
      supportedModelCompressionCodecs,
      issues,
    );
  }

  return issues;
}

function addByteBudgetIssue(
  assetId: string,
  byteSize: number,
  sizeBudgetBytes: number,
  metadataPath: string,
  issues: ReferenceValidationIssue[],
): void {
  if (byteSize <= sizeBudgetBytes) {
    return;
  }

  issues.push({
    severity: 'error',
    path: `${metadataPath}.sizeBudgetBytes`,
    message: `Asset "${assetId}" is over byte budget: ${byteSize} bytes used, ${sizeBudgetBytes} bytes declared.`,
  });
}

function addTypeSpecificMetadataIssues(
  assetId: string,
  type: AssetType,
  metadata: NonNullable<AssetManifestData['assets'][string]['metadata']>,
  metadataPath: string,
  supportedModelCompressionCodecs: ReadonlySet<SupportedModelCompressionCodec>,
  issues: ReferenceValidationIssue[],
): void {
  if (type === 'model') {
    addRequiredMetadataIssue(
      assetId,
      metadata.maxTriangles,
      `${metadataPath}.maxTriangles`,
      issues,
    );
    addRequiredMetadataIssue(
      assetId,
      metadata.textureBudgetKb,
      `${metadataPath}.textureBudgetKb`,
      issues,
    );
    addRequiredMetadataIssue(
      assetId,
      metadata.materialProfile,
      `${metadataPath}.materialProfile`,
      issues,
    );
    addRequiredMetadataIssue(assetId, metadata.compressed, `${metadataPath}.compressed`, issues);
    addRequiredMetadataIssue(assetId, metadata.compression, `${metadataPath}.compression`, issues);
    addMaterialProfileIssue(assetId, metadata.materialProfile, metadataPath, issues);
    addCompressionConsistencyIssue(assetId, metadata, metadataPath, issues);
    addRequiredCompressionSupportIssue(
      assetId,
      metadata,
      metadataPath,
      supportedModelCompressionCodecs,
      issues,
    );
    return;
  }

  if (type === 'texture' || type === 'image') {
    addRequiredMetadataIssue(
      assetId,
      metadata.textureUsage,
      `${metadataPath}.textureUsage`,
      issues,
    );
    addRequiredMetadataIssue(assetId, metadata.colorSpace, `${metadataPath}.colorSpace`, issues);
  }
}

function addRequiredMetadataIssue(
  assetId: string,
  value: unknown,
  path: string,
  issues: ReferenceValidationIssue[],
): void {
  if (value !== undefined) {
    return;
  }

  issues.push({
    severity: 'error',
    path,
    message: `Asset "${assetId}" must declare ${path.split('.').at(-1)}.`,
  });
}

function addMaterialProfileIssue(
  assetId: string,
  materialProfile: string | undefined,
  metadataPath: string,
  issues: ReferenceValidationIssue[],
): void {
  if (!materialProfile || RenderStyleProfileSchema.safeParse(materialProfile).success) {
    return;
  }

  issues.push({
    severity: 'error',
    path: `${metadataPath}.materialProfile`,
    message: `Asset "${assetId}" has unsupported materialProfile "${materialProfile}".`,
  });
}

function addCompressionConsistencyIssue(
  assetId: string,
  metadata: NonNullable<AssetManifestData['assets'][string]['metadata']>,
  metadataPath: string,
  issues: ReferenceValidationIssue[],
): void {
  if (!metadata.compression) {
    return;
  }

  if (metadata.compressed && metadata.compression.codec === 'none') {
    issues.push({
      severity: 'error',
      path: `${metadataPath}.compression.codec`,
      message: `Asset "${assetId}" cannot be marked compressed with compression codec "none".`,
    });
  }
}

function addRequiredCompressionSupportIssue(
  assetId: string,
  metadata: NonNullable<AssetManifestData['assets'][string]['metadata']>,
  metadataPath: string,
  supportedModelCompressionCodecs: ReadonlySet<SupportedModelCompressionCodec>,
  issues: ReferenceValidationIssue[],
): void {
  if (!metadata.compression || metadata.compression.status !== 'required') {
    return;
  }

  if (metadata.compression.codec === 'none') {
    issues.push({
      severity: 'error',
      path: `${metadataPath}.compression.codec`,
      message: `Asset "${assetId}" cannot require compression codec "none".`,
    });
    return;
  }

  if (supportedModelCompressionCodecs.has(metadata.compression.codec)) {
    return;
  }

  issues.push({
    severity: 'error',
    path: `${metadataPath}.compression.codec`,
    message: `Asset "${assetId}" requires compression codec "${metadata.compression.codec}", but no decoder support is configured.`,
  });
}
