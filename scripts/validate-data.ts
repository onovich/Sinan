import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AssetManifestSchema } from '../src/schemas/asset.schema';
import { LevelSchema } from '../src/schemas/level.schema';
import { PrefabSchema } from '../src/schemas/prefab.schema';
import { validateProject } from '../src/data/validateProject';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main(): Promise<void> {
  const assets = AssetManifestSchema.parse(await readJson('data/assets.manifest.json'));
  const prefabs = await readSchemaDirectory('data/prefabs', PrefabSchema);
  const levels = await readSchemaDirectory('data/levels', LevelSchema);
  const result = validateProject({
    assets,
    prefabs,
    levels,
    availableEventIds: await readJsonIdStems('data/events'),
    availableTimelineIds: await readJsonIdStems('data/timelines'),
    availableCameraShotIds: await readJsonIdStems('data/cameraShots'),
  });

  if (result.issues.length > 0) {
    console.error('Data validation failed:');
    for (const issue of result.issues) {
      console.error(`- ${issue.path}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Data validation passed: ${prefabs.length} prefabs, ${levels.length} levels, ${Object.keys(assets.assets).length} assets.`,
  );
}

async function readJson(relativePath: string): Promise<unknown> {
  const absolutePath = path.join(repoRoot, relativePath);
  const raw = await readFile(absolutePath, 'utf8');

  return JSON.parse(raw) as unknown;
}

async function readSchemaDirectory<T>(
  relativePath: string,
  schema: { parse(value: unknown): T },
): Promise<T[]> {
  const absolutePath = path.join(repoRoot, relativePath);
  const fileNames = await readJsonFileNames(absolutePath);

  return Promise.all(
    fileNames.map(async (fileName) => schema.parse(await readJson(path.join(relativePath, fileName)))),
  );
}

async function readJsonIdStems(relativePath: string): Promise<ReadonlySet<string> | undefined> {
  const absolutePath = path.join(repoRoot, relativePath);
  const fileNames = await readJsonFileNames(absolutePath);

  if (fileNames.length === 0) {
    return undefined;
  }

  return new Set(fileNames.map((fileName) => path.basename(fileName, '.json')));
}

async function readJsonFileNames(absolutePath: string): Promise<string[]> {
  try {
    const entries = await readdir(absolutePath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
