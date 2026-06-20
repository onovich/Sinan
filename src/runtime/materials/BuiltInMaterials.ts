import type { MaterialDefinition } from './MaterialDefinition';
import { MaterialRegistry } from './MaterialRegistry';

export const DEBUG_UV_GRADIENT_MATERIAL_ID = 'debug.uv-gradient';
export const STORY_GATE_DISSOLVE_MATERIAL_ID = 'story.gate-dissolve';
export const STORY_HOLOGRAM_SCANLINE_MATERIAL_ID = 'story.hologram-scanline';

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

export const storyGateDissolveMaterialDefinition: MaterialDefinition = {
  id: STORY_GATE_DISSOLVE_MATERIAL_ID,
  version: 1,
  displayName: 'Gate Dissolve',
  parameters: {
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
  },
};

export const storyHologramScanlineMaterialDefinition: MaterialDefinition = {
  id: STORY_HOLOGRAM_SCANLINE_MATERIAL_ID,
  version: 1,
  displayName: 'Hologram Scanline',
  parameters: {
    intensity: {
      type: 'number',
      defaultValue: 0.75,
      min: 0,
      max: 1,
      step: 0.01,
      timeline: 'continuous',
      label: 'Intensity',
      description: 'Overall hologram visibility and glow strength.',
    },
    baseColor: {
      type: 'color',
      defaultValue: '#5aa7d6',
      timeline: 'continuous',
      label: 'Base Color',
      description: 'Primary hologram tint.',
    },
    scanlineColor: {
      type: 'color',
      defaultValue: '#ffcf70',
      timeline: 'continuous',
      label: 'Scanline Color',
      description: 'Tint for the animated scanline highlights.',
    },
    scanlineDensity: {
      type: 'number',
      defaultValue: 36,
      min: 4,
      max: 96,
      step: 1,
      timeline: 'continuous',
      label: 'Scanline Density',
      description: 'Number of scanline bands across the material surface.',
    },
    flickerStrength: {
      type: 'number',
      defaultValue: 0.12,
      min: 0,
      max: 0.5,
      step: 0.01,
      timeline: 'continuous',
      label: 'Flicker Strength',
      description: 'Subtle time-driven brightness variation from shader globals.',
    },
  },
};

export const BUILT_IN_MATERIAL_DEFINITIONS = [
  debugUvGradientMaterialDefinition,
  storyGateDissolveMaterialDefinition,
  storyHologramScanlineMaterialDefinition,
] as const;

export function createDefaultMaterialRegistry(): MaterialRegistry {
  return new MaterialRegistry(BUILT_IN_MATERIAL_DEFINITIONS);
}
