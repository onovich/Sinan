import { REVISION as THREE_REVISION } from 'three';

export type ShaderDiagnosticKind = 'material' | 'postprocess';

export type ShaderDiagnosticStage =
  | 'factory'
  | 'fragment'
  | 'parameters'
  | 'pass'
  | 'program'
  | 'runtime'
  | 'vertex';

export interface ShaderDiagnosticTarget {
  entityId?: string;
  slot?: string;
}

export interface ShaderDiagnosticBrowserContext {
  gpuRenderer?: string;
  gpuVendor?: string;
  userAgent?: string;
}

export interface ShaderDiagnosticInput {
  browser?: ShaderDiagnosticBrowserContext;
  compileLog?: string;
  diagnosticCode: string;
  effectId?: string;
  fixtureName?: string;
  kind: ShaderDiagnosticKind;
  materialId?: string;
  materialName?: string;
  message: string;
  parameter?: string;
  runtimeContext: string;
  shaderSourcePath?: string;
  stage: ShaderDiagnosticStage;
  target?: ShaderDiagnosticTarget;
  threeRevision?: string;
}

export interface ShaderDiagnostic extends ShaderDiagnosticInput {
  threeRevision: string;
}

export function createShaderDiagnostic(input: ShaderDiagnosticInput): ShaderDiagnostic {
  return {
    ...input,
    threeRevision: input.threeRevision ?? THREE_REVISION,
  };
}

export function formatShaderDiagnostic(diagnostic: ShaderDiagnostic): string {
  const parts = [
    `[${diagnostic.runtimeContext}]`,
    `${diagnostic.kind}:${getDiagnosticSubject(diagnostic)}`,
    `code=${diagnostic.diagnosticCode}`,
    `stage=${diagnostic.stage}`,
  ];

  if (diagnostic.shaderSourcePath) {
    parts.push(`source=${diagnostic.shaderSourcePath}`);
  }
  if (diagnostic.materialName) {
    parts.push(`name=${diagnostic.materialName}`);
  }
  if (diagnostic.parameter) {
    parts.push(`parameter=${diagnostic.parameter}`);
  }
  if (diagnostic.target?.entityId) {
    parts.push(`entity=${diagnostic.target.entityId}`);
  }
  if (diagnostic.target?.slot) {
    parts.push(`slot=${diagnostic.target.slot}`);
  }
  if (diagnostic.fixtureName) {
    parts.push(`fixture=${diagnostic.fixtureName}`);
  }
  parts.push(`three=${diagnostic.threeRevision}`);
  if (diagnostic.browser?.userAgent) {
    parts.push(`browser="${diagnostic.browser.userAgent}"`);
  }
  if (diagnostic.browser?.gpuVendor) {
    parts.push(`gpuVendor="${diagnostic.browser.gpuVendor}"`);
  }
  if (diagnostic.browser?.gpuRenderer) {
    parts.push(`gpuRenderer="${diagnostic.browser.gpuRenderer}"`);
  }

  parts.push(`message="${diagnostic.message}"`);

  if (diagnostic.compileLog) {
    parts.push(`compileLog="${diagnostic.compileLog}"`);
  }

  return parts.join(' ');
}

export function getMaterialShaderSourcePath(
  materialId: string,
  stage: Extract<ShaderDiagnosticStage, 'fragment' | 'vertex'>,
): string | undefined {
  const sources = MATERIAL_SHADER_SOURCE_PATHS[materialId];

  return sources?.[stage];
}

function getDiagnosticSubject(diagnostic: ShaderDiagnostic): string {
  if (diagnostic.kind === 'postprocess') {
    return diagnostic.effectId ?? 'unknown';
  }

  return diagnostic.materialId ?? 'unknown';
}

const MATERIAL_SHADER_SOURCE_PATHS: Record<string, { fragment: string; vertex: string }> = {
  'debug.uv-gradient': {
    fragment: 'src/shaders/materials/debug/debug-uv-gradient.frag.glsl',
    vertex: 'src/shaders/materials/debug/debug-uv-gradient.vert.glsl',
  },
  'story.gate-dissolve': {
    fragment: 'src/shaders/materials/story/gate-dissolve.frag.glsl',
    vertex: 'src/shaders/materials/story/gate-dissolve.vert.glsl',
  },
  'story.hologram-scanline': {
    fragment: 'src/shaders/materials/story/hologram-scanline.frag.glsl',
    vertex: 'src/shaders/materials/story/hologram-scanline.vert.glsl',
  },
};
