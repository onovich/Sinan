import { describe, expect, it } from 'vitest';

import type { AssetManifestData } from '../schemas/asset.schema';
import type { LevelData } from '../schemas/level.schema';
import type { PrefabData } from '../schemas/prefab.schema';
import { validateProject } from './validateProject';

const assets: AssetManifestData = {
  schemaVersion: 1,
  assets: {
    'model.switch_wall.lod2': {
      type: 'model',
      url: '/models/props/switch_wall_lod2.glb',
      metadata: {
        category: 'prop',
        materialProfile: 'palette-toon',
        maxTriangles: 12,
        textureBudgetKb: 0,
        sizeBudgetBytes: 2048,
        compressed: false,
        compression: {
          codec: 'none',
          status: 'source',
        },
      },
    },
    'audio.switch_click': {
      type: 'audio',
      url: '/audio/switch_click.wav',
      metadata: {
        category: 'audio',
        sizeBudgetBytes: 4096,
      },
    },
  },
  lodGroups: {
    'gate-demo-props': {
      strategy: 'distance',
      hysteresis: 1,
      lowEndBias: 0,
      fallbackAsset: 'model.switch_wall.lod2',
      levels: [{ level: 0, asset: 'model.switch_wall.lod2', minDistance: 0 }],
    },
  },
};

const prefab: PrefabData = {
  schemaVersion: 1,
  id: 'switch_wall',
  name: 'Wall Switch',
  model: 'model.switch_wall.lod2',
  defaultTransform: {
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  },
  components: {},
};

const validScatterGroup: NonNullable<LevelData['scatterGroups']>[number] = {
  id: 'scatter_switch_markers',
  source: {
    type: 'asset',
    asset: 'model.switch_wall.lod2',
  },
  count: 6,
  seed: 'gate-demo-switch-markers',
  placement: {
    shape: 'box',
    center: [1.2, 0.7, 6.2],
    size: [2.4, 0, 1.6],
  },
  alignment: 'y-up',
  quality: {
    lodGroup: 'gate-demo-props',
  },
  fallback: {
    mode: 'placeholder',
    asset: 'model.switch_wall.lod2',
  },
};

const validLevel: LevelData = {
  schemaVersion: 1,
  id: 'level_01',
  name: 'Gate Demo',
  entities: [],
  scatterGroups: [validScatterGroup],
  events: [],
  timelines: [],
  cameraShots: [],
};

describe('scatter validate-data references', () => {
  it('accepts valid scatter asset and prefab sources', () => {
    expect(validateProject({ assets, prefabs: [prefab], levels: [validLevel] }).issues).toEqual([]);
    expect(
      validateProject({
        assets,
        prefabs: [prefab],
        levels: [
          {
            ...validLevel,
            scatterGroups: [
              {
                ...validScatterGroup,
                source: {
                  type: 'prefab',
                  prefab: 'switch_wall',
                },
              },
            ],
          },
        ],
      }).issues,
    ).toEqual([]);
  });

  it('reports missing scatter sources, duplicate ids, fallback assets, and LOD groups', () => {
    const issues = validateProject({
      assets,
      prefabs: [prefab],
      levels: [
        {
          ...validLevel,
          scatterGroups: [
            {
              ...validScatterGroup,
              source: {
                type: 'asset',
                asset: 'model.missing',
              },
              fallback: {
                mode: 'placeholder',
                asset: 'audio.switch_click',
              },
              quality: {
                lodGroup: 'missing-lod-group',
              },
            },
            {
              ...validScatterGroup,
              source: {
                type: 'prefab',
                prefab: 'missing_prefab',
              },
            },
          ],
        },
      ],
    }).issues;

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'data/levels/level_01.json.scatterGroups',
          message: 'Duplicate scatter group id "scatter_switch_markers".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.scatterGroups.scatter_switch_markers.source.asset',
          message: 'Missing asset "model.missing".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.scatterGroups.scatter_switch_markers.fallback.asset',
          message: 'Asset "audio.switch_click" must be type "model", got "audio".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.scatterGroups.scatter_switch_markers.quality.lodGroup',
          message: 'Missing LOD group "missing-lod-group".',
        }),
        expect.objectContaining({
          path: 'data/levels/level_01.json.scatterGroups.scatter_switch_markers.source.prefab',
          message: 'Missing prefab "missing_prefab".',
        }),
      ]),
    );
  });
});
