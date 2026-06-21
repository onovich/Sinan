# Mature Dependency Browser Smoke Harness Final Report

Date: 2026-06-21
Branch: `codex/mature-dependency-browser-smoke-harness`
Base: `origin/codex/mature-dependency-adapter-contract-rfcs`
Head before final report commit: `9e11d33`

## Status

BLOCKED.

The isolated browser smoke harness, Playwright config, browser smoke cases, result schema, reports, and handoff documents were created and pushed. However, this goal cannot be marked PASS because Playwright-managed Chromium 1228 / Headless Shell 1228 could not be installed or launched in the current environment.

The blocker is classified as `ENVIRONMENT-BLOCKED`, not candidate failure and not contract failure.

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
| Browser install result | `ENVIRONMENT-BLOCKED`; `npm exec -- playwright install chromium` timed out in this round, with previous spike evidence also recording a 304 second timeout. |
| Browser launch result | `ENVIRONMENT-BLOCKED`; expected executables under `C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1228` and `chromium_headless_shell-1228` were missing. |
| Existing cache | Older `chromium-1217` and `chromium_headless_shell-1217` only. |
| Port | `5184`; port `5174` not used. |
| Headless/headed | Headless default, headed wrapper available through `smoke:browser:headed`. |

## Candidate Summary

| Candidate | Status | Browser evidence | Main blocker or risk | Next gate |
| --- | --- | --- | --- | --- |
| Browser baseline | `ENVIRONMENT-BLOCKED` | `browser-baseline-summary.json` | Missing Playwright Chromium executable. | Environment repair. |
| Web Audio | `ENVIRONMENT-BLOCKED` | `web-audio-summary.json` | AudioContext unlock/autoplay cannot run until Chromium launches. | RFC-007 plus browser smoke policy. |
| Dexie / IndexedDB | `ENVIRONMENT-BLOCKED` | `dexie-indexeddb-summary.json` | IndexedDB quota/reload/cleanup cannot run until Chromium launches. | RFC-008 plus browser smoke policy. |
| Comlink / Worker | `ENVIRONMENT-BLOCKED` | `comlink-worker-summary.json` | Worker URL/RPC/transferable smoke cannot run until Chromium launches. | RFC-010 plus browser smoke policy. |
| Spector.js | `ENVIRONMENT-BLOCKED` | `spector-dev-only-summary.json` | Dev-only browser guard cannot run until Chromium launches. Production static exclusion check found no `spectorjs` or `SPECTOR` matches in `dist/**`. | RFC-012 plus RFC-011 production exclusion. |
| Rapier / WASM | `ENVIRONMENT-BLOCKED` | `rapier-wasm-summary.json` | WASM init, dynamic import, and bundle path cannot run until Chromium launches. | RFC-006 plus RFC-011. |
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
| `npm exec -- playwright install chromium` from `spikes/mature-dependencies` | `ENVIRONMENT-BLOCKED`, timed out. |
| `npm --prefix spikes\mature-dependencies run check` | PASS. |
| `npm --prefix spikes\mature-dependencies run smoke:browser` | Completed repeatably and emitted normalized `ENVIRONMENT-BLOCKED` / `POLICY-SKIP` summaries. It cannot be interpreted as browser PASS while Chromium is missing. |
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

## Blocker

Blocker: Playwright-managed Chromium install and launch unavailable.

Candidate: all browser-sensitive candidates except recast-navigation.

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
npm exec -- playwright install chromium
node -e "import('playwright').then(async ({chromium})=>{const browser=await chromium.launch({headless:true}); console.log(browser.version()); await browser.close();})"
```

Observed result:

- Playwright CLI is available.
- Browser install timed out.
- Browser launch reports missing Playwright-managed Chromium / Headless Shell executables.

Expected result:

- `playwright install chromium` completes.
- `chromium.launch({ headless: true })` starts and reports a browser version.
- `npm --prefix spikes\mature-dependencies run smoke:browser` runs actual page/candidate tests.

Why this blocks:

- The guide requires Playwright Chromium to install, locate, and launch before the goal can be PASS.
- Browser-sensitive candidates cannot produce real browser evidence without this environment.

Suggested next step:

- Repair the Playwright browser installation environment or provide an approved cached Chromium 1228 / Headless Shell 1228 payload.
- Re-run `npm --prefix spikes\mature-dependencies run smoke:browser`.
- If it launches, update the JSON summaries and this report from BLOCKED to the appropriate candidate statuses.

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

This goal produced a reusable isolated browser smoke harness and normalized reports, but the goal is BLOCKED on Playwright Chromium environment repair. Future adapter implementation guides must not consume these results as browser PASS evidence.

After the environment is repaired, the same branch can be resumed by running:

```powershell
npm --prefix spikes\mature-dependencies run check
npm --prefix spikes\mature-dependencies run smoke:browser
```

Future implementation still requires a separate adapter-specific guide and explicit approval for any root dependency or mainline source change.
