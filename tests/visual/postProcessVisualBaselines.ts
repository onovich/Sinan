import type { VisualFixtureBaseline } from './shaderVisualRegression';

export const postProcessVisualBaselines: readonly VisualFixtureBaseline[] = [
  {
    camera: {
      kind: 'orthographic',
      position: [0, 0, 2],
      target: [0, 0, 0],
    },
    geometry: {
      kind: 'plane',
      label: '2x2 white source plane',
    },
    id: 'cinematic.vignette.disabled',
    parameters: {
      enabled: false,
      intensity: 0.85,
      softness: 0.25,
    },
    samples: [
      {
        expected: [255, 255, 255, 255],
        label: 'center',
        point: [32, 32],
      },
      {
        expected: [255, 255, 255, 255],
        label: 'corner',
        point: [4, 4],
      },
    ],
    target: {
      id: 'cinematic.vignette',
      kind: 'postprocess',
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
      label: '2x2 white source plane',
    },
    id: 'cinematic.vignette.enabled',
    parameters: {
      enabled: true,
      intensity: 0.85,
      softness: 0.25,
    },
    samples: [
      {
        expected: [255, 255, 255, 255],
        label: 'center',
        point: [32, 32],
      },
      {
        expected: [173, 173, 173, 255],
        label: 'corner',
        point: [4, 4],
      },
    ],
    target: {
      id: 'cinematic.vignette',
      kind: 'postprocess',
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
];
