import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ActionSchema } from '../src/schemas/action.schema';
import { AssetManifestSchema } from '../src/schemas/asset.schema';
import { CameraShotSchema } from '../src/schemas/cameraShot.schema';
import { TYPED_CONDITION_TYPES } from '../src/schemas/condition.schema';
import { EventSchema } from '../src/schemas/event.schema';
import { LevelSchema } from '../src/schemas/level.schema';
import { PaletteSchema } from '../src/schemas/palette.schema';
import { PrefabSchema } from '../src/schemas/prefab.schema';
import { TimelineSchema } from '../src/schemas/timeline.schema';
import { validateProject } from '../src/data/validateProject';
import { createDefaultActionRegistry } from '../src/events/actionRegistry';
import { createDefaultConditionRegistry } from '../src/events/conditionRegistry';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main(): Promise<void> {
  const assets = AssetManifestSchema.parse(await readJson('data/assets.manifest.json'));
  const cameraShots = await readSchemaDirectory('data/cameraShots', CameraShotSchema);
  const events = await readSchemaDirectory('data/events', EventSchema);
  const timelines = await readSchemaDirectory('data/timelines', TimelineSchema);
  const palettes = await readSchemaDirectory('data/palettes', PaletteSchema);
  const prefabs = await readSchemaDirectory('data/prefabs', PrefabSchema);
  const levels = await readSchemaDirectory('data/levels', LevelSchema);
  const actionRegistry = createDefaultActionRegistry();
  const conditionRegistry = createDefaultConditionRegistry();
  const availablePublicAssetUrls = await readPublicAssetUrls();
  const result = validateProject({
    assets,
    availablePublicAssetUrls,
    availableEventIds: new Set(events.map((event) => event.id)),
    prefabs,
    levels,
    palettes,
    cameraShots,
    events,
    timelines,
    availableTimelineIds: new Set(timelines.map((timeline) => timeline.id)),
    availableCameraShotIds: new Set(cameraShots.map((shot) => shot.id)),
    schemaActionTypes: getActionSchemaTypes(),
    schemaConditionTypes: new Set(TYPED_CONDITION_TYPES),
    registeredActionTypes: new Set(actionRegistry.types()),
    registeredConditionTypes: new Set(conditionRegistry.types()),
    registeredActionFunctionNames: new Set(actionRegistry.customFunctionNames()),
    registeredCustomConditionNames: new Set(conditionRegistry.customConditionNames()),
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
    `Data validation passed: ${prefabs.length} prefabs, ${levels.length} levels, ${events.length} events, ${timelines.length} timelines, ${cameraShots.length} camera shots, ${palettes.length} palettes, ${Object.keys(assets.assets).length} assets.`,
  );
}

async function readJson(relativePath: string): Promise<unknown> {
  const absolutePath = path.join(repoRoot, relativePath);
  const raw = await readFile(absolutePath, 'utf8');

  return JSON.parse(raw) as unknown;
}

async function readPublicAssetUrls(): Promise<ReadonlySet<string>> {
  const publicRoot = path.join(repoRoot, 'public');
  const urls = new Set<string>();

  await collectPublicFileUrls(publicRoot, publicRoot, urls);

  return urls;
}

async function collectPublicFileUrls(
  publicRoot: string,
  currentPath: string,
  urls: Set<string>,
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
      await collectPublicFileUrls(publicRoot, absolutePath, urls);
    } else if (entry.isFile()) {
      urls.add(`/${toPosixPath(path.relative(publicRoot, absolutePath))}`);
    }
  }
}

function getActionSchemaTypes(): ReadonlySet<string> {
  type ActionSchemaOption = { shape: { type: { value: string } } };

  return new Set(
    ActionSchema.options.map(
      (option) => (option as unknown as ActionSchemaOption).shape.type.value,
    ),
  );
}

async function readSchemaDirectory<T>(
  relativePath: string,
  schema: { parse(value: unknown): T },
): Promise<T[]> {
  const absolutePath = path.join(repoRoot, relativePath);
  const fileNames = await readJsonFileNames(absolutePath);

  return Promise.all(
    fileNames.map(async (fileName) =>
      schema.parse(await readJson(path.join(relativePath, fileName))),
    ),
  );
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

function toPosixPath(value: string): string {
  return value.replaceAll(path.sep, '/');
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
