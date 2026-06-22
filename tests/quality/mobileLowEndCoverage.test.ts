import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('low-end mobile narrow social delivery shader coverage', () => {
  it('keeps Phase 26 local mobile and low-end evidence mapped to smoke gates', () => {
    const editorSmoke = readFileSync('tests/smoke/editor.spec.ts', 'utf8');
    const shaderSmoke = readFileSync('tests/smoke/shader-material.spec.ts', 'utf8');
    const releaseProfile = readFileSync(
      'docs/vertical-slice-release-validation-profile.md',
      'utf8',
    );

    for (const expectedEditorEvidence of [
      'editor shell remains contained and readable on a narrow viewport',
      'setViewportSize({ width: 390, height: 844 })',
      'styled runtime rendering is nonblank and low-end mode changes visible pixels',
      '/?runtimeDiagnostics=1&styleQuality=low-end',
      'runtime diagnostics expose LOD and instanced scatter smoke counters',
      'multiplayer-lite social smoke shows ten remotes and stamp diagnostics',
      'delivery showcase smoke completes a job flow and editor can inspect job data',
      'compact spherical world smoke exposes movement camera and perf diagnostics',
    ]) {
      expect(editorSmoke).toContain(expectedEditorEvidence);
    }

    for (const expectedShaderEvidence of [
      'low-end shader baseline stays within local Chromium budgets',
      'expect(result.viewport).toEqual({ width: 360, height: 640 })',
      'maxDurationMs',
      'maxProgramCount',
    ]) {
      expect(shaderSmoke).toContain(expectedShaderEvidence);
    }

    for (const expectedLimitation of [
      'Mobile evidence is narrow viewport plus `styleQuality=low-end` Chromium evidence',
      'Real mobile hardware certification is not implied',
    ]) {
      expect(releaseProfile).toContain(expectedLimitation);
    }
  });
});
