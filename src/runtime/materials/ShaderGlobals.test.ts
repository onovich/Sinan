import { describe, expect, it } from 'vitest';

import {
  SHADER_GLOBAL_KEYS,
  createDefaultShaderGlobals,
  isPublicShaderGlobalName,
  isShaderGlobalKey,
  normalizeShaderGlobals,
} from './ShaderGlobals';

describe('ShaderGlobals', () => {
  it('creates renderer-neutral default globals', () => {
    expect(createDefaultShaderGlobals()).toEqual({
      elapsedSeconds: 0,
      deltaSeconds: 0,
      viewportSize: [1, 1],
    });
  });

  it('accepts only public semantic global names', () => {
    expect(SHADER_GLOBAL_KEYS).toEqual([
      'elapsedSeconds',
      'deltaSeconds',
      'viewportSize',
      'cameraPosition',
    ]);
    expect(isShaderGlobalKey('elapsedSeconds')).toBe(true);
    expect(isPublicShaderGlobalName('cameraPosition')).toBe(true);
    expect(isPublicShaderGlobalName('uTime')).toBe(false);
    expect(isPublicShaderGlobalName('time')).toBe(false);
    expect(isPublicShaderGlobalName('uResolution')).toBe(false);
  });

  it('normalizes time, delta, viewport, and camera values', () => {
    expect(
      normalizeShaderGlobals(
        {
          elapsedSeconds: 12.5,
          deltaSeconds: 0.25,
          viewportSize: [0, 720],
          cameraPosition: [1, 2, 3],
        },
        createDefaultShaderGlobals(),
        { maxDeltaSeconds: 0.1 },
      ),
    ).toEqual({
      elapsedSeconds: 12.5,
      deltaSeconds: 0.1,
      viewportSize: [1, 720],
      cameraPosition: [1, 2, 3],
    });
  });

  it('falls back to previous valid globals for invalid input', () => {
    expect(
      normalizeShaderGlobals(
        {
          elapsedSeconds: Number.NaN,
          deltaSeconds: -1,
          viewportSize: [Number.NaN, 0],
          cameraPosition: [Number.POSITIVE_INFINITY, 2, 3],
        },
        {
          elapsedSeconds: 3,
          deltaSeconds: 0.016,
          viewportSize: [1280, 720],
          cameraPosition: [4, 5, 6],
        },
      ),
    ).toEqual({
      elapsedSeconds: 3,
      deltaSeconds: 0,
      viewportSize: [1280, 720],
      cameraPosition: [4, 5, 6],
    });
  });

  it('allows camera position to be explicitly cleared', () => {
    expect(
      normalizeShaderGlobals(
        { cameraPosition: null },
        {
          elapsedSeconds: 3,
          deltaSeconds: 0.016,
          viewportSize: [1280, 720],
          cameraPosition: [4, 5, 6],
        },
      ),
    ).toEqual({
      elapsedSeconds: 3,
      deltaSeconds: 0.016,
      viewportSize: [1280, 720],
    });
  });
});
