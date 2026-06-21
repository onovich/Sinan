import { describe, expect, it } from 'vitest';

import { selectRuntimeLodLevel } from './LodSelector';
import type { RuntimeLodGroup, RuntimeLodSelectedLevel } from './RuntimeTypes';

const lodGroup: RuntimeLodGroup = {
  strategy: 'distance',
  hysteresis: 1,
  lowEndBias: 1,
  fallbackAsset: 'model.switch_wall.lod2',
  levels: [
    { level: 0, asset: 'model.switch_wall.lod0', minDistance: 0 },
    { level: 1, asset: 'model.switch_wall.lod1', minDistance: 8 },
    { level: 2, asset: 'model.switch_wall.lod2', minDistance: 16 },
  ],
};

describe('runtime LOD selector', () => {
  it('uses hysteresis for forward and backward camera movement', () => {
    expectSelected(selectRuntimeLodLevel({ group: lodGroup, distance: 8.5, currentLevel: 0 }), 0);
    expectSelected(selectRuntimeLodLevel({ group: lodGroup, distance: 9, currentLevel: 0 }), 1);
    expectSelected(selectRuntimeLodLevel({ group: lodGroup, distance: 7.5, currentLevel: 1 }), 1);
    expectSelected(selectRuntimeLodLevel({ group: lodGroup, distance: 6.5, currentLevel: 1 }), 0);
  });

  it('selects deterministic threshold edges without current state', () => {
    expectSelected(selectRuntimeLodLevel({ group: lodGroup, distance: 0 }), 0);
    expectSelected(selectRuntimeLodLevel({ group: lodGroup, distance: 8 }), 1);
    expectSelected(selectRuntimeLodLevel({ group: lodGroup, distance: 16 }), 2);
  });

  it('ignores stale current state and selects from distance', () => {
    expectSelected(selectRuntimeLodLevel({ group: lodGroup, distance: 9, currentLevel: 99 }), 1);
  });

  it('returns a disabled result when LOD is unavailable or disabled', () => {
    expect(selectRuntimeLodLevel({ distance: 12 })).toEqual({
      status: 'disabled',
      changed: false,
      fallbackUsed: false,
    });
    expect(selectRuntimeLodLevel({ group: { ...lodGroup, enabled: false }, distance: 12 })).toEqual(
      {
        status: 'disabled',
        changed: false,
        fallbackUsed: false,
      },
    );
  });

  it('applies low-end quality profile bias toward cheaper levels', () => {
    expectSelected(
      selectRuntimeLodLevel({ group: lodGroup, distance: 0, qualityProfile: 'low-end' }),
      1,
    );
    expectSelected(
      selectRuntimeLodLevel({ group: lodGroup, distance: 20, qualityProfile: 'low-end' }),
      2,
    );
  });

  it('falls back to the declared fallback level when the selected asset is unavailable', () => {
    const result = expectSelected(
      selectRuntimeLodLevel({
        group: lodGroup,
        distance: 0,
        availableAssetIds: new Set(['model.switch_wall.lod2']),
      }),
      2,
    );

    expect(result.asset).toBe('model.switch_wall.lod2');
    expect(result.fallbackUsed).toBe(true);
  });
});

function expectSelected(
  result: ReturnType<typeof selectRuntimeLodLevel>,
  level: number,
): RuntimeLodSelectedLevel {
  expect(result.status).toBe('selected');

  if (result.status !== 'selected') {
    throw new Error('Expected selected LOD result.');
  }

  expect(result.level).toBe(level);
  return result;
}
