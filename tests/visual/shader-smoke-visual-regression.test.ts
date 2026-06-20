import { describe, expect, it } from 'vitest';

import {
  compareVisualFixture,
  getPixelAggregateDelta,
  type VisualFixtureBaseline,
} from './shaderVisualRegression';

describe('shader visual regression harness', () => {
  it('accepts deterministic samples inside channel and aggregate tolerance', () => {
    const result = compareVisualFixture(createBaseline(), {
      fixtureId: 'story.gate-dissolve.edge',
      samples: [
        { label: 'center', observed: [122, 86, 48, 255] },
        { label: 'edge', observed: [248, 205, 111, 255] },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.samples).toHaveLength(2);
    expect(result.samples[0]?.aggregateDelta).toBe(1);
  });

  it('reports fixture id, target id, sample label, observed value, and tolerance on failure', () => {
    const result = compareVisualFixture(createBaseline(), {
      fixtureId: 'story.gate-dissolve.edge',
      samples: [
        { label: 'center', observed: [120, 86, 48, 255] },
        { label: 'edge', observed: [40, 20, 10, 255] },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      'story.gate-dissolve.edge material:story.gate-dissolve sample "edge" expected [248, 204, 112, 255] observed [40, 20, 10, 255] channelDelta [208, 184, 102, 0] aggregateDelta 494 tolerance channel=2 aggregate=6.',
    ]);
  });

  it('reports missing samples and mismatched fixture ids', () => {
    const result = compareVisualFixture(createBaseline(), {
      fixtureId: 'wrong.fixture',
      samples: [{ label: 'center', observed: [121, 86, 48, 255] }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      'Fixture id mismatch: expected "story.gate-dissolve.edge" but observed "wrong.fixture".',
      'story.gate-dissolve.edge material:story.gate-dissolve sample "edge" missing observed pixel at tolerance channel=2 aggregate=6.',
    ]);
  });

  it('calculates aggregate RGBA deltas for compact JSON baselines', () => {
    expect(getPixelAggregateDelta([10, 20, 30, 255], [12, 19, 35, 254])).toBe(9);
  });
});

function createBaseline(): VisualFixtureBaseline {
  return {
    camera: {
      kind: 'orthographic',
      position: [0, 0, 2],
      target: [0, 0, 0],
    },
    geometry: {
      kind: 'plane',
      label: 'unit presentation plane',
    },
    id: 'story.gate-dissolve.edge',
    parameters: {
      baseColor: '#9b6a3c',
      edgeColor: '#ffcf70',
      edgeWidth: 0.08,
      noiseScale: 8,
      progress: 0.5,
    },
    samples: [
      {
        expected: [121, 86, 48, 255],
        label: 'center',
        point: [32, 32],
      },
      {
        expected: [248, 204, 112, 255],
        label: 'edge',
        point: [4, 32],
      },
    ],
    shaderGlobals: {
      deltaSeconds: 0.016,
      elapsedSeconds: 0,
      viewportSize: [64, 64],
    },
    target: {
      id: 'story.gate-dissolve',
      kind: 'material',
    },
    tolerance: {
      aggregateDelta: 6,
      channelDelta: 2,
    },
    viewport: {
      height: 64,
      pixelRatio: 1,
      width: 64,
    },
  };
}
