import { describe, expect, it } from 'vitest';

import { AssetManifestSchema } from './asset.schema';

const lodAssets = {
  'model.switch_wall.lod0': {
    type: 'model',
    url: '/models/props/switch_wall_lod0.glb',
  },
  'model.switch_wall.lod1': {
    type: 'model',
    url: '/models/props/switch_wall_lod1.glb',
  },
  'model.switch_wall.lod2': {
    type: 'model',
    url: '/models/props/switch_wall_lod2.glb',
  },
};

const validLevels = [
  { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
  { level: 1, asset: 'model.switch_wall.lod1', minDistance: 8 },
  { level: 2, asset: 'model.switch_wall.lod2', minDistance: 16 },
];

function createLodManifest(groupOverrides: Record<string, unknown> = {}): unknown {
  return {
    schemaVersion: 1,
    assets: lodAssets,
    lodGroups: {
      'gate-demo-props': {
        strategy: 'distance',
        hysteresis: 1,
        lowEndBias: 1,
        fallbackAsset: 'model.switch_wall.lod2',
        levels: validLevels,
        ...groupOverrides,
      },
    },
  };
}

describe('LOD asset manifest schema', () => {
  it('parses a renderer-neutral three-level LOD group', () => {
    expect(AssetManifestSchema.safeParse(createLodManifest()).success).toBe(true);
  });

  it.each([
    [
      'invalid threshold ordering',
      {
        levels: [
          { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
          { level: 1, asset: 'model.switch_wall.lod1', minDistance: 16 },
          { level: 2, asset: 'model.switch_wall.lod2', minDistance: 8 },
        ],
      },
    ],
    [
      'duplicate levels',
      {
        levels: [
          { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
          { level: 1, asset: 'model.switch_wall.lod1', minDistance: 8 },
          { level: 1, asset: 'model.switch_wall.lod2', minDistance: 16 },
        ],
      },
    ],
    ['missing fallback', { fallbackAsset: undefined }],
    [
      'negative thresholds',
      {
        levels: [
          { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
          { level: 1, asset: 'model.switch_wall.lod1', minDistance: -1 },
          { level: 2, asset: 'model.switch_wall.lod2', minDistance: 16 },
        ],
      },
    ],
    ['low-end bias bounds', { lowEndBias: 3 }],
  ])('rejects %s', (_label, groupOverrides) => {
    expect(AssetManifestSchema.safeParse(createLodManifest(groupOverrides)).success).toBe(false);
  });
});
