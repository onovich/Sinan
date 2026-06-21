import { describe, expect, it } from 'vitest';

import type { AssetManifestData } from '../schemas/asset.schema';
import { validateProject } from './validateProject';

const modelMetadata = {
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
} satisfies NonNullable<AssetManifestData['assets'][string]['metadata']>;

const validLodAssets = {
  'model.switch_wall.lod0': {
    type: 'model',
    url: '/models/props/switch_wall_lod0.glb',
    metadata: modelMetadata,
  },
  'model.switch_wall.lod1': {
    type: 'model',
    url: '/models/props/switch_wall_lod1.glb',
    metadata: modelMetadata,
  },
  'model.switch_wall.lod2': {
    type: 'model',
    url: '/models/props/switch_wall_lod2.glb',
    metadata: modelMetadata,
  },
} satisfies AssetManifestData['assets'];

const validLodGroup = {
  strategy: 'distance',
  hysteresis: 1,
  lowEndBias: 1,
  fallbackAsset: 'model.switch_wall.lod2',
  levels: [
    { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
    { level: 1, asset: 'model.switch_wall.lod1', minDistance: 8 },
    { level: 2, asset: 'model.switch_wall.lod2', minDistance: 16 },
  ],
} satisfies NonNullable<AssetManifestData['lodGroups']>[string];

describe('LOD validate-data references', () => {
  it('accepts valid LOD group asset references', () => {
    const assets: AssetManifestData = {
      schemaVersion: 1,
      assets: validLodAssets,
      lodGroups: {
        'gate-demo-props': validLodGroup,
      },
    };

    expect(validateProject({ assets, prefabs: [], levels: [] }).issues).toEqual([]);
  });

  it('reports stale and non-model LOD asset ids', () => {
    const assets: AssetManifestData = {
      schemaVersion: 1,
      assets: {
        ...validLodAssets,
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
        'gate-demo-missing': {
          ...validLodGroup,
          fallbackAsset: 'model.switch_wall.missing',
          levels: [
            { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
            { level: 1, asset: 'model.switch_wall.lod1', minDistance: 8 },
            { level: 2, asset: 'model.switch_wall.missing', minDistance: 16 },
          ],
        },
        'gate-demo-wrong-type': {
          strategy: 'distance',
          hysteresis: 1,
          lowEndBias: 0,
          fallbackAsset: 'audio.switch_click',
          levels: [{ level: 0, asset: 'audio.switch_click', minDistance: 0 }],
        },
      },
    };

    const issues = validateProject({ assets, prefabs: [], levels: [] }).issues;

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'data/assets.manifest.json.lodGroups.gate-demo-missing.fallbackAsset',
          message: 'Missing asset "model.switch_wall.missing".',
        }),
        expect.objectContaining({
          path: 'data/assets.manifest.json.lodGroups.gate-demo-missing.levels.2.asset',
          message: 'Missing asset "model.switch_wall.missing".',
        }),
        expect.objectContaining({
          path: 'data/assets.manifest.json.lodGroups.gate-demo-wrong-type.fallbackAsset',
          message: 'Asset "audio.switch_click" must be type "model", got "audio".',
        }),
        expect.objectContaining({
          path: 'data/assets.manifest.json.lodGroups.gate-demo-wrong-type.levels.0.asset',
          message: 'Asset "audio.switch_click" must be type "model", got "audio".',
        }),
      ]),
    );
  });
});
