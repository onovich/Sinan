import { describe, expect, it } from 'vitest';

import { inferDataFileKind, runDataMigrations } from './DataMigration';

describe('DataMigration', () => {
  it('leaves current schemaVersion 1 files unchanged', () => {
    const data = { schemaVersion: 1, id: 'ev_current', actions: [] };
    const result = runDataMigrations({
      path: 'data/events/ev_current.json',
      kind: 'event',
      data,
    });

    expect(result.changed).toBe(false);
    expect(result.appliedMigrationIds).toEqual([]);
    expect(result.data).toBe(data);
  });

  it('adds schemaVersion 1 to pre-versioned data files', () => {
    const result = runDataMigrations({
      path: 'data/events/ev_legacy.json',
      kind: 'event',
      data: {
        id: 'ev_legacy',
        trigger: { type: 'level.start' },
        actions: [{ type: 'flag.set', flag: 'legacy', value: true }],
      },
    });

    expect(result.changed).toBe(true);
    expect(result.appliedMigrationIds).toEqual(['0001-add-schema-version']);
    expect(result.data).toEqual({
      schemaVersion: 1,
      id: 'ev_legacy',
      trigger: { type: 'level.start' },
      actions: [{ type: 'flag.set', flag: 'legacy', value: true }],
    });
  });

  it('rejects data newer than the supported schema version', () => {
    expect(() =>
      runDataMigrations({
        path: 'data/levels/level_future.json',
        kind: 'level',
        data: { schemaVersion: 99, id: 'level_future' },
      }),
    ).toThrow('newer than supported version');
  });

  it('infers supported data file kinds from paths', () => {
    expect(inferDataFileKind('data/assets.manifest.json')).toBe('assetManifest');
    expect(inferDataFileKind('data/prefabs/door_wood.json')).toBe('prefab');
    expect(inferDataFileKind('data/unknown/example.json')).toBeUndefined();
  });
});
