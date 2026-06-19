import type { MaterialDefinition } from './MaterialDefinition';
import { MaterialRegistry } from './MaterialRegistry';

export const DEBUG_UV_GRADIENT_MATERIAL_ID = 'debug.uv-gradient';

export const debugUvGradientMaterialDefinition: MaterialDefinition = {
  id: DEBUG_UV_GRADIENT_MATERIAL_ID,
  version: 1,
  displayName: 'Debug UV Gradient',
  parameters: {
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
  },
};

export const BUILT_IN_MATERIAL_DEFINITIONS = [debugUvGradientMaterialDefinition] as const;

export function createDefaultMaterialRegistry(): MaterialRegistry {
  return new MaterialRegistry(BUILT_IN_MATERIAL_DEFINITIONS);
}
