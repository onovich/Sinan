import { describe, expect, it } from 'vitest';

import { debugUvGradientShaders } from './debugUvGradientShaders';

describe('debugUvGradientShaders', () => {
  it('loads vertex and fragment GLSL through raw imports', () => {
    expect(debugUvGradientShaders.vertexShader).toContain('varying vec2 vUv');
    expect(debugUvGradientShaders.vertexShader).toContain('gl_Position');
    expect(debugUvGradientShaders.fragmentShader).toContain('uBaseColor');
    expect(debugUvGradientShaders.fragmentShader).toContain('colorspace_fragment');
  });
});
