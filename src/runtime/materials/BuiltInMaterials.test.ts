import { describe, expect, it } from 'vitest';

import {
  DEBUG_UV_GRADIENT_MATERIAL_ID,
  STORY_GATE_DISSOLVE_MATERIAL_ID,
  createDefaultMaterialRegistry,
  debugUvGradientMaterialDefinition,
  storyGateDissolveMaterialDefinition,
} from './BuiltInMaterials';
import {
  isMaterialDefinitionId,
  validateMaterialDefinition,
  type MaterialDefinition,
} from './MaterialDefinition';
import { MaterialRegistry, MaterialRegistryError } from './MaterialRegistry';

describe('built-in material definitions', () => {
  it('registers built-in materials through the default registry', () => {
    const registry = createDefaultMaterialRegistry();

    expect(registry.get(DEBUG_UV_GRADIENT_MATERIAL_ID)).toBe(debugUvGradientMaterialDefinition);
    expect(registry.get(STORY_GATE_DISSOLVE_MATERIAL_ID)).toBe(storyGateDissolveMaterialDefinition);
    expect(registry.list().map((definition) => definition.id)).toEqual([
      DEBUG_UV_GRADIENT_MATERIAL_ID,
      STORY_GATE_DISSOLVE_MATERIAL_ID,
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

  it('exposes the production gate dissolve material through public parameters', () => {
    expect(isMaterialDefinitionId(STORY_GATE_DISSOLVE_MATERIAL_ID)).toBe(true);
    expect(validateMaterialDefinition(storyGateDissolveMaterialDefinition)).toEqual([]);
    expect(storyGateDissolveMaterialDefinition.parameters).toEqual({
      progress: {
        type: 'number',
        defaultValue: 0,
        min: 0,
        max: 1,
        step: 0.01,
        timeline: 'continuous',
        label: 'Progress',
        description: 'Dissolve amount where 0 is fully visible and 1 is dissolved.',
      },
      edgeWidth: {
        type: 'number',
        defaultValue: 0.08,
        min: 0,
        max: 0.35,
        step: 0.01,
        timeline: 'continuous',
        label: 'Edge Width',
        description: 'Width of the dissolve highlight edge.',
      },
      edgeColor: {
        type: 'color',
        defaultValue: '#ffcf70',
        timeline: 'continuous',
        label: 'Edge Color',
        description: 'Color used by the dissolve highlight edge.',
      },
      baseColor: {
        type: 'color',
        defaultValue: '#9b6a3c',
        timeline: 'continuous',
        label: 'Base Color',
        description: 'Warm base tint for the gate material.',
      },
      noiseScale: {
        type: 'number',
        defaultValue: 8,
        min: 1,
        max: 32,
        step: 0.1,
        timeline: 'continuous',
        label: 'Noise Scale',
        description: 'Scale of the procedural dissolve noise.',
      },
    });
  });

  it('validates gate dissolve public parameter values', () => {
    const registry = createDefaultMaterialRegistry();

    expect(
      registry.validateParameters(STORY_GATE_DISSOLVE_MATERIAL_ID, {
        progress: 1,
        edgeWidth: 0.2,
        edgeColor: '#ffffff',
        baseColor: '#111111',
        noiseScale: 12,
      }),
    ).toEqual([]);
    expect(
      registry.validateParameters(STORY_GATE_DISSOLVE_MATERIAL_ID, {
        progress: 1.25,
        uProgress: 0.5,
      }),
    ).toEqual([
      {
        path: 'parameters.progress',
        message: 'Number value 1.25 is above max 1.',
      },
      {
        path: 'parameters.uProgress',
        message: `Unknown material parameter "uProgress" for material "${STORY_GATE_DISSOLVE_MATERIAL_ID}".`,
      },
    ]);
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

  it('rejects raw uniform-like production parameter definitions', () => {
    expect(
      validateMaterialDefinition({
        ...storyGateDissolveMaterialDefinition,
        parameters: {
          uProgress: {
            type: 'number',
            defaultValue: 0,
          },
        },
      }),
    ).toEqual([
      {
        path: 'parameters.uProgress',
        message:
          'Material parameter "uProgress" must be a public name and must not look like a raw uniform name.',
      },
    ]);
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
