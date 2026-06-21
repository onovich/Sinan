import { describe, expect, it } from 'vitest';

import type { AssetManifestData } from '../schemas/asset.schema';
import { createAssetReport, formatAssetReport } from './AssetReport';

const assets: AssetManifestData = {
  schemaVersion: 1,
  assets: {
    'model.switch_wall': {
      type: 'model',
      url: '/models/props/switch_wall.glb',
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
};

describe('AssetReport', () => {
  it('creates stable rows for valid assets', () => {
    const report = createAssetReport({
      assets,
      publicAssetByteSizes: new Map([['/models/props/switch_wall.glb', 1596]]),
    });

    expect(report.summary).toEqual({
      assetCount: 1,
      totalBytes: 1596,
      totalBudgetBytes: 4096,
      compressedAssetCount: 0,
      totalCompressedBytes: 0,
      sourceAssetCount: 1,
      totalSourceBytes: 1596,
      budgetPassCount: 1,
      budgetFailCount: 0,
      budgetUnknownCount: 0,
      missingMetadataCount: 0,
      missingFileCount: 0,
      issueCount: 0,
    });
    expect(report.rows[0]).toEqual(
      expect.objectContaining({
        assetId: 'model.switch_wall',
        compressed: false,
        hasMetadata: true,
        compression: 'none/source',
        status: 'ok',
      }),
    );
    expect(formatAssetReport(report)).toContain('Budget: 1 pass, 0 fail, 0 unknown.');
    expect(formatAssetReport(report)).toContain(
      '| model.switch_wall | model | /models/props/switch_wall.glb | 1596 B | 4096 B | +2500 B | 64 | - | - | none/source | palette-toon | - | - | ok |',
    );
  });

  it('reports LOD group, level count, triangle estimates, and instancing hints', () => {
    const report = createAssetReport({
      assets: createLodReportAssets(),
      publicAssetByteSizes: new Map([
        ['/models/props/switch_wall.glb', 1596],
        ['/models/props/switch_wall_lod0.glb', 2200],
        ['/models/props/switch_wall_lod1.glb', 1600],
        ['/models/props/switch_wall_lod2.glb', 1400],
      ]),
    });
    const lod1 = report.rows.find((row) => row.assetId === 'model.switch_wall.lod1');

    expect(lod1).toEqual(
      expect.objectContaining({
        maxTriangles: 12,
        lodGroup: 'gate-demo-props',
        lodLevel: 'L1',
        lodLevelCount: 3,
        instancing: 'eligible',
        status: 'ok',
      }),
    );
    expect(formatAssetReport(report)).toContain(
      '| model.switch_wall.lod1 | model | /models/props/switch_wall_lod1.glb | 1600 B | 3072 B | +1472 B | 12 | gate-demo-props L1/3 | eligible | none/source | palette-toon | - | - | ok |',
    );
  });

  it('marks missing files and missing metadata clearly', () => {
    const report = createAssetReport({
      assets: {
        schemaVersion: 1,
        assets: {
          'model.no_metadata': {
            type: 'model',
            url: '/models/no-metadata.glb',
          },
        },
      },
      publicAssetByteSizes: new Map(),
    });

    expect(report.rows[0]).toEqual(
      expect.objectContaining({
        assetId: 'model.no_metadata',
        status: 'missing-file',
      }),
    );
    expect(report.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Missing asset file "public/models/no-metadata.glb".',
        'Asset "model.no_metadata" is missing metadata.',
      ]),
    );
  });

  it('marks over-budget assets', () => {
    const report = createAssetReport({
      assets: {
        schemaVersion: 1,
        assets: {
          'audio.over_budget': {
            type: 'audio',
            url: '/audio/over-budget.wav',
            metadata: {
              category: 'audio',
              sizeBudgetBytes: 10,
            },
          },
        },
      },
      publicAssetByteSizes: new Map([['/audio/over-budget.wav', 20]]),
    });

    expect(report.rows[0]).toEqual(
      expect.objectContaining({
        assetId: 'audio.over_budget',
        budgetDeltaBytes: -10,
        status: 'over-budget',
      }),
    );
    expect(formatAssetReport(report)).toContain('| audio.over_budget | audio |');
  });

  it('marks required compression without decoder support', () => {
    const report = createAssetReport({
      assets: {
        schemaVersion: 1,
        assets: {
          'model.required_draco': {
            type: 'model',
            url: '/models/required-draco.glb',
            metadata: {
              category: 'prop',
              materialProfile: 'palette-toon',
              maxTriangles: 64,
              textureBudgetKb: 0,
              sizeBudgetBytes: 4096,
              compressed: true,
              compression: {
                codec: 'draco',
                status: 'required',
              },
              textureCompression: {
                codec: 'ktx2',
                status: 'ready',
              },
            },
          },
        },
      },
      publicAssetByteSizes: new Map([['/models/required-draco.glb', 2048]]),
    });

    expect(report.rows[0]).toEqual(
      expect.objectContaining({
        assetId: 'model.required_draco',
        compression: 'draco/required, texture:ktx2/ready',
        status: 'missing-decoder',
      }),
    );
    expect(report.issues.map((issue) => issue.message)).toContain(
      'Asset "model.required_draco" requires compression codec "draco", but no decoder support is configured.',
    );
  });
});

function createLodReportAssets(): AssetManifestData {
  const modelMetadata = {
    category: 'prop',
    materialProfile: 'palette-toon',
    textureBudgetKb: 0,
    compressed: false,
    compression: {
      codec: 'none',
      status: 'source',
    },
    lodGroup: 'gate-demo-props',
    instancing: 'eligible',
  } as const;

  return {
    schemaVersion: 1,
    assets: {
      'model.switch_wall': {
        type: 'model',
        url: '/models/props/switch_wall.glb',
        metadata: {
          ...modelMetadata,
          maxTriangles: 64,
          sizeBudgetBytes: 4096,
        },
      },
      'model.switch_wall.lod0': {
        type: 'model',
        url: '/models/props/switch_wall_lod0.glb',
        metadata: {
          ...modelMetadata,
          maxTriangles: 24,
          sizeBudgetBytes: 4096,
        },
      },
      'model.switch_wall.lod1': {
        type: 'model',
        url: '/models/props/switch_wall_lod1.glb',
        metadata: {
          ...modelMetadata,
          maxTriangles: 12,
          sizeBudgetBytes: 3072,
        },
      },
      'model.switch_wall.lod2': {
        type: 'model',
        url: '/models/props/switch_wall_lod2.glb',
        metadata: {
          ...modelMetadata,
          maxTriangles: 12,
          sizeBudgetBytes: 2048,
        },
      },
    },
    lodGroups: {
      'gate-demo-props': {
        strategy: 'distance',
        hysteresis: 1,
        lowEndBias: 1,
        fallbackAsset: 'model.switch_wall.lod2',
        levels: [
          { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
          { level: 1, asset: 'model.switch_wall.lod1', minDistance: 8 },
          { level: 2, asset: 'model.switch_wall.lod2', minDistance: 16 },
        ],
      },
    },
  };
}
