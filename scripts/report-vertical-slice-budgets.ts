import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createAssetReport } from '../src/data/AssetReport';
import { AssetManifestSchema } from '../src/schemas/asset.schema';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export interface VerticalSliceBudgetEvidence {
  area: string;
  source: string;
  status: 'pass' | 'fail';
  patterns: readonly string[];
  missingPatterns: readonly string[];
}

export interface VerticalSliceBudgetReport {
  assetBudget: {
    assetCount: number;
    budgetBytes: number;
    issues: number;
    status: 'pass' | 'fail';
    usedBytes: number;
  };
  evidence: readonly VerticalSliceBudgetEvidence[];
  status: 'pass' | 'fail';
}

const requiredEvidence: ReadonlyArray<{
  area: string;
  patterns: readonly string[];
  source: string;
}> = [
  {
    area: 'shader/postprocess low-end Chromium baseline',
    source: 'tests/smoke/shader-material.spec.ts',
    patterns: [
      'low-end shader baseline stays within local Chromium budgets',
      'maxDurationMs',
      'maxProgramCount',
    ],
  },
  {
    area: 'LOD/scatter low-end budget',
    source: 'src/runtime/three/ThreeRuntimeLodScatterInstancingGate.test.ts',
    patterns: [
      'reports stable runtime budgets',
      'scatterInstanceCount: 6',
      'scatterTriangleEstimate: 72',
      "styleQualityProfile: 'low-end'",
      'scatterInstanceCount: 3',
      'scatterTriangleEstimate: 36',
    ],
  },
  {
    area: 'spherical world readability and scatter budget',
    source: 'src/runtime/three/ThreeRuntimeSphericalLodScatter.test.ts',
    patterns: [
      'spherical smoke perf low-end LOD scatter integration gate',
      'placementCount: 7',
      "new Set(['city', 'hill', 'beach'])",
      'scatterTriangleEstimate: 72',
      'scatterTriangleEstimate: 36',
    ],
  },
  {
    area: 'delivery showcase route feedback budget',
    source: 'src/runtime/three/ThreeRuntimeDeliveryShowcaseSmokePerfLow-End.test.ts',
    patterns: [
      'delivery showcase smoke perf low-end budget',
      'visibleMarkerCount: 3',
      'visibleMarkerCount: 2',
      'toBeLessThanOrEqual(6)',
      'toBeLessThanOrEqual(4)',
      'toBeLessThanOrEqual(420)',
    ],
  },
  {
    area: 'multiplayer-lite social remote and stamp budget',
    source: 'src/runtime/three/ThreeRuntimeSocialSmokePerfLow-End.test.ts',
    patterns: [
      'social smoke perf low-end budget',
      'remoteCount: 10',
      'visibleStampCount: 10',
      'toBeLessThanOrEqual(50)',
      'toBeLessThanOrEqual(1180)',
      'remoteCount: 7',
      'visibleStampCount: 0',
      'toBeLessThanOrEqual(21)',
      'toBeLessThanOrEqual(462)',
      'invalid-message',
    ],
  },
];

export async function createVerticalSliceBudgetReport(
  root = repoRoot,
): Promise<VerticalSliceBudgetReport> {
  const assets = AssetManifestSchema.parse(await readJson(root, 'data/assets.manifest.json'));
  const publicAssetByteSizes = await readPublicAssetByteSizes(root);
  const assetReport = createAssetReport({
    assets,
    publicAssetByteSizes,
  });
  const evidence = await Promise.all(
    requiredEvidence.map(async (item): Promise<VerticalSliceBudgetEvidence> => {
      const source = await readText(root, item.source);
      const missingPatterns = item.patterns.filter((pattern) => !source.includes(pattern));

      return {
        area: item.area,
        source: item.source,
        status: missingPatterns.length === 0 ? 'pass' : 'fail',
        patterns: item.patterns,
        missingPatterns,
      };
    }),
  );
  const status =
    assetReport.issues.length === 0 && evidence.every((item) => item.status === 'pass')
      ? 'pass'
      : 'fail';

  return {
    assetBudget: {
      assetCount: assetReport.summary.assetCount,
      budgetBytes: assetReport.summary.totalBudgetBytes,
      issues: assetReport.issues.length,
      status: assetReport.issues.length === 0 ? 'pass' : 'fail',
      usedBytes: assetReport.summary.totalBytes,
    },
    evidence,
    status,
  };
}

export function formatVerticalSliceBudgetReport(report: VerticalSliceBudgetReport): string {
  const lines = [
    'Vertical Slice Budget Report',
    `Status: ${report.status.toUpperCase()}`,
    `Asset budget: ${report.assetBudget.status.toUpperCase()} (${report.assetBudget.assetCount} assets, ${report.assetBudget.usedBytes} B used / ${report.assetBudget.budgetBytes} B budget, ${report.assetBudget.issues} issues)`,
    '',
    'Evidence gates:',
  ];

  for (const evidence of report.evidence) {
    lines.push(`- ${evidence.status.toUpperCase()} ${evidence.area} (${evidence.source})`);

    if (evidence.missingPatterns.length > 0) {
      lines.push(`  Missing: ${evidence.missingPatterns.join(', ')}`);
    }
  }

  lines.push(
    '',
    'Limits: local report only; Playwright smoke and Vitest budget gates provide runtime evidence. Real mobile hardware certification is not implied.',
  );

  return lines.join('\n');
}

async function main(): Promise<void> {
  const report = await createVerticalSliceBudgetReport();

  console.log(formatVerticalSliceBudgetReport(report));

  if (report.status !== 'pass') {
    process.exitCode = 1;
  }
}

async function readJson(root: string, relativePath: string): Promise<unknown> {
  return JSON.parse(await readText(root, relativePath)) as unknown;
}

async function readText(root: string, relativePath: string): Promise<string> {
  return readFile(path.join(root, relativePath), 'utf8');
}

async function readPublicAssetByteSizes(root: string): Promise<ReadonlyMap<string, number>> {
  const publicRoot = path.join(root, 'public');
  const byteSizes = new Map<string, number>();

  await collectPublicFileByteSizes(publicRoot, publicRoot, byteSizes);

  return byteSizes;
}

async function collectPublicFileByteSizes(
  publicRoot: string,
  currentPath: string,
  byteSizes: Map<string, number>,
): Promise<void> {
  let entries;

  try {
    entries = await readdir(currentPath, { withFileTypes: true });
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return;
    }

    throw error;
  }

  for (const entry of entries) {
    const absolutePath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      await collectPublicFileByteSizes(publicRoot, absolutePath, byteSizes);
    } else if (entry.isFile()) {
      const url = `/${toPosixPath(path.relative(publicRoot, absolutePath))}`;
      const fileStat = await stat(absolutePath);

      byteSizes.set(url, fileStat.size);
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function toPosixPath(value: string): string {
  return value.replaceAll(path.sep, '/');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
