import { describe, expect, it } from 'vitest';

import { getProductionShaderPrecompileTargets } from './ShaderPrecompilePlan';

describe('ShaderPrecompilePlan', () => {
  it('lists every current production shader material and postprocess pass', () => {
    expect(getProductionShaderPrecompileTargets()).toEqual([
      {
        id: 'story.gate-dissolve',
        kind: 'material',
        requiredFixture: 'production gate dissolve ShaderMaterial compiles and changes pixels',
        runtimeContext: 'three.material.factory',
        sourcePaths: [
          'src/shaders/materials/story/gate-dissolve.vert.glsl',
          'src/shaders/materials/story/gate-dissolve.frag.glsl',
        ],
      },
      {
        id: 'story.hologram-scanline',
        kind: 'material',
        requiredFixture: 'production hologram scanline ShaderMaterial compiles in Chromium',
        runtimeContext: 'three.material.factory',
        sourcePaths: [
          'src/shaders/materials/story/hologram-scanline.vert.glsl',
          'src/shaders/materials/story/hologram-scanline.frag.glsl',
        ],
      },
      {
        id: 'cinematic.vignette',
        kind: 'postprocess',
        requiredFixture: 'postprocess vignette matches deterministic visual baselines',
        runtimeContext: 'three.postprocess.runtime',
        sourcePaths: ['src/runtime/three/ThreePostProcessRuntime.ts'],
      },
    ]);
  });
});
