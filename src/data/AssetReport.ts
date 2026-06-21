import type { AssetEntryData, AssetManifestData } from '../schemas/asset.schema';
import { validateAssetBudgets, type SupportedModelCompressionCodec } from './AssetBudgetValidator';
import { validateAssetUrls } from './AssetUrlValidator';
import type { ReferenceValidationIssue } from './ReferenceResolver';

export type AssetReportStatus =
  | 'ok'
  | 'missing-file'
  | 'missing-metadata'
  | 'missing-decoder'
  | 'over-budget'
  | 'invalid-metadata';

export interface AssetReportInput {
  assets: AssetManifestData;
  publicAssetByteSizes?: ReadonlyMap<string, number>;
  supportedModelCompressionCodecs?: ReadonlySet<SupportedModelCompressionCodec>;
}

export interface AssetReportRow {
  assetId: string;
  type: AssetEntryData['type'];
  url: string;
  exists: boolean | undefined;
  hasMetadata: boolean;
  compressed: boolean;
  byteSize: number | undefined;
  sizeBudgetBytes: number | undefined;
  budgetDeltaBytes: number | undefined;
  maxTriangles: number | undefined;
  lodGroup: string;
  lodLevel: string;
  lodLevelCount: number | undefined;
  instancing: string;
  compression: string;
  materialProfile: string;
  texture: string;
  clips: string;
  status: AssetReportStatus;
}

export interface AssetReportSummary {
  assetCount: number;
  totalBytes: number;
  totalBudgetBytes: number;
  compressedAssetCount: number;
  totalCompressedBytes: number;
  sourceAssetCount: number;
  totalSourceBytes: number;
  budgetPassCount: number;
  budgetFailCount: number;
  budgetUnknownCount: number;
  missingMetadataCount: number;
  missingFileCount: number;
  issueCount: number;
}

export interface AssetReport {
  summary: AssetReportSummary;
  rows: AssetReportRow[];
  issues: ReferenceValidationIssue[];
}

export function createAssetReport(input: AssetReportInput): AssetReport {
  const availablePublicUrls = input.publicAssetByteSizes
    ? new Set(input.publicAssetByteSizes.keys())
    : undefined;
  const issues = [
    ...validateAssetUrls({
      assets: input.assets,
      availablePublicUrls,
    }),
    ...validateAssetBudgets({
      assets: input.assets,
      availablePublicAssetByteSizes: input.publicAssetByteSizes,
      supportedModelCompressionCodecs: input.supportedModelCompressionCodecs,
    }),
  ];
  const lodLookup = createLodLookup(input.assets);
  const rows = Object.entries(input.assets.assets)
    .map(([assetId, asset]) =>
      createAssetReportRow(assetId, asset, input.publicAssetByteSizes, issues, lodLookup),
    )
    .sort((left, right) => left.assetId.localeCompare(right.assetId));

  return {
    summary: {
      assetCount: rows.length,
      totalBytes: rows.reduce((total, row) => total + (row.byteSize ?? 0), 0),
      totalBudgetBytes: rows.reduce((total, row) => total + (row.sizeBudgetBytes ?? 0), 0),
      compressedAssetCount: rows.filter((row) => row.compressed).length,
      totalCompressedBytes: rows
        .filter((row) => row.compressed)
        .reduce((total, row) => total + (row.byteSize ?? 0), 0),
      sourceAssetCount: rows.filter((row) => !row.compressed).length,
      totalSourceBytes: rows
        .filter((row) => !row.compressed)
        .reduce((total, row) => total + (row.byteSize ?? 0), 0),
      budgetPassCount: rows.filter(
        (row) => row.budgetDeltaBytes !== undefined && row.budgetDeltaBytes >= 0,
      ).length,
      budgetFailCount: rows.filter(
        (row) => row.budgetDeltaBytes !== undefined && row.budgetDeltaBytes < 0,
      ).length,
      budgetUnknownCount: rows.filter((row) => row.budgetDeltaBytes === undefined).length,
      missingMetadataCount: rows.filter((row) => !row.hasMetadata).length,
      missingFileCount: rows.filter((row) => row.exists === false).length,
      issueCount: issues.length,
    },
    rows,
    issues,
  };
}

export function formatAssetReport(report: AssetReport): string {
  const lines = [
    'Asset Report',
    `Summary: ${report.summary.assetCount} assets, ${formatBytes(
      report.summary.totalBytes,
    )} used, ${formatBytes(report.summary.totalBudgetBytes)} budget, ${report.summary.issueCount} issues.`,
    `Compression: ${report.summary.compressedAssetCount} compressed assets / ${formatBytes(
      report.summary.totalCompressedBytes,
    )}, ${report.summary.sourceAssetCount} source assets / ${formatBytes(
      report.summary.totalSourceBytes,
    )}.`,
    `Budget: ${report.summary.budgetPassCount} pass, ${report.summary.budgetFailCount} fail, ${report.summary.budgetUnknownCount} unknown. Metadata missing: ${report.summary.missingMetadataCount}. Missing files: ${report.summary.missingFileCount}.`,
    '',
    '| Asset | Type | URL | Bytes | Budget | Delta | Triangles | LOD | Instancing | Compression | Material | Texture | Clips | Status |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | --- |',
    ...report.rows.map(
      (row) =>
        `| ${row.assetId} | ${row.type} | ${row.url} | ${formatBytes(row.byteSize)} | ${formatBytes(
          row.sizeBudgetBytes,
        )} | ${formatDelta(row.budgetDeltaBytes)} | ${formatNumber(row.maxTriangles)} | ${formatLod(
          row,
        )} | ${row.instancing} | ${row.compression} | ${row.materialProfile} | ${row.texture} | ${
          row.clips
        } | ${row.status} |`,
    ),
  ];

  if (report.issues.length > 0) {
    lines.push('', 'Issues:');
    lines.push(...report.issues.map((issue) => `- ${issue.path}: ${issue.message}`));
  }

  return lines.join('\n');
}

