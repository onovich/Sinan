import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('release validation profile', () => {
  it('keeps wrapper and direct command evidence aligned for Phase 26', () => {
    const profile = readFileSync('docs/vertical-slice-release-validation-profile.md', 'utf8');
    const opsConfig = readFileSync('.codex/project-ops-workflow.json', 'utf8');
    const packageJson = readFileSync('package.json', 'utf8');

    for (const requiredCommand of [
      'Validate.cmd',
      'Smoke.cmd',
      'npm run format:check',
      'npm run typecheck',
      'npm run lint',
      'npm run build',
      'npm run test',
      'npm run check-boundaries',
      'npm run validate-data',
      'npm run report-assets',
      'npm run migrate-data -- --check',
      'npm run test:smoke',
      'git diff --check',
    ]) {
      expect(profile).toContain(requiredCommand);
    }

    for (const requiredOpsStep of [
      'format:check',
      'typecheck',
      'lint',
      'build',
      'test',
      'check-boundaries',
      'validate-data',
      'report-assets',
      'migrate-data',
    ]) {
      expect(opsConfig).toContain(requiredOpsStep);
      expect(packageJson).toContain(requiredOpsStep);
    }
  });

  it('records release validation scope and local limitations', () => {
    const profile = readFileSync('docs/vertical-slice-release-validation-profile.md', 'utf8');

    for (const expectedEvidence of [
      'Delivery showcase',
      'Multiplayer-lite social layer',
      'Shader/postprocess low-end baseline',
      'LOD/scatter/spherical world',
      'Asset budget',
      'Migration safety',
      'Boundary safety',
      'Mobile evidence is narrow viewport',
      'local WebSocket room remains a replaceable prototype',
    ]) {
      expect(profile).toContain(expectedEvidence);
    }
  });
});
