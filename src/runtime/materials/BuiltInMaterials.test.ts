import { describe, expect, it } from 'vitest';

import {
  DEBUG_UV_GRADIENT_MATERIAL_ID,
  createDefaultMaterialRegistry,
  debugUvGradientMaterialDefinition,
} from './BuiltInMaterials';
import type { MaterialDefinition } from './MaterialDefinition';
import { MaterialRegistry, MaterialRegistryError } from './MaterialRegistry';

describe('built-in material definitions', () => {
  it('registers the S0 debug material through the default registry', () => {
    const registry = createDefaultMaterialRegistry();

    expect(registry.get(DEBUG_UV_GRADIENT_MATERIAL_ID)).toBe(debugUvGradientMaterialDefinition);
    expect(registry.list().map((definition) => definition.id)).toEqual([
      DEBUG_UV_GRADIENT_MATERIAL_ID,
    ]);
  });

  it('exposes deterministic public parameters without raw uniforms', () => {
    expect(debugUvGradientMaterialDefinition.parameters).toEqual({
      baseColor: {
        type: 'color',
        defaultValue: '#87c5ff',
        timeline: 'continuous',
      },
      accentColor: {
        type: 'color',
        defaultValue: '#ffcf70',
        timeline: 'continuous',
      },
      strength: {
        type: 'number',
        defaultValue: 1,
        min: 0,
        max: 1,
        step: 0.01,
        timeline: 'continuous',
      },
      uvScale: {
        type: 'vec2',
        defaultValue: [1, 1],
        timeline: 'continuous',
      },
    });
  });

  it('rejects duplicate built-in ids', () => {
    expect(
      () =>
        new MaterialRegistry([
          debugUvGradientMaterialDefinition,
          debugUvGradientMaterialDefinition,
        ]),
    ).toThrow(MaterialRegistryError);
  });

  it('catches unknown parameters and missing texture asset references through registry helpers', () => {
    const textureDefinition: MaterialDefinition = {
      id: 'debug.texture-check',
      version: 1,
      parameters: {
        noiseMap: {
          type: 'texture',
          defaultValue: null,
          timeline: 'discrete',
        },
      },
    };
    const registry = new MaterialRegistry([debugUvGradientMaterialDefinition, textureDefinition]);

    expect(registry.validateParameters(DEBUG_UV_GRADIENT_MATERIAL_ID, { rawUniform: 1 })).toEqual([
      {
        path: 'parameters.rawUniform',
        message: `Unknown material parameter "rawUniform" for material "${DEBUG_UV_GRADIENT_MATERIAL_ID}".`,
      },
    ]);
    expect(
      registry.validateParameters(
        'debug.texture-check',
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
});
