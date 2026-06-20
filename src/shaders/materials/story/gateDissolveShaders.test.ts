import { describe, expect, it } from 'vitest';

import { gateDissolveShaders } from './gateDissolveShaders';

describe('gateDissolveShaders', () => {
  it('loads production dissolve GLSL through raw imports', () => {
    expect(gateDissolveShaders.vertexShader).toContain('varying vec2 vUv');
    expect(gateDissolveShaders.vertexShader).toContain('vWorldPosition');
    expect(gateDissolveShaders.fragmentShader).toContain('uProgress');
    expect(gateDissolveShaders.fragmentShader).toContain('uEdgeWidth');
    expect(gateDissolveShaders.fragmentShader).toContain('uNoiseScale');
    expect(gateDissolveShaders.fragmentShader).toContain('colorspace_fragment');
  });
});
