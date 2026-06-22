# Mature Dependency Browser Smoke Results

Date: 2026-06-22
Branch: `codex/mature-dependency-browser-smoke-harness`
Port policy: use `5184`, never `5174`
Status: browser smoke harness resumed after Playwright Chromium 1228 payload repair

## Result Status Enum

| Status | Meaning |
| --- | --- |
| `PASS` | Repeatable browser smoke succeeded and emitted normalized evidence. |
| `POLICY-SKIP` | Smoke was intentionally skipped because an RFC or policy blocks the candidate. |
| `ENVIRONMENT-BLOCKED` | Playwright, Chromium, server, port, permission, or network environment prevents a repeatable run. |
| `BUNDLE-BLOCKED` | JS chunk, worker URL, WASM asset path, cache, or production exclusion could not be proven. |
| `CANDIDATE-BLOCKED` | Candidate package failed to initialize or behave as required. |
| `CONTRACT-BLOCKED` | Candidate would require crossing a Sinan-owned architecture boundary. |

## Normalized JSON Fields

Each committed summary under `spikes/mature-dependencies/reports/browser-smoke/**` must use these fields:

- `candidate`
- `status`
- `decision`
- `layer`
- `browser`
- `port`
- `durationMs`
- `command`
- `consoleErrors`
- `artifacts`
- `diagnostics`
- `timestamp`

## Artifact Policy

Commit:

- small JSON summaries
- Markdown reports
- browser smoke source files
- Playwright config

Do not commit:

- Playwright browser binaries
- Playwright cache folders
- traces
- videos
- screenshots
- `dist/**`
- `coverage/**`
- `node_modules/**`

## Current Results

| Candidate | Status | Browser evidence | Main blocker or risk | Next gate |
| --- | --- | --- | --- | --- |
| Browser baseline | `PASS` | `browser-baseline-summary.json` records Playwright Chromium loading the isolated registry on port `5184`. | None for browser environment baseline. | Adapter-specific implementation guide still required before production integration. |
| Web Audio | `PASS` | `web-audio-summary.json` records AudioContext support, unlock behavior, fallback diagnostics, and playback state in Chromium. | Browser API support proven only in the isolated harness. | RFC-007 plus a future `AudioSystem` adapter contract. |
| Dexie / IndexedDB | `PASS` | `dexie-indexeddb-summary.json` records IndexedDB availability, Dexie write/read/reload/cleanup/export/import evidence. | Browser-local persistence only; canonical `data/**/*.json` remains the source of truth. | RFC-008 plus storage/save adapter contract. |
| Comlink / Worker | `PASS` | `comlink-worker-summary.json` records Worker support, RPC, transferable payload, diagnostic error mapping, and terminate behavior. | Worker implementation must remain behind a Sinan-owned task contract. | RFC-010 plus WorkerTask adapter contract. |
| Spector.js | `PASS` | `spector-dev-only-summary.json` records that Spector remains disabled by default and only loads through the dev-only dynamic import path. | Dev-only diagnostic package must stay out of production behavior. | RFC-012 plus RFC-011 production exclusion. |
| Rapier / WASM | `PASS` | `rapier-wasm-summary.json` records compat package init, WASM-backed world step, raycast, contact, and trigger evidence in Chromium. | Base `@dimforge/rapier3d` remains a separate packaging decision; browser smoke exercises `@dimforge/rapier3d-compat` without pulling the base package into the Vite graph. | RFC-006 plus RFC-011 and a future PhysicsAdapter guide. |
| recast-navigation | `POLICY-SKIP` | `recast-policy-skip-summary.json` records RFC-013 hold. | Navigation remains `hold-for-rfc`; no browser smoke result can promote it in this goal. | Dedicated navigation RFC before implementation. |

Storage boundary note: Dexie / IndexedDB smoke can only prove a browser-local persistence surface. It does not move source-of-truth away from canonical `data/**/*.json`, repository schemas, or migrations.

## Round 10 Stabilization Notes

- The configured browser smoke port is `5184`; port `5174` is not used by this harness.
- `npm --prefix spikes\mature-dependencies run smoke:browser` remains repeatable while Chromium is missing; it emits normalized `ENVIRONMENT-BLOCKED` summaries instead of failing silently or claiming `PASS`.
- The harness commits only Markdown reports, source files, config, and small JSON summaries.
- Playwright traces, videos, screenshots, browser binaries, cache folders, `dist/**`, `coverage/**`, and `node_modules/**` remain non-committed artifacts.
- No new candidate was added in the buffer round.

## Round 11 Consistency Notes

No external review feedback was received during this execution pass. The consistency self-review checked that:

The following bullets describe the historical Round 11 state before the 2026-06-22 Chromium repair pass:

- Every browser-sensitive candidate has exactly one committed JSON summary under `spikes/mature-dependencies/reports/browser-smoke/**`.
- `browser-baseline`, Web Audio, Dexie / IndexedDB, Comlink / Worker, Spector.js, and Rapier / WASM are `ENVIRONMENT-BLOCKED` because Playwright Chromium 1228 cannot launch.
- `recast-navigation` is `POLICY-SKIP` because RFC-013 keeps NavigationAdapter on hold.
- `environment-audit.md` and this results file agree that the goal cannot be PASS until Playwright-managed Chromium installs and launches.
- No summary promotes a candidate to production integration, hard dependency status, or mainline `src/**` work.

## 2026-06-22 Environment Repair Notes

- Playwright Chromium 1228 and Headless Shell 1228 are now present in the user-level Playwright cache.
- `chromium.launch({ headless: true })` succeeds and reports browser version `149.0.7827.55`.
- `npm --prefix spikes\mature-dependencies run smoke:browser` now runs real browser tests and completes with 7 passed Playwright tests.
- The Rapier browser smoke skips the base `@dimforge/rapier3d` diagnostic import in browser runtime so the unsupported base package path does not enter the Vite graph. The exercised browser candidate is `@dimforge/rapier3d-compat`.
- The updated PASS summaries are browser evidence only. They do not authorize adapter implementation, root dependency changes, or Sinan mainline source changes.
