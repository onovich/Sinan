# Mature Dependency AssetPipelineAdapter Spike Final Report

Date: 2026-06-22
Branch: `codex/mature-dependency-asset-pipeline-adapter-spike`
Base: `origin/codex/mature-dependency-physics-adapter-spike` / `6d5436cdfbce52b08501f372e794fb97a3521cd7`
Repair implementation commit before report: `6e9e54d fix: enforce asset pipeline path boundaries`
Status: PASS

## Goal

Implement an isolated, Sinan-shaped AssetPipelineAdapter spike that proves offline asset pipeline contracts without authorizing mainline production integration.

## Scope

Committed changes are limited to:

- `spikes/mature-dependencies/**`
- `docs/strategy/mature-dependency-asset-pipeline-adapter-spike/**`

No Sinan mainline `src/**`, `data/**`, `tests/**`, `public/**`, root package/config files, `.codex/**`, `Role.md`, or Phase 20/21/22/23/24/25 files were modified by this branch.

## Deliverables

- `spikes/mature-dependencies/src/asset-pipeline/asset-pipeline-types.ts`
- `spikes/mature-dependencies/src/asset-pipeline/asset-pipeline-normalizer.ts`
- `spikes/mature-dependencies/src/asset-pipeline/raw-asset-pass-through-adapter.ts`
- `spikes/mature-dependencies/src/asset-pipeline/gltf-asset-pipeline-adapter.ts`
- `spikes/mature-dependencies/src/asset-pipeline/asset-pipeline-rebuild.ts`
- `spikes/mature-dependencies/src/asset-pipeline/run-asset-pipeline-smoke.mjs`
- `spikes/mature-dependencies/reports/asset-pipeline/README.md`
- `spikes/mature-dependencies/reports/asset-pipeline/asset-pipeline-validation-summary.json`
- `docs/strategy/mature-dependency-asset-pipeline-adapter-spike/asset-pipeline-contract-notes.md`
- `docs/strategy/mature-dependency-asset-pipeline-adapter-spike/asset-pipeline-smoke-results.md`
- `docs/strategy/mature-dependency-asset-pipeline-adapter-spike/asset-pipeline-evidence-matrix.md`
- `docs/strategy/mature-dependency-asset-pipeline-adapter-spike/asset-pipeline-generated-artifact-policy.md`

## Behavior Matrix

| Area | Result | Evidence |
| --- | --- | --- |
| Contract types | PASS | Typed request, config, lifecycle, report, manifest patch, diagnostics, budget, variant, and generated artifact policy surfaces. |
| Normalization | PASS | Empty, absolute, drive-qualified, UNC, URL-like, traversal, unsupported format, profile lookup, artifact conflict, manifest conflict, and budget classification tests. |
| Raw fallback | PASS | Dependency-free pass-through adapter handles missing source, unsupported format, fallback classification, budget warning/fail, skip, disposal, and path-blocked reads before filesystem access. |
| glTF Transform adapter | PASS | Inspect, transform, write, re-read, source-truth preservation, Meshopt readiness, manifest patch, artifact hash, tool failure, and path-blocked read/write tests. |
| Rebuild semantics | PASS | Unchanged source skip, stale source rebuild, cache-disabled rebuild, non-reproducible output diagnostic tests, and rebuild path validation before source reads. |
| Boundary guard | PASS | Aggregate smoke scans for dynamic code, forbidden runtime/editor imports, and offline tool import leakage. |
| Generated artifacts | PASS | Aggregate smoke clears and rejects `test-results`, `playwright-report`, `coverage`, `dist`, `reports/asset-pipeline/generated`, and large report artifacts. |
| Repeatability | PASS | `smoke:asset-pipeline` summary output is deterministic after the aggregate smoke cleanup. |

## Validation Commands

```powershell
npm --prefix spikes\mature-dependencies run check
npm --prefix spikes\mature-dependencies run smoke:browser
npm --prefix spikes\mature-dependencies run smoke:asset-pipeline
npm --prefix spikes\mature-dependencies run smoke:asset-pipeline
git diff --check
git status --short --branch
```

Results:

- `check`: PASS, 29 test files / 123 tests; build PASS with existing large chunk warning.
- `smoke:browser`: PASS, 11 Playwright tests.
- `smoke:asset-pipeline`: PASS.
- Repeat `smoke:asset-pipeline`: PASS.
- `git diff --check`: PASS with LF/CRLF warnings only.
- Explicit generated artifact absence after final `smoke:asset-pipeline`: `dist=False`, `test-results=False`, `playwright-report=False`, `coverage=False`, `reports/asset-pipeline/generated=False`.

## Generated Artifact Policy

Source fixtures remain durable truth. Generated optimized artifacts are rebuildable evidence and must not replace source assets. The spike commits only small, textual reports and no generated GLB or texture outputs.

Committed artifact evidence:

- `reports/asset-pipeline/README.md`
- `reports/asset-pipeline/asset-pipeline-validation-summary.json`

Rejected or cleaned artifact locations:

- `reports/asset-pipeline/generated/**`
- `test-results/**`
- `playwright-report/**`
- `coverage/**`
- `dist/**`
- large GLB/texture report artifacts

## Architecture Notes

Sinan owns asset ids, source references, artifact references, manifest patch shape, build profiles, budgets, variant/cache/rebuild policy, diagnostics, and generated artifact rules. glTF Transform and meshoptimizer remain behind the isolated offline adapter and own only parse, inspect, transform, write, and optimization internals.

Adapter filesystem access is gated by normalized Sinan requests. `inspect()`, `build()`, and `rebuild()` in both the raw fallback and glTF adapters validate path policy before reads or writes, then consume the normalized request for report fields and artifact paths.

The spike does not define the final production asset manifest schema, production KTX2/Basis/Draco policy, runtime asset loading, editor UX, or mainline integration.

## Risks And Follow-Up Gates

- Mainline integration still needs a separate implementation guide and production review.
- Production asset manifest schema remains out of scope.
- Production compression policy remains out of scope.
- Browser/runtime asset loading remains out of scope.
- This evidence proves an isolated adapter candidate only.

## Known Local Dirt

The worktree had pre-existing local generated report refreshes from earlier smoke validation before this phase. They were not staged or committed:

- `spikes/mature-dependencies/reports/audio-system/audio-system-validation-summary.json`
- `spikes/mature-dependencies/reports/browser-smoke/*-summary.json`
- `spikes/mature-dependencies/reports/physics-adapter/physics-adapter-validation-summary.json`
- `spikes/mature-dependencies/reports/storage-adapter/*-summary.json`
- `spikes/mature-dependencies/reports/worker-task-adapter/worker-task-adapter-validation-summary.json`

Planner-provided untracked docs were also left uncommitted unless they belonged to this AssetPipelineAdapter report directory.

## Future Mainline Gate

Mainline AssetPipelineAdapter work must wait for architect approval and a dedicated production implementation guide. This isolated spike is evidence for that future decision, not production approval.
