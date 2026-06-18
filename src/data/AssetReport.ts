import type { AssetEntryData, AssetManifestData } from '../schemas/asset.schema';
import { validateAssetBudgets } from './AssetBudgetValidator';
import { validateAssetUrls } from './AssetUrlValidator';
import type { ReferenceValidationIssue } from './ReferenceResolver';

export type AssetReportStatus =
  | 'ok'
  | 'missing-file'
  | 'missing-metadata'
  | 'over-budget'
  | 'invalid-metadata';

export interface AssetReportInput {
  assets: AssetManifestData;
  publicAssetByteSizes?: ReadonlyMap<string, number>;
}

export interface AssetReportRow {
  assetId: string;
  type: AssetEntryData['type'];
  url: string;
  exists: boolean | undefined;
  byteSize: number | undefined;
  sizeBudgetBytes: number | undefined;
  budgetDeltaBytes: number | undefined;
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
    }),
  ];
  const rows = Object.entries(input.assets.assets)
    .map(([assetId, asset]) =>
      createAssetReportRow(assetId, asset, input.publicAssetByteSizes, issues),
    )
    .sort((left, right) => left.assetId.localeCompare(right.assetId));

  return {
    summary: {
      assetCount: rows.length,
      totalBytes: rows.reduce((total, row) => total + (row.byteSize ?? 0), 0),
      totalBudgetBytes: rows.reduce((total, row) => total + (row.sizeBudgetBytes ?? 0), 0),
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
    '',
    '| Asset | Type | URL | Bytes | Budget | Delta | Compression | Material | Texture | Clips | Status |',
    '| --- | --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |',
    ...report.rows.map(
      (row) =>
        `| ${row.assetId} | ${row.type} | ${row.url} | ${formatBytes(row.byteSize)} | ${formatBytes(
          row.sizeBudgetBytes,
        )} | ${formatDelta(row.budgetDeltaBytes)} | ${row.compression} | ${row.materialProfile} | ${
          row.texture
        } | ${row.clips} | ${row.status} |`,
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
): AssetReportRow {
  const byteSize = publicAssetByteSizes?.get(asset.url);
  const sizeBudgetBytes = asset.metadata?.sizeBudgetBytes;
  const budgetDeltaBytes =
    byteSize !== undefined && sizeBudgetBytes !== undefined
      ? sizeBudgetBytes - byteSize
      : undefined;

  return {
    assetId,
    type: asset.type,
    url: asset.url,
    exists: publicAssetByteSizes ? byteSize !== undefined : undefined,
    byteSize,
    sizeBudgetBytes,
    budgetDeltaBytes,
    compression: getCompressionLabel(asset),
    materialProfile: asset.metadata?.materialProfile ?? '-',
    texture: getTextureLabel(asset),
    clips: asset.metadata?.clips?.join(', ') ?? '-',
    status: getAssetReportStatus(assetId, asset, byteSize, budgetDeltaBytes, issues),
  };
}

function getCompressionLabel(asset: AssetEntryData): string {
  const compression = asset.metadata?.compression;

  if (!compression) {
    return '-';
  }

  return `${compression.codec}/${compression.status ?? 'unspecified'}`;
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

  if (budgetDeltaBytes !== undefined && budgetDeltaBytes < 0) {
    return 'over-budget';
  }

  const assetPath = `data/assets.manifest.json.assets.${assetId}`;
  if (issues.some((issue) => issue.path.startsWith(assetPath))) {
    return 'invalid-metadata';
  }

  return 'ok';
}

function formatBytes(value: number | undefined): string {
  if (value === undefined) {
    return '-';
  }

  return `${value} B`;
}

function formatDelta(value: number | undefined): string {
  if (value === undefined) {
    return '-';
  }

  return value >= 0 ? `+${value} B` : `${value} B`;
}
