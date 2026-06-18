import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAssetReport, formatAssetReport } from '../src/data/AssetReport';
import { AssetManifestSchema } from '../src/schemas/asset.schema';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main(): Promise<void> {
  const assets = AssetManifestSchema.parse(await readJson('data/assets.manifest.json'));
  const publicAssetByteSizes = await readPublicAssetByteSizes();
  const report = createAssetReport({
    assets,
    publicAssetByteSizes,
  });

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatAssetReport(report));
  }

  if (report.issues.length > 0) {
    process.exitCode = 1;
  }
}

async function readJson(relativePath: string): Promise<unknown> {
  const absolutePath = path.join(repoRoot, relativePath);
  const raw = await readFile(absolutePath, 'utf8');

  return JSON.parse(raw) as unknown;
}

async function readPublicAssetByteSizes(): Promise<ReadonlyMap<string, number>> {
  const publicRoot = path.join(repoRoot, 'public');
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

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
