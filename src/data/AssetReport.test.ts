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
      '| model.switch_wall | model | /models/props/switch_wall.glb | 1596 B | 4096 B | +2500 B | none/source | palette-toon | - | - | ok |',
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
