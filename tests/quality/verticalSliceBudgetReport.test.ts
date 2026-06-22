import { describe, expect, it } from 'vitest';

import {
  createVerticalSliceBudgetReport,
  formatVerticalSliceBudgetReport,
} from '../../scripts/report-vertical-slice-budgets';

describe('vertical slice perf budget report', () => {
  it('covers shader low-end social delivery spherical and asset budget evidence', async () => {
    const report = await createVerticalSliceBudgetReport();

    expect(report.status).toBe('pass');
    expect(report.assetBudget).toMatchObject({
      assetCount: 8,
      budgetBytes: 46080,
      issues: 0,
      status: 'pass',
      usedBytes: 24884,
    });
    expect(report.evidence.map((item) => item.area)).toEqual([
      'shader/postprocess low-end Chromium baseline',
      'LOD/scatter low-end budget',
      'spherical world readability and scatter budget',
      'delivery showcase route feedback budget',
      'multiplayer-lite social remote and stamp budget',
    ]);
    expect(report.evidence.every((item) => item.missingPatterns.length === 0)).toBe(true);
  });

  it('formats a release-readable perf smoke report with local limitations', async () => {
    const output = formatVerticalSliceBudgetReport(await createVerticalSliceBudgetReport());

    expect(output).toContain('Vertical Slice Budget Report');
    expect(output).toContain('Status: PASS');
    expect(output).toContain('Asset budget: PASS');
    expect(output).toContain('Real mobile hardware certification is not implied');
  });
});
