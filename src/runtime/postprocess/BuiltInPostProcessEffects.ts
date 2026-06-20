import type { PostProcessEffectDefinition } from './PostProcessEffectDefinition';
import { PostProcessRegistry } from './PostProcessRegistry';

export const CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID = 'cinematic.vignette';

export const cinematicVignettePostProcessDefinition: PostProcessEffectDefinition = {
  id: CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID,
  version: 1,
  displayName: 'Cinematic Vignette',
  parameters: {
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
  },
};

export const BUILT_IN_POSTPROCESS_EFFECT_DEFINITIONS = [
  cinematicVignettePostProcessDefinition,
] as const;

export function createDefaultPostProcessRegistry(): PostProcessRegistry {
  return new PostProcessRegistry(BUILT_IN_POSTPROCESS_EFFECT_DEFINITIONS);
}
