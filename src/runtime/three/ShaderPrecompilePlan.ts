import { STORY_GATE_DISSOLVE_MATERIAL_ID, STORY_HOLOGRAM_SCANLINE_MATERIAL_ID } from '../materials';
import { CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID } from '../postprocess';
import { getMaterialShaderSourcePath } from './ShaderDiagnostics';

export type ShaderPrecompileTargetKind = 'material' | 'postprocess';

export interface ShaderPrecompileTarget {
  id: string;
  kind: ShaderPrecompileTargetKind;
  requiredFixture: string;
  runtimeContext: string;
  sourcePaths: readonly string[];
}

export function getProductionShaderPrecompileTargets(): readonly ShaderPrecompileTarget[] {
  return [
    createMaterialPrecompileTarget(
      STORY_GATE_DISSOLVE_MATERIAL_ID,
      'production gate dissolve ShaderMaterial compiles and changes pixels',
    ),
    createMaterialPrecompileTarget(
      STORY_HOLOGRAM_SCANLINE_MATERIAL_ID,
      'production hologram scanline ShaderMaterial compiles in Chromium',
    ),
    {
      id: CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID,
      kind: 'postprocess',
      requiredFixture: 'postprocess vignette matches deterministic visual baselines',
      runtimeContext: 'three.postprocess.runtime',
      sourcePaths: ['src/runtime/three/ThreePostProcessRuntime.ts'],
    },
  ];
}

function createMaterialPrecompileTarget(
  materialId: string,
  requiredFixture: string,
): ShaderPrecompileTarget {
  return {
    id: materialId,
    kind: 'material',
    requiredFixture,
    runtimeContext: 'three.material.factory',
    sourcePaths: [
      getRequiredMaterialShaderSourcePath(materialId, 'vertex'),
      getRequiredMaterialShaderSourcePath(materialId, 'fragment'),
    ],
  };
}

function getRequiredMaterialShaderSourcePath(
  materialId: string,
  stage: 'fragment' | 'vertex',
): string {
  const sourcePath = getMaterialShaderSourcePath(materialId, stage);

  if (!sourcePath) {
    throw new Error(`Missing ${stage} shader source path for material "${materialId}".`);
  }

  return sourcePath;
}
