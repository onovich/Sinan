import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  STORY_GATE_DISSOLVE_MATERIAL_ID,
  STORY_HOLOGRAM_SCANLINE_MATERIAL_ID,
} from '../../src/runtime/materials';
import { CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID } from '../../src/runtime/postprocess';
import { getProductionShaderPrecompileTargets } from '../../src/runtime/three/ShaderPrecompilePlan';
import { postProcessVisualBaselines } from '../visual/postProcessVisualBaselines';
import { shaderMaterialVisualBaselines } from '../visual/shaderMaterialVisualBaselines';

const productionMaterialIds = [
  STORY_GATE_DISSOLVE_MATERIAL_ID,
  STORY_HOLOGRAM_SCANLINE_MATERIAL_ID,
] as const;

const productionPostProcessIds = [CINEMATIC_VIGNETTE_POSTPROCESS_EFFECT_ID] as const;

const shaderSmokeSpec = readFixtureText('../smoke/shader-material.spec.ts');
const shaderCompileFixture = readFixtureText('../smoke/shaderCompileFixture.ts');

describe('shader production quality gate', () => {
  it('keeps production targets covered by precompile and visual baselines', () => {
    const precompileTargets = getProductionShaderPrecompileTargets();
    const materialVisualTargetIds = new Set(
      shaderMaterialVisualBaselines
        .filter((baseline) => baseline.target.kind === 'material')
        .map((baseline) => baseline.target.id),
    );
    const postProcessVisualTargetIds = new Set(
      postProcessVisualBaselines
        .filter((baseline) => baseline.target.kind === 'postprocess')
        .map((baseline) => baseline.target.id),
    );

    for (const materialId of productionMaterialIds) {
      expect(
        precompileTargets.some((target) => target.kind === 'material' && target.id === materialId),
      ).toBe(true);
      expect(materialVisualTargetIds.has(materialId)).toBe(true);
    }

    for (const effectId of productionPostProcessIds) {
      expect(
        precompileTargets.some((target) => target.kind === 'postprocess' && target.id === effectId),
      ).toBe(true);
      expect(postProcessVisualTargetIds.has(effectId)).toBe(true);
    }
  });

  it('keeps required browser smoke fixtures wired to the quality gate', () => {
    for (const target of getProductionShaderPrecompileTargets()) {
      expect(shaderSmokeSpec).toContain(target.requiredFixture);
    }

    expect(shaderSmokeSpec).toContain(
      'production shader materials match deterministic visual baselines',
    );
    expect(shaderSmokeSpec).toContain(
      'shader fallback path renders visibly and reports structured diagnostics',
    );
    expect(shaderSmokeSpec).toContain(
      'low-end shader baseline stays within local Chromium budgets',
    );
    expect(shaderSmokeSpec).toContain(
      'postprocess vignette matches deterministic visual baselines',
    );

    expect(shaderCompileFixture).toContain('renderShaderFallbackDiagnosticsSmoke');
    expect(shaderCompileFixture).toContain('runLowEndShaderBaselineSmoke');
    expect(shaderCompileFixture).toContain('renderProductionMaterialVisualRegression');
    expect(shaderCompileFixture).toContain('renderPostProcessVisualRegression');
  });
});

function readFixtureText(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}
