import { describe, expect, it } from 'vitest';

import { LevelSchema } from './level.schema';
import { ScatterGroupSchema } from './scatter.schema';

const validScatterGroup = {
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
  transform: {
    yaw: {
      min: -0.35,
      max: 0.35,
    },
    uniformScale: {
      min: 0.55,
      max: 0.85,
    },
  },
  quality: {
    lodGroup: 'gate-demo-props',
    lowEndCountScale: 0.5,
  },
  fallback: {
    mode: 'placeholder',
    asset: 'model.switch_wall.lod2',
  },
};

describe('scatter schema', () => {
  it('parses renderer-neutral scatter groups on levels', () => {
    const result = LevelSchema.safeParse({
      schemaVersion: 1,
      id: 'level_01',
      name: 'Gate Demo',
      entities: [],
      scatterGroups: [validScatterGroup],
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ['negative count', { count: -1 }],
    ['too many instances', { count: 10_001 }],
    [
      'invalid yaw range',
      {
        transform: {
          yaw: { min: 1, max: -1 },
        },
      },
    ],
    [
      'invalid scale range',
      {
        transform: {
          uniformScale: { min: 0, max: 1 },
        },
      },
    ],
    [
      'invalid placement size',
      {
        placement: {
          shape: 'box',
          center: [0, 0, 0],
          size: [-1, 0, 1],
        },
      },
    ],
    [
      'invalid low-end count scale',
      {
        quality: {
          lowEndCountScale: 1.5,
        },
      },
    ],
  ])('rejects %s', (_label, overrides) => {
    expect(
      ScatterGroupSchema.safeParse({
        ...validScatterGroup,
        ...overrides,
      }).success,
    ).toBe(false);
  });
});
