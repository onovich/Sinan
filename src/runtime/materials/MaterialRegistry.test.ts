import { describe, expect, it } from 'vitest';

import type { MaterialDefinition } from './MaterialDefinition';
import { validateMaterialDefinition } from './MaterialDefinition';
import { MaterialRegistry, MaterialRegistryError } from './MaterialRegistry';

const validDefinition: MaterialDefinition = {
  id: 'debug.test',
  version: 1,
  displayName: 'Debug Test',
  parameters: {
    amount: {
      type: 'number',
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      timeline: 'continuous',
    },
    enabled: {
      type: 'boolean',
      defaultValue: true,
      timeline: 'discrete',
    },
    baseColor: {
      type: 'color',
      defaultValue: '#87c5ff',
      timeline: 'continuous',
    },
    offset: {
      type: 'vec2',
      defaultValue: [0, 1],
      timeline: 'continuous',
    },
    direction: {
      type: 'vec3',
      defaultValue: [0, 1, 0],
      timeline: 'continuous',
    },
    noiseMap: {
      type: 'texture',
      defaultValue: null,
      timeline: 'discrete',
    },
  },
};

describe('MaterialRegistry', () => {
  it('registers and resolves material definitions by public id', () => {
    const registry = new MaterialRegistry([validDefinition]);

    expect(registry.get('debug.test')).toBe(validDefinition);
    expect(registry.list()).toEqual([validDefinition]);
  });

  it('rejects duplicate material ids', () => {
    expect(() => new MaterialRegistry([validDefinition, validDefinition])).toThrow(
      MaterialRegistryError,
    );
  });

  it('validates parameter values without requiring a texture loader', () => {
    const registry = new MaterialRegistry([validDefinition]);

    expect(
      registry.validateParameters('debug.test', {
        amount: 0.75,
        baseColor: '#ffffff',
        noiseMap: 'texture.noise',
      }),
    ).toEqual([]);

    expect(
      registry.validateParameters(
        'debug.test',
        { noiseMap: 'texture.missing' },
        { textureAssetIds: new Set(['texture.noise']) },
      ),
    ).toEqual([
      {
        path: 'parameters.noiseMap',
        message: 'Missing texture asset "texture.missing".',
      },
    ]);
  });

  it('returns actionable issues for invalid defaults and unsupported types', () => {
    const invalidDefinition = {
      id: 'debug.bad',
      version: 1,
      parameters: {
        amount: {
          type: 'number',
          defaultValue: 3,
          min: 0,
          max: 1,
        },
        unsupported: {
          type: 'matrix4',
          defaultValue: [],
        },
      },
    } as unknown as MaterialDefinition;

    expect(validateMaterialDefinition(invalidDefinition)).toEqual([
      {
        path: 'parameters.amount.defaultValue',
        message: 'Number value 3 is above max 1.',
      },
      {
        path: 'parameters.unsupported.type',
        message: 'Unsupported material parameter type "matrix4".',
      },
    ]);
  });

  it('keeps public parameter names separate from raw uniform names', () => {
    const uniformLikeDefinition = {
      id: 'debug.uniform-leak',
      version: 1,
      parameters: {
        uProgress: {
          type: 'number',
          defaultValue: 0,
        },
        progress: {
          type: 'number',
          defaultValue: 0,
          uniformName: 'uProgress',
        },
      },
    } as unknown as MaterialDefinition;

    expect(validateMaterialDefinition(uniformLikeDefinition)).toEqual([
      {
        path: 'parameters.uProgress',
        message:
          'Material parameter "uProgress" must be a public name and must not look like a raw uniform name.',
      },
      {
        path: 'parameters.progress',
        message: 'Material parameter definitions must not expose raw uniform names.',
      },
    ]);
  });

  it('reports unknown parameters and missing material ids', () => {
    const registry = new MaterialRegistry([validDefinition]);

    expect(registry.validateParameters('debug.test', { missing: 1 })).toEqual([
      {
        path: 'parameters.missing',
        message: 'Unknown material parameter "missing" for material "debug.test".',
      },
    ]);
    expect(registry.validateParameters('debug.missing')).toEqual([
      {
        path: 'materialId',
        message: 'Missing material definition "debug.missing".',
      },
    ]);
  });
});
