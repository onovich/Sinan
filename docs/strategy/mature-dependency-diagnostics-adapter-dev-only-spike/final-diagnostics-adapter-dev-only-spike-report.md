# Mature Dependency DiagnosticsAdapter Dev-Only Spike Final Report

Date: 2026-06-22
Branch: `codex/mature-dependency-diagnostics-adapter-dev-only-spike`
Base: `origin/codex/mature-dependency-asset-pipeline-adapter-spike` / `b84951c7a0e93b27b96b56b9060f0b7708b3e1bc`
Implementation commit before report: `dd05d42caf62e37db2db73af6a8ce06536e9bca6`
Repair commit: this commit; final pushed HEAD is recorded in the executor handoff.
Status: PASS after artifact-clean repair

## Goal

Implement an isolated dev-only `DiagnosticsAdapter` hardening spike that proves a Sinan-owned diagnostics boundary for Performance API markers and optional dev-only frame capture diagnostics.

This is evidence only. It does not authorize production DiagnosticsAdapter integration.

## Scope

Committed changes are limited to:

- `spikes/mature-dependencies/**`
- `docs/strategy/mature-dependency-diagnostics-adapter-dev-only-spike/**`

No Sinan mainline `src/**`, `data/**`, `tests/**`, `public/**`, root package/config files, `.codex/**`, `Role.md`, or Phase 20/21/22/23/24/25 files were modified by this branch.

## Deliverables

- `spikes/mature-dependencies/src/diagnostics-adapter/diagnostics-adapter-types.ts`
- `spikes/mature-dependencies/src/diagnostics-adapter/performance-diagnostics-adapter.ts`
- `spikes/mature-dependencies/src/diagnostics-adapter/spector-diagnostics-adapter.ts`
- `spikes/mature-dependencies/src/diagnostics-adapter/spector-dev-only-loader.ts`
- `spikes/mature-dependencies/src/diagnostics-adapter/diagnostics-adapter-browser-smoke.ts`
- `spikes/mature-dependencies/src/diagnostics-adapter/run-diagnostics-adapter-smoke.mjs`
- `spikes/mature-dependencies/src/browser-smoke/diagnostics-adapter.pw.ts`
- `spikes/mature-dependencies/reports/browser-smoke/diagnostics-adapter-summary.json`
- `spikes/mature-dependencies/reports/diagnostics-adapter/diagnostics-adapter-validation-summary.json`
- `docs/strategy/mature-dependency-diagnostics-adapter-dev-only-spike/diagnostics-adapter-contract-notes.md`
- `docs/strategy/mature-dependency-diagnostics-adapter-dev-only-spike/diagnostics-adapter-browser-smoke-results.md`
- `docs/strategy/mature-dependency-diagnostics-adapter-dev-only-spike/diagnostics-adapter-evidence-matrix.md`
- `docs/strategy/mature-dependency-diagnostics-adapter-dev-only-spike/diagnostics-adapter-production-exclusion-notes.md`

## Behavior Matrix

| Behavior | Status | Evidence |
| --- | --- | --- |
| Contract types | PASS | Sinan-owned config, command, status, message, metric, artifact, result, and adapter types. |
| Performance markers | PASS | Supported marker, missing API, invalid marker, cleanup, failure, and disposal tests. |
| Disabled/default behavior | PASS | Dev-only capture path is disabled by default and does not invoke the loader. |
| Production-disabled behavior | PASS | Non-dev and production configs return `production-disabled` before loading. |
| Unavailable behavior | PASS | Missing browser/window and disabled feature flags return non-blocking unavailable states. |
| Failed behavior | PASS | marker API exceptions and dynamic import failures normalize to `failed`. |
| Spector dynamic loader | PASS | `spectorjs` dynamic import is isolated to dev-only loader files and not pulled into production browser entry. |
| Browser smoke | PASS | `diagnostics-adapter.pw.ts` calls the DiagnosticsAdapter catalog path. |
| Production exclusion guard | PASS | aggregate smoke rejects static imports, public leaks, dynamic code, production dist markers, and forbidden artifacts. |
| Artifact policy | PASS | local capture artifacts and package-owned generated spike outputs are not source truth and are cleaned/rejected by aggregate smoke. |

## Validation Commands

```powershell
npm --prefix spikes\mature-dependencies run check
npm --prefix spikes\mature-dependencies run smoke:browser
npm --prefix spikes\mature-dependencies run smoke:diagnostics-adapter
npm --prefix spikes\mature-dependencies run smoke:diagnostics-adapter
git diff --check
git status --short --branch
```

Results:

- `check`: PASS, 32 test files / 140 tests; build PASS with existing large chunk warning.
- `smoke:browser`: PASS, 12 Playwright tests.
- `smoke:diagnostics-adapter`: PASS.
- repeat `smoke:diagnostics-adapter`: PASS.
- `git diff --check`: PASS with LF/CRLF warnings only.
- Explicit artifact absence after final aggregate smoke: `dist=False`, `test-results=False`, `playwright-report=False`, `coverage=False`, `reports/diagnostics-adapter/captures=False`, `reports/asset-pipeline/generated=False`.

Repair note:

- Checker revalidation found `reports/asset-pipeline/generated/asset-minimal-triangle-runtime.glb` after the documented validation order.
- The rebuild path-policy unit test now builds its prior report inside a temporary package root instead of the spike package root.
- The DiagnosticsAdapter aggregate smoke now treats `reports/asset-pipeline/generated` as package-wide generated-artifact hygiene and cleans/guards it explicitly.

## Architecture Notes

Sinan owns diagnostic capability ids, feature flags, command vocabulary, lifecycle states, normalized messages, artifact metadata, retention policy, and production exclusion policy.

Performance API remains a browser timing primitive behind adapter commands. It is not gameplay timing, authored data, timeline semantics, migration state, or runtime world state.

The dev-only frame capture dependency remains optional and disabled by default. The adapter exposes only Sinan-owned statuses and messages, never tool-owned objects, browser rendering objects, capture handles, or dependency object models.

## Dev-Only And Production Exclusion Policy

The spike proves:

- default capture path is disabled
- production and non-dev behavior return `production-disabled`
- dynamic import is isolated to dev-only loader files
- production `dist/**` does not contain `spectorjs` or `SPECTOR`
- public diagnostics contract and browser summary remain tool-object-free
- aggregate smoke removes `dist/**`, `test-results/**`, `playwright-report/**`, `coverage/**`, diagnostics capture artifacts, and package-owned `reports/asset-pipeline/generated/**` outputs

## Risks And Known Limits

- No production DiagnosticsSystem or UI is implemented.
- No real frame capture UI workflow is implemented.
- Capture artifacts remain local-only metadata in this spike.
- Existing Vite build still has unrelated large chunk warnings from previous spike dependencies.
- Browser smoke summary JSON files are timestamped by Playwright specs and may refresh during checker validation.

## Future Mainline Gate

Mainline diagnostics work requires a separate architect-approved implementation guide. That guide must explicitly approve any root package/config changes, production exclusion checks, UI behavior, and artifact-retention workflow.

## Not Authorized

This spike does not authorize:

- production diagnostics UI
- mainline DiagnosticsSystem integration
- gameplay/timeline/event/data conditions based on diagnostics
- persistent capture artifact workflows
- authored JSON, save data, runtime world, editor store, or migration state containing diagnostic tool data
- root dependency or bundler config changes
