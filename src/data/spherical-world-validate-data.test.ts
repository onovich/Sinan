import { describe, expect, it } from 'vitest';

import type { AssetManifestData } from '../schemas/asset.schema';
import type { LevelData } from '../schemas/level.schema';
import type { PrefabData } from '../schemas/prefab.schema';
import { validateProject } from './validateProject';

const assets: AssetManifestData = {
  schemaVersion: 1,
  assets: {
    'model.player_spawn': {
      type: 'model',
      url: '/models/props/player_spawn.glb',
      metadata: {
        category: 'prop',
        materialProfile: 'palette-toon',
        maxTriangles: 64,
        textureBudgetKb: 0,
        sizeBudgetBytes: 4096,
        compressed: false,
        compression: {
          codec: 'none',
          status: 'source',
        },
      },
    },
  },
  lodGroups: {
    'compact-world-props': {
      strategy: 'distance',
      hysteresis: 1,
      lowEndBias: 0,
      fallbackAsset: 'model.player_spawn',
      levels: [{ level: 0, asset: 'model.player_spawn', minDistance: 0 }],
    },
  },
};

const playerPrefab: PrefabData = {
  schemaVersion: 1,
  id: 'player_spawn',
  name: 'Player Spawn',
  model: 'model.player_spawn',
  defaultTransform: {
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  },
  components: {},
};

const flatLevel: LevelData = {
  schemaVersion: 1,
  id: 'level_01',
  name: 'Gate Demo',
  entities: [
    {
      id: 'player_spawn_01',
      prefab: 'player_spawn',
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

const scatterGroup: NonNullable<LevelData['scatterGroups']>[number] = {
  id: 'scatter_city_props',
  source: {
    type: 'asset',
    asset: 'model.player_spawn',
  },
  count: 2,
  seed: 'compact-city-props',
  placement: {
    shape: 'box',
    center: [0, 0, 0],
    size: [2, 0, 2],
  },
  alignment: 'y-up',
};

const sphericalLevel: LevelData = {
  ...flatLevel,
  worldProjection: {
    type: 'cube-sphere',
    radius: 12,
    regions: [
      {
        id: 'city',
        name: 'City Region',
        label: 'City',
        face: 'front',
        localBounds: {
          center: [0, 0, 0],
          size: [6, 2, 6],
        },
        lodGroup: 'compact-world-props',
        scatterGroup: 'scatter_city_props',
      },
      {
        id: 'hill',
        name: 'Hill Region',
        label: 'Hill',
        face: 'right',
        localBounds: {
          center: [0, 0, 0],
          size: [4, 2, 4],
        },
      },
    ],
  },
  scatterGroups: [scatterGroup],
  entities: [
    {
      ...flatLevel.entities[0],
      placement: {
        mode: 'spherical-region',
        region: 'city',
      },
    },
    {
      id: 'flat_marker',
      prefab: 'player_spawn',
      transform: {
        position: [2, 0, 2],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      },
      components: {},
    },
  ],
};

describe('spherical world validate-data references', () => {
  it('accepts flat levels and mixed flat/spherical placement', () => {
    expect(
      validateProject({ assets, prefabs: [playerPrefab], levels: [flatLevel] }).issues,
    ).toEqual([]);
    expect(
      validateProject({ assets, prefabs: [playerPrefab], levels: [sphericalLevel] }).issues,
    ).toEqual([]);
  });

  it('reports spherical placement without world projection', () => {
    const issues = validateProject({
      assets,
      prefabs: [playerPrefab],
      levels: [
        {
          ...flatLevel,
          entities: [
            {
              ...flatLevel.entities[0],
              placement: {
                mode: 'spherical-region',
                region: 'city',
              },
            },
          ],
        },
      ],
    }).issues;

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'data/levels/level_01.json.entities.player_spawn_01.placement',
          message:
            'Entity "player_spawn_01" uses spherical placement but level "level_01" has no worldProjection.',
        }),
      ]),
    );
  });

  it('reports missing regions, duplicate region ids, and region hook references', () => {
    const issues = validateProject({
      assets,
      prefabs: [playerPrefab],
      levels: [
        {
          ...sphericalLevel,
          worldProjection: {
            type: 'cube-sphere',
            radius: 12,
            regions: [
              {
                ...sphericalLevel.worldProjection!.regions[0],
                lodGroup: 'missing-lod',
                scatterGroup: 'missing-scatter',
              },
              {
                ...sphericalLevel.worldProjection!.regions[0],
              },
            ],
          },
          entities: [
            {
              ...sphericalLevel.entities[0],
              placement: {
                mode: 'spherical-region',
                region: 'beach',
              },
            },
          ],
        },
      ],
    }).issues;

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'data/levels/level_01.json.worldProjection.regions',
          message: 'Duplicate region id "city".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.worldProjection.regions.city.lodGroup',
          message: 'Missing LOD group "missing-lod".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.worldProjection.regions.city.scatterGroup',
          message: 'Missing scatter group "missing-scatter".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.entities.player_spawn_01.placement.region',
          message: 'Missing region "beach".',
        }),
      ]),
    );
  });
});
