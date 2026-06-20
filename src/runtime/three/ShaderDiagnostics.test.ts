import { describe, expect, it } from 'vitest';

import {
  createMaterialRuntimeDiagnostic,
  createPostProcessValidationDiagnostic,
  createShaderDiagnostic,
  formatShaderDiagnostic,
  getMaterialShaderSourcePath,
} from './ShaderDiagnostics';

describe('ShaderDiagnostics', () => {
  it('formats complete material diagnostics with stable shader context', () => {
    const diagnostic = createShaderDiagnostic({
      browser: {
        gpuRenderer: 'ANGLE Mock Renderer',
        gpuVendor: 'Mock GPU Vendor',
        userAgent: 'Chromium Test Agent',
      },
      compileLog: 'ERROR: fragment shader failed',
      diagnosticCode: 'shader_compile_failed',
      fixtureName: 'story.gate-dissolve.visual',
      kind: 'material',
      materialId: 'story.gate-dissolve',
      materialName: 'Gate Dissolve',
      message: 'Shader compile failed.',
      parameter: 'progress',
      runtimeContext: 'smoke.shader.compile',
      shaderSourcePath: 'src/shaders/materials/story/gate-dissolve.frag.glsl',
      stage: 'fragment',
      target: {
        entityId: 'gate_a',
        slot: 'main',
      },
      threeRevision: '181-test',
    });

    expect(formatShaderDiagnostic(diagnostic)).toBe(
      '[smoke.shader.compile] material:story.gate-dissolve code=shader_compile_failed stage=fragment source=src/shaders/materials/story/gate-dissolve.frag.glsl name=Gate Dissolve parameter=progress entity=gate_a slot=main fixture=story.gate-dissolve.visual three=181-test browser="Chromium Test Agent" gpuVendor="Mock GPU Vendor" gpuRenderer="ANGLE Mock Renderer" message="Shader compile failed." compileLog="ERROR: fragment shader failed"',
    );
  });

  it('formats postprocess diagnostics without optional browser or target fields', () => {
    const diagnostic = createShaderDiagnostic({
      diagnosticCode: 'postprocess_parameter_invalid',
      effectId: 'cinematic.vignette',
      kind: 'postprocess',
      message: 'Unknown postprocess parameter "uIntensity".',
      parameter: 'uIntensity',
      runtimeContext: 'three.postprocess.runtime',
      stage: 'parameters',
      threeRevision: '181-test',
    });

    expect(formatShaderDiagnostic(diagnostic)).toBe(
      '[three.postprocess.runtime] postprocess:cinematic.vignette code=postprocess_parameter_invalid stage=parameters parameter=uIntensity three=181-test message="Unknown postprocess parameter "uIntensity"."',
    );
  });

  it('maps known material ids and shader stages to source paths', () => {
    expect(getMaterialShaderSourcePath('story.gate-dissolve', 'fragment')).toBe(
      'src/shaders/materials/story/gate-dissolve.frag.glsl',
    );
    expect(getMaterialShaderSourcePath('story.hologram-scanline', 'vertex')).toBe(
      'src/shaders/materials/story/hologram-scanline.vert.glsl',
    );
    expect(getMaterialShaderSourcePath('missing.material', 'fragment')).toBeUndefined();
  });

  it('converts material runtime fallback errors into structured diagnostics', () => {
    const diagnostic = createMaterialRuntimeDiagnostic(
      {
        code: 'missing_material',
        materialId: 'story.missing',
        message: 'Missing material definition "story.missing".',
        target: {
          entityId: 'gate_a',
          slot: 'main',
        },
      },
      'three.material.runtime',
      'fallback-smoke',
    );

    expect(formatShaderDiagnostic({ ...diagnostic, threeRevision: '181-test' })).toBe(
      '[three.material.runtime] material:story.missing code=missing_material stage=factory entity=gate_a slot=main fixture=fallback-smoke three=181-test message="Missing material definition "story.missing"."',
    );
  });

  it('converts postprocess public-parameter issues into structured diagnostics', () => {
    const diagnostic = createPostProcessValidationDiagnostic(
      'cinematic.vignette',
      {
        path: 'parameters.uIntensity',
        message: 'Unknown postprocess parameter "uIntensity" for effect "cinematic.vignette".',
      },
      'three.postprocess.runtime',
    );

    expect(formatShaderDiagnostic({ ...diagnostic, threeRevision: '181-test' })).toBe(
      '[three.postprocess.runtime] postprocess:cinematic.vignette code=invalid_parameter stage=parameters parameter=uIntensity three=181-test message="Unknown postprocess parameter "uIntensity" for effect "cinematic.vignette"."',
    );
  });
});
