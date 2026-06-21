import { describe, expect, it } from 'vitest';

import { generateScatterInstances } from './ScatterGenerator';
import type { RuntimeScatterGroup } from './RuntimeTypes';

const scatterGroup: RuntimeScatterGroup = {
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

describe('deterministic scatter generator', () => {
  it('is stable for the same seed and changes for another seed', () => {
    const first = generateScatterInstances(scatterGroup);
    const second = generateScatterInstances(scatterGroup);
    const reseeded = generateScatterInstances({ ...scatterGroup, seed: 'another-seed' });

    expect(first).toEqual(second);
    expect(reseeded).not.toEqual(first);
  });

  it('supports empty scatter groups', () => {
    expect(generateScatterInstances({ ...scatterGroup, count: 0 })).toEqual([]);
  });

  it('keeps transforms inside the declared placement and transform ranges', () => {
    const instances = generateScatterInstances(scatterGroup);

    expect(instances).toHaveLength(6);
    for (const instance of instances) {
      const { position, rotation, scale } = instance.transform;

      expect(position[0]).toBeGreaterThanOrEqual(0);
      expect(position[0]).toBeLessThanOrEqual(2.4);
      expect(position[1]).toBe(0.7);
      expect(position[2]).toBeGreaterThanOrEqual(5.4);
      expect(position[2]).toBeLessThanOrEqual(7);
      expect(scale[0]).toBeGreaterThanOrEqual(0.55);
      expect(scale[0]).toBeLessThanOrEqual(0.85);
      expect(scale[1]).toBe(scale[0]);
      expect(scale[2]).toBe(scale[0]);
      expect(rotation[0]).toBe(0);
      expect(rotation[2]).toBe(0);
    }
  });

  it('applies low-end count bias deterministically', () => {
    expect(generateScatterInstances(scatterGroup, { qualityProfile: 'low-end' })).toHaveLength(3);
  });
});
