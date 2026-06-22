# Mature Dependency Browser Smoke Harness Final Report

Date: 2026-06-22
Branch: `codex/mature-dependency-browser-smoke-harness`
Base: `origin/codex/mature-dependency-adapter-contract-rfcs`
Original final report commit: `6861ea5`

## Status

BROWSER SMOKE HARNESS PASS after environment repair.

The isolated browser smoke harness, Playwright config, browser smoke cases, result schema, reports, and handoff documents were created and pushed. The acceptance review on 2026-06-22 correctly marked the goal BLOCKED because Playwright-managed Chromium 1228 / Headless Shell 1228 was missing at that time.

The environment repair pass found the required Playwright browser payloads present in the user-level cache, verified `chromium.launch({ headless: true })`, and reran the browser smoke harness. The real browser run now passes all Playwright tests. All browser-sensitive candidates except recast-navigation have `PASS` summaries; recast-navigation remains `POLICY-SKIP` under RFC-013.

This pass still does not authorize adapter implementation, root dependency changes, or Sinan mainline runtime work.

## Scope

- Isolated browser smoke harness only.
- No mainline runtime integration.
- No production dependency approval.
- No root package/config changes.
- No Sinan mainline `src/**`, `data/**`, `tests/**`, or `public/**` changes.

## Environment

| Item | Result |
| --- | --- |
| Playwright package | `Version 1.61.0` |
| Expected browser | Playwright Chromium 1228 / Headless Shell 1228 |
| Browser payload result | PASS; Chromium 1228 and Headless Shell 1228 are present in `C:\Users\Administrator\AppData\Local\ms-playwright`. |
| Browser launch result | PASS; `chromium.launch({ headless: true })` reports `149.0.7827.55`. |
| Existing cache | Includes required 1228 payloads; older 1217 payloads may also remain. |
| Port | `5184`; port `5174` not used. |
| Headless/headed | Headless default, headed wrapper available through `smoke:browser:headed`. |

## Candidate Summary

| Candidate | Status | Browser evidence | Main blocker or risk | Next gate |
| --- | --- | --- | --- | --- |
| Browser baseline | `PASS` | `browser-baseline-summary.json` | None for isolated browser environment. | Adapter-specific implementation guide still required. |
| Web Audio | `PASS` | `web-audio-summary.json` | Browser API behavior proven only in isolated smoke. | RFC-007 plus browser smoke policy. |
| Dexie / IndexedDB | `PASS` | `dexie-indexeddb-summary.json` | Browser-local persistence only; canonical `data/**/*.json` remains source of truth. | RFC-008 plus storage/save adapter contract. |
| Comlink / Worker | `PASS` | `comlink-worker-summary.json` | Worker behavior must stay behind Sinan-owned task contract. | RFC-010 plus WorkerTask adapter contract. |
| Spector.js | `PASS` | `spector-dev-only-summary.json` | Dev-only package must remain disabled by default and excluded from production behavior. | RFC-012 plus RFC-011 production exclusion. |
| Rapier / WASM | `PASS` | `rapier-wasm-summary.json` | Browser smoke exercises `@dimforge/rapier3d-compat`; base `@dimforge/rapier3d` remains a packaging decision for a future PhysicsAdapter guide. | RFC-006 plus RFC-011. |
| recast-navigation | `POLICY-SKIP` | `recast-policy-skip-summary.json` | RFC-013 keeps navigation on hold. | Dedicated navigation RFC before implementation. |

## Reports And Artifacts

- `docs/strategy/mature-dependency-browser-smoke/README.md`
- `docs/strategy/mature-dependency-browser-smoke/environment-audit.md`
- `docs/strategy/mature-dependency-browser-smoke/browser-smoke-results.md`
- `docs/strategy/mature-dependency-browser-smoke/final-browser-smoke-harness-report.md`
- `spikes/mature-dependencies/playwright.config.ts`
- `spikes/mature-dependencies/src/browser-smoke/**`
- `spikes/mature-dependencies/reports/browser-smoke/*.json`

Committed artifacts are limited to source, config, Markdown reports, and small JSON summaries. Browser binaries, cache, traces, videos, screenshots, `dist/**`, `coverage/**`, and `node_modules/**` were not committed.

## Validation

