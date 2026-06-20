import type { VisualFixtureBaseline } from './shaderVisualRegression';

export const shaderMaterialVisualBaselines: readonly VisualFixtureBaseline[] = [
  {
    camera: {
      kind: 'orthographic',
      position: [0, 0, 2],
      target: [0, 0, 0],
    },
    geometry: {
      kind: 'plane',
      label: '1.8x1.8 presentation plane',
    },
    id: 'story.gate-dissolve.visible',
    parameters: {
      baseColor: '#9b6a3c',
      edgeColor: '#ffcf70',
      edgeWidth: 0.08,
      noiseScale: 8,
      progress: 0,
    },
    samples: [
      {
        expected: [155, 106, 60, 255],
        label: 'center',
        point: [32, 32],
      },
      {
        expected: [155, 106, 60, 255],
        label: 'upper-edge',
        point: [32, 48],
      },
    ],
    target: {
      id: 'story.gate-dissolve',
      kind: 'material',
    },
    tolerance: {
      aggregateDelta: 24,
      channelDelta: 8,
    },
    viewport: {
      height: 64,
      pixelRatio: 1,
      width: 64,
    },
  },
  {
    camera: {
      kind: 'orthographic',
      position: [0, 0, 2],
      target: [0, 0, 0],
    },
    geometry: {
      kind: 'plane',
      label: '1.8x1.8 presentation plane',
    },
    id: 'story.gate-dissolve.dissolved',
    parameters: {
      baseColor: '#9b6a3c',
      edgeColor: '#ffcf70',
      edgeWidth: 0.08,
      noiseScale: 8,
      progress: 1,
    },
    samples: [
      {
        expected: [0, 0, 0, 255],
        label: 'center',
        point: [32, 32],
      },
    ],
    target: {
      id: 'story.gate-dissolve',
      kind: 'material',
    },
    tolerance: {
      aggregateDelta: 8,
      channelDelta: 4,
    },
    viewport: {
      height: 64,
      pixelRatio: 1,
      width: 64,
    },
  },
  {
    camera: {
      kind: 'orthographic',
      position: [0, 0, 2],
      target: [0, 0, 0],
    },
    geometry: {
      kind: 'plane',
      label: '1.8x1.8 presentation plane',
    },
    id: 'story.hologram-scanline.globals',
    parameters: {
      baseColor: '#5aa7d6',
      flickerStrength: 0.2,
      intensity: 0.95,
      scanlineColor: '#ffcf70',
      scanlineDensity: 18,
    },
    samples: [
      {
        expected: [104, 94, 77, 255],
        label: 'center',
        point: [32, 32],
      },
      {
        expected: [20, 38, 48, 255],
        label: 'scanline-band',
        point: [32, 42],
      },
    ],
    shaderGlobals: {
      deltaSeconds: 0.016,
      elapsedSeconds: 0.4,
      viewportSize: [64, 64],
    },
    target: {
      id: 'story.hologram-scanline',
      kind: 'material',
    },
    tolerance: {
      aggregateDelta: 24,
      channelDelta: 8,
    },
    viewport: {
      height: 64,
      pixelRatio: 1,
      width: 64,
    },
  },
];
