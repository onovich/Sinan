import { describe, expect, it } from 'vitest';

import { hologramScanlineShaders } from './hologramScanlineShaders';

describe('hologramScanlineShaders', () => {
  it('loads production hologram GLSL through raw imports', () => {
    expect(hologramScanlineShaders.vertexShader).toContain('varying vec2 vUv');
    expect(hologramScanlineShaders.vertexShader).toContain('vWorldPosition');
    expect(hologramScanlineShaders.fragmentShader).toContain('uIntensity');
    expect(hologramScanlineShaders.fragmentShader).toContain('uScanlineDensity');
    expect(hologramScanlineShaders.fragmentShader).toContain('uElapsedSeconds');
    expect(hologramScanlineShaders.fragmentShader).toContain('colorspace_fragment');
  });
});