| Command | Result |
| --- | --- |
| `npm --prefix spikes\mature-dependencies exec -- playwright --version` | PASS, `Version 1.61.0`. |
| `chromium.launch({ headless: true })` from `spikes/mature-dependencies` | PASS, browser version `149.0.7827.55`. |
| `npm --prefix spikes\mature-dependencies run check` | PASS. |
| `npm --prefix spikes\mature-dependencies run smoke:browser` | PASS, 7 Playwright tests passed and emitted normalized `PASS` / `POLICY-SKIP` summaries. |
| Production Spector static exclusion | PASS, no `spectorjs` or `SPECTOR` matches found in `dist/**` after build. |
| `git diff --check` | PASS. |
| Forbidden path scan | PASS, branch changes are limited to `spikes/mature-dependencies/**` and `docs/strategy/mature-dependency-browser-smoke/**`. |

## Architecture Boundaries

| Boundary | Result |
| --- | --- |
| Root package/config modified | no |
| `src/**` modified | no |
| `data/**` modified | no |
| `tests/**` modified | no |
| `public/**` modified | no |
| `.codex/**` modified | no |
| Phase 20/21 touched | no |
| Candidate promoted to hard dependency | no |
| Port `5174` used | no |
| recast-navigation moved out of hold | no |

## Resolved Environment Blocker

Original blocker: Playwright-managed Chromium install and launch unavailable.

Repair result: resolved for the local environment.

Layer: `environment`.

Environment:

- Windows local workspace.
- Isolated package: `D:\LabProjects\Sinan-MatureDependencySpikes\spikes\mature-dependencies`.
- Playwright: `1.61.0`.
- Required browser payload: Chromium 1228 / Headless Shell 1228.

Repro command:

```powershell
cd D:\LabProjects\Sinan-MatureDependencySpikes\spikes\mature-dependencies
npm exec -- playwright --version
node -e "import('playwright').then(async ({chromium})=>{const browser=await chromium.launch({headless:true}); console.log(browser.version()); await browser.close();})"
npm run smoke:browser
```

Observed result:

- Playwright CLI is available.
- Browser launch succeeds.
- Browser smoke runs actual page/candidate tests and passes.

Expected result:

- `chromium.launch({ headless: true })` starts and reports a browser version.
- `npm --prefix spikes\mature-dependencies run smoke:browser` runs actual page/candidate tests.

Why this no longer blocks:

- The guide requires Playwright Chromium to locate and launch before browser-sensitive candidates can produce evidence.
- Chromium now locates and launches, so the harness can emit real browser evidence.

Suggested next step:

- Use the updated summaries as browser smoke evidence only.
- Do not enter adapter implementation until a separate adapter-specific guide explicitly authorizes it.
- Keep recast-navigation on RFC-013 hold.

Touched files:

- `docs/strategy/mature-dependency-browser-smoke/**`
- `spikes/mature-dependencies/**`

## Commits And Push

All commits below were pushed to `origin/codex/mature-dependency-browser-smoke-harness`:

- `c97d678` docs: start mature dependency browser smoke harness
- `e17abf5` docs: audit browser smoke playwright environment
- `648db2e` spike: add browser smoke playwright baseline
- `cfa3833` spike: define browser smoke result schema
- `ff81236` spike: add web audio browser smoke
- `8abd25e` spike: add dexie indexeddb browser smoke
- `a8ca6cd` spike: add comlink worker browser smoke
- `9907cdd` spike: add dev-only diagnostics browser smoke
- `16c78a6` spike: add wasm browser smoke evidence
- `f3c9f3b` fix: stabilize mature dependency browser smoke harness
- `9e11d33` docs: reconcile browser smoke reports
- Final report commit: recorded by final branch history after this document is committed.

## Handoff

This goal produced a reusable isolated browser smoke harness and normalized reports. After the environment repair pass, the harness now has real Playwright Chromium evidence for browser-sensitive candidates, with recast-navigation still intentionally skipped by policy.

After the environment is repaired, the same branch can be resumed by running:

```powershell
npm --prefix spikes\mature-dependencies run check
npm --prefix spikes\mature-dependencies run smoke:browser
```

Future implementation still requires a separate adapter-specific guide and explicit approval for any root dependency or mainline source change.
