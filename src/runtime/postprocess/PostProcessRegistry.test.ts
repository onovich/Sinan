import { describe, expect, it } from 'vitest';

import {
  CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID,
  cinematicVignettePostProcessDefinition,
  createDefaultPostProcessRegistry,
} from './BuiltInPostProcessEffects';
import {
  isPostProcessEffectId,
  validatePostProcessEffectDefinition,
  type PostProcessEffectDefinition,
} from './PostProcessEffectDefinition';
import { PostProcessRegistry, PostProcessRegistryError } from './PostProcessRegistry';

describe('PostProcessRegistry', () => {
  it('registers built-in public postprocess effects', () => {
    const registry = createDefaultPostProcessRegistry();

    expect(registry.get(CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID)).toBe(
      cinematicVignettePostProcessDefinition,
    );
    expect(registry.list().map((definition) => definition.id)).toEqual([
      CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID,
    ]);
  });

  it('exposes vignette through public parameters without raw pass details', () => {
    expect(isPostProcessEffectId(CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID)).toBe(true);
    expect(validatePostProcessEffectDefinition(cinematicVignettePostProcessDefinition)).toEqual([]);
    expect(cinematicVignettePostProcessDefinition.parameters).toEqual({
      enabled: {
        type: 'boolean',
        defaultValue: false,
        timeline: 'discrete',
        label: 'Enabled',
        description: 'Toggles the vignette postprocess effect.',
      },
      intensity: {
        type: 'number',
        defaultValue: 0.35,
        min: 0,
        max: 1,
        step: 0.01,
        timeline: 'continuous',
        label: 'Intensity',
        description: 'Darkening strength near the viewport edges.',
      },
      softness: {
        type: 'number',
        defaultValue: 0.45,
        min: 0.05,
        max: 0.95,
        step: 0.01,
        timeline: 'continuous',
        label: 'Softness',
        description: 'Controls how gradually the vignette fades from center to edge.',
      },
    });
  });

  it('validates and resolves public vignette values', () => {
    const registry = createDefaultPostProcessRegistry();

    expect(
      registry.validateParameters(CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID, {
        enabled: true,
        intensity: 0.8,
        softness: 0.3,
      }),
    ).toEqual([]);
    expect(
      registry.resolveParameters(CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID, {
        enabled: true,
      }),
    ).toEqual({
      enabled: true,
      intensity: 0.35,
      softness: 0.45,
    });
    expect(
      registry.validateParameters(CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID, {
        intensity: 2,
        uIntensity: 0.5,
      }),
    ).toEqual([
      {
        path: 'parameters.intensity',
        message: 'Number value 2 is above max 1.',
      },
      {
        path: 'parameters.uIntensity',
        message: `Unknown postprocess parameter "uIntensity" for effect "${CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID}".`,
      },
    ]);
  });

  it('rejects duplicate ids and renderer-specific definitions', () => {
    expect(
      () =>
        new PostProcessRegistry([
          cinematicVignettePostProcessDefinition,
          cinematicVignettePostProcessDefinition,
        ]),
    ).toThrow(PostProcessRegistryError);

    expect(
      validatePostProcessEffectDefinition({
        ...cinematicVignettePostProcessDefinition,
        uniforms: {},
      } as unknown as PostProcessEffectDefinition),
    ).toEqual([
      {
        path: CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID,
        message:
          'Postprocess effect definitions must not expose renderer pass or raw uniform details.',
      },
    ]);
  });
});
