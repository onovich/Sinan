# AssetPipelineAdapter Smoke Results

Date: 2026-06-22
Branch: `codex/mature-dependency-asset-pipeline-adapter-spike`

## Commands

```powershell
npm --prefix spikes\mature-dependencies run check
npm --prefix spikes\mature-dependencies run smoke:asset-pipeline
```

Current result: PASS.

`smoke:asset-pipeline` validates:

- TypeScript typecheck
- AssetPipelineAdapter unit tests
- Offline tool import boundary guard
- Adapter path policy tests for source and generated artifact roots
- Report surface presence
- Generated artifact cleanup
- Generated artifact guard

## Evidence

- `spikes/mature-dependencies/reports/asset-pipeline/asset-pipeline-validation-summary.json`
- `spikes/mature-dependencies/reports/asset-pipeline/README.md`
- `spikes/mature-dependencies/fixtures/minimal-triangle.gltf`
- Existing baseline: `spikes/mature-dependencies/reports/gltf-transform-report.json`

## Artifact Result

Generated GLB outputs are written in unit tests to temporary directories. The aggregate smoke guards the repository by removing or rejecting:

- `reports/asset-pipeline/generated`
- `test-results`
- `playwright-report`
- `dist`
- `coverage`
- large GLB or texture report artifacts
