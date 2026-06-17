import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AssetManifestSchema } from '../src/schemas/asset.schema';
import { CameraShotSchema } from '../src/schemas/cameraShot.schema';
import { EventSchema } from '../src/schemas/event.schema';
import { LevelSchema } from '../src/schemas/level.schema';
import { PrefabSchema } from '../src/schemas/prefab.schema';
import { TimelineSchema } from '../src/schemas/timeline.schema';
import {
  inferDataFileKind,
  runDataMigrations,
  type DataFileKind,
  type DataMigrationFile,
} from '../src/migrations/DataMigration';

interface ScriptOptions {
  check: boolean;
  write: boolean;
}

interface SchemaLike {
  parse(value: unknown): unknown;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DATA_PATHS = [
  'data/assets.manifest.json',
  'data/cameraShots',
  'data/events',
  'data/levels',
  'data/prefabs',
  'data/timelines',
] as const;

const SCHEMAS: Record<DataFileKind, SchemaLike> = {
  assetManifest: AssetManifestSchema,
  cameraShot: CameraShotSchema,
  event: EventSchema,
  level: LevelSchema,
  prefab: PrefabSchema,
  timeline: TimelineSchema,
};

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const files = await readDataMigrationFiles();
  const changedResults = [];

  for (const file of files) {
    const result = runDataMigrations(file);
    SCHEMAS[result.kind].parse(result.data);

    if (result.changed) {
      changedResults.push(result);

      if (options.write) {
        await writeJson(file.path, result.data);
      }
    }
  }

  if (changedResults.length === 0) {
    console.log(`Data migrations checked: ${files.length} files already current.`);
    return;
  }

  for (const result of changedResults) {
    const mode = options.write ? 'migrated' : 'would migrate';
    console.log(`${mode}: ${result.path} (${result.appliedMigrationIds.join(', ')})`);
  }

  if (options.check && !options.write) {
    process.exitCode = 1;
  }
}

function parseOptions(args: readonly string[]): ScriptOptions {
  const options: ScriptOptions = { check: false, write: false };

  for (const arg of args) {
    if (arg === '--check') {
      options.check = true;
    } else if (arg === '--write') {
      options.write = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npm run migrate-data -- [--check] [--write]');
      process.exit(0);
    } else {
      throw new Error(`Unknown migrate-data option: ${arg}`);
    }
  }

  return options;
}

async function readDataMigrationFiles(): Promise<DataMigrationFile[]> {
  const files: DataMigrationFile[] = [];

  for (const dataPath of DATA_PATHS) {
    if (dataPath.endsWith('.json')) {
      const kind = inferDataFileKind(dataPath);

      if (!kind) {
        continue;
      }

      files.push({
        path: dataPath,
        kind,
        data: await readJson(dataPath),
      });
      continue;
    }

    for (const fileName of await readJsonFileNames(path.join(repoRoot, dataPath))) {
      const relativePath = toPosixPath(path.join(dataPath, fileName));
      const kind = inferDataFileKind(relativePath);

      if (!kind) {
        continue;
      }

      files.push({
        path: relativePath,
        kind,
        data: await readJson(relativePath),
      });
    }
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), 'utf8')) as unknown;
}

async function writeJson(relativePath: string, data: unknown): Promise<void> {
  await writeFile(path.join(repoRoot, relativePath), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function readJsonFileNames(absolutePath: string): Promise<string[]> {
  try {
    const entries = await readdir(absolutePath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

function toPosixPath(value: string): string {
  return value.replaceAll(path.sep, '/');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
