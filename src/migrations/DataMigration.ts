export const CURRENT_DATA_SCHEMA_VERSION = 1;

export const DATA_FILE_KINDS = [
  'assetManifest',
  'cameraShot',
  'event',
  'level',
  'prefab',
  'timeline',
] as const;

export type DataFileKind = (typeof DATA_FILE_KINDS)[number];

export interface DataMigrationFile {
  path: string;
  kind: DataFileKind;
  data: unknown;
}

export interface DataMigration {
  id: string;
  description: string;
  fromVersion: number;
  toVersion: number;
  appliesTo: readonly DataFileKind[];
  migrate(file: DataMigrationFile): unknown;
}

export interface DataMigrationResult {
  path: string;
  kind: DataFileKind;
  originalVersion: number;
  currentVersion: number;
  data: unknown;
  appliedMigrationIds: readonly string[];
  changed: boolean;
}

export const addSchemaVersionOneMigration: DataMigration = {
  id: '0001-add-schema-version',
  description: 'Add schemaVersion: 1 to pre-versioned project JSON files.',
  fromVersion: 0,
  toVersion: 1,
  appliesTo: DATA_FILE_KINDS,
  migrate(file) {
    if (!isRecord(file.data)) {
      return file.data;
    }

    if ('schemaVersion' in file.data) {
      return file.data;
    }

    return {
      schemaVersion: 1,
      ...file.data,
    };
  },
};

export const DATA_MIGRATIONS: readonly DataMigration[] = [addSchemaVersionOneMigration];

export function runDataMigrations(
  file: DataMigrationFile,
  migrations: readonly DataMigration[] = DATA_MIGRATIONS,
  targetVersion = CURRENT_DATA_SCHEMA_VERSION,
): DataMigrationResult {
  let data = file.data;
  const originalVersion = getSchemaVersion(data, file.path);
  let currentVersion = originalVersion;
  const appliedMigrationIds: string[] = [];

  if (currentVersion > targetVersion) {
    throw new Error(
      `${file.path} has schemaVersion ${currentVersion}, which is newer than supported version ${targetVersion}.`,
    );
  }

  while (currentVersion < targetVersion) {
    const migration = migrations.find(
      (candidate) =>
        candidate.fromVersion === currentVersion &&
        candidate.toVersion <= targetVersion &&
        candidate.appliesTo.includes(file.kind),
    );

    if (!migration) {
      throw new Error(
        `No migration registered for ${file.path} from schemaVersion ${currentVersion} to ${targetVersion}.`,
      );
    }

    data = migration.migrate({ ...file, data });
    currentVersion = getSchemaVersion(data, file.path);

    if (currentVersion !== migration.toVersion) {
      throw new Error(
        `Migration ${migration.id} produced schemaVersion ${currentVersion} for ${file.path}; expected ${migration.toVersion}.`,
      );
    }

    appliedMigrationIds.push(migration.id);
  }

  return {
    path: file.path,
    kind: file.kind,
    originalVersion,
    currentVersion,
    data,
    appliedMigrationIds,
    changed: appliedMigrationIds.length > 0,
  };
}

export function inferDataFileKind(relativePath: string): DataFileKind | undefined {
  const normalized = relativePath.replaceAll('\\', '/');

  if (normalized === 'data/assets.manifest.json') {
    return 'assetManifest';
  }

  if (normalized.startsWith('data/cameraShots/') && normalized.endsWith('.json')) {
    return 'cameraShot';
  }

  if (normalized.startsWith('data/events/') && normalized.endsWith('.json')) {
    return 'event';
  }

  if (normalized.startsWith('data/levels/') && normalized.endsWith('.json')) {
    return 'level';
  }

  if (normalized.startsWith('data/prefabs/') && normalized.endsWith('.json')) {
    return 'prefab';
  }

  if (normalized.startsWith('data/timelines/') && normalized.endsWith('.json')) {
    return 'timeline';
  }

  return undefined;
}

export function getSchemaVersion(data: unknown, path: string): number {
  if (!isRecord(data) || data.schemaVersion === undefined) {
    return 0;
  }

  if (typeof data.schemaVersion !== 'number') {
    throw new Error(`${path} has a non-numeric schemaVersion.`);
  }

  return data.schemaVersion;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
