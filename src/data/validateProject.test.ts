import { describe, expect, it } from 'vitest';

import type { AssetManifestData } from '../schemas/asset.schema';
import type { LevelData } from '../schemas/level.schema';
import type { PrefabData } from '../schemas/prefab.schema';
import { validateProject } from './validateProject';

const assets: AssetManifestData = {
  schemaVersion: 1,
  assets: {
    'model.switch_wall': {
      type: 'model',
      url: '/models/props/switch_wall.glb',
    },
  },
};

const switchPrefab: PrefabData = {
  schemaVersion: 1,
  id: 'switch_wall',
  name: 'Wall Switch',
  model: 'model.switch_wall',
  defaultTransform: {
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  },
  components: {},
};

const level: LevelData = {
  schemaVersion: 1,
  id: 'level_01',
  name: 'Gate Demo',
  entities: [
    {
      id: 'switch_a',
      prefab: 'switch_wall',
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      },
      components: {},
    },
  ],
  events: [],
  timelines: [],
  cameraShots: [],
};

describe('validateProject', () => {
  it('accepts valid project references', () => {
    expect(validateProject({ assets, prefabs: [switchPrefab], levels: [level] }).issues).toEqual(
      [],
    );
  });

  it('reports missing prefab, asset, timeline, and camera shot references', () => {
    const issues = validateProject({
      assets,
      prefabs: [
        {
          ...switchPrefab,
          model: 'model.missing',
        },
      ],
      levels: [
        {
          ...level,
          entities: [
            {
              ...level.entities[0],
              prefab: 'missing_prefab',
            },
          ],
          timelines: ['tl_missing'],
          cameraShots: ['cam_missing'],
        },
      ],
      availableTimelineIds: new Set(),
      availableCameraShotIds: new Set(),
    }).issues;

    expect(issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Missing asset "model.missing".',
        'Missing prefab "missing_prefab".',
        'Missing timeline "tl_missing".',
        'Missing camera shot "cam_missing".',
      ]),
    );
  });

  it('reports duplicate entity ids', () => {
    const issues = validateProject({
      assets,
      prefabs: [switchPrefab],
      levels: [
        {
          ...level,
          entities: [level.entities[0], level.entities[0]],
        },
      ],
    }).issues;

    expect(issues.map((issue) => issue.message)).toContain('Duplicate entity id "switch_a".');
  });
});