function createAssetReportRow(
  assetId: string,
  asset: AssetEntryData,
  publicAssetByteSizes: ReadonlyMap<string, number> | undefined,
  issues: readonly ReferenceValidationIssue[],
  lodLookup: ReadonlyMap<string, AssetLodReportMetadata>,
): AssetReportRow {
  const byteSize = publicAssetByteSizes?.get(asset.url);
  const sizeBudgetBytes = asset.metadata?.sizeBudgetBytes;
  const budgetDeltaBytes =
    byteSize !== undefined && sizeBudgetBytes !== undefined
      ? sizeBudgetBytes - byteSize
      : undefined;
  const lodMetadata = lodLookup.get(assetId);

  return {
    assetId,
    type: asset.type,
    url: asset.url,
    exists: publicAssetByteSizes ? byteSize !== undefined : undefined,
    hasMetadata: asset.metadata !== undefined,
    compressed: asset.metadata?.compressed === true,
    byteSize,
    sizeBudgetBytes,
    budgetDeltaBytes,
    maxTriangles: asset.metadata?.maxTriangles,
    lodGroup: lodMetadata?.groupId ?? asset.metadata?.lodGroup ?? '-',
    lodLevel: lodMetadata?.levelLabel ?? (asset.metadata?.lodGroup ? 'source' : '-'),
    lodLevelCount: lodMetadata?.levelCount,
    instancing: asset.metadata?.instancing ?? '-',
    compression: getCompressionLabel(asset),
    materialProfile: asset.metadata?.materialProfile ?? '-',
    texture: getTextureLabel(asset),
    clips: asset.metadata?.clips?.join(', ') ?? '-',
    status: getAssetReportStatus(assetId, asset, byteSize, budgetDeltaBytes, issues),
  };
}

interface AssetLodReportMetadata {
  groupId: string;
  levelLabel: string;
  levelCount: number | undefined;
}

function createLodLookup(assets: AssetManifestData): ReadonlyMap<string, AssetLodReportMetadata> {
  const lookup = new Map<string, AssetLodReportMetadata>();

  for (const [groupId, group] of Object.entries(assets.lodGroups ?? {})) {
    for (const level of group.levels) {
      lookup.set(level.asset, {
        groupId,
        levelLabel: `L${level.level}`,
        levelCount: group.levels.length,
      });
    }
  }

  for (const [assetId, asset] of Object.entries(assets.assets)) {
    const groupId = asset.metadata?.lodGroup;
    if (!groupId || lookup.has(assetId)) {
      continue;
    }

    lookup.set(assetId, {
      groupId,
      levelLabel: 'source',
      levelCount: assets.lodGroups?.[groupId]?.levels.length,
    });
  }

  return lookup;
}

function getCompressionLabel(asset: AssetEntryData): string {
  const compression = asset.metadata?.compression;
  const textureCompression = asset.metadata?.textureCompression;
  const labels: string[] = [];

  if (compression) {
    labels.push(`${compression.codec}/${compression.status ?? 'unspecified'}`);
  }

  if (textureCompression) {
    labels.push(
      `texture:${textureCompression.codec}/${textureCompression.status ?? 'unspecified'}`,
    );
  }

  if (labels.length === 0) {
    return '-';
  }

  return labels.join(', ');
}

function getTextureLabel(asset: AssetEntryData): string {
  const usage = asset.metadata?.textureUsage;
  const colorSpace = asset.metadata?.colorSpace;

  if (!usage && !colorSpace) {
    return '-';
  }

  return `${usage ?? 'unknown'}/${colorSpace ?? 'unknown'}`;
}

function getAssetReportStatus(
  assetId: string,
  asset: AssetEntryData,
  byteSize: number | undefined,
  budgetDeltaBytes: number | undefined,
  issues: readonly ReferenceValidationIssue[],
): AssetReportStatus {
  if (byteSize === undefined) {
    return 'missing-file';
  }

  if (!asset.metadata) {
    return 'missing-metadata';
  }

  if (hasRequiredCompressionSupportIssue(assetId, issues)) {
    return 'missing-decoder';
  }

  if (budgetDeltaBytes !== undefined && budgetDeltaBytes < 0) {
    return 'over-budget';
  }

  const assetPath = `data/assets.manifest.json.assets.${assetId}`;
  if (issues.some((issue) => issue.path.startsWith(assetPath))) {
    return 'invalid-metadata';
  }

  return 'ok';
}

function hasRequiredCompressionSupportIssue(
  assetId: string,
  issues: readonly ReferenceValidationIssue[],
): boolean {
  const compressionPath = `data/assets.manifest.json.assets.${assetId}.metadata.compression.codec`;

  return issues.some(
    (issue) =>
      issue.path === compressionPath &&
      issue.message.includes('requires compression codec') &&
      issue.message.includes('no decoder support is configured'),
  );
}

function formatBytes(value: number | undefined): string {
  if (value === undefined) {
    return '-';
  }

  return `${value} B`;
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? '-' : String(value);
}

function formatLod(row: AssetReportRow): string {
  if (row.lodGroup === '-') {
    return '-';
  }

  return `${row.lodGroup} ${row.lodLevel}/${row.lodLevelCount ?? '?'}`;
}

function formatDelta(value: number | undefined): string {
  if (value === undefined) {
    return '-';
  }

  return value >= 0 ? `+${value} B` : `${value} B`;
}
