# Mature Dependency Browser Smoke Results

Date: 2026-06-21
Branch: `codex/mature-dependency-browser-smoke-harness`
Port policy: use `5184`, never `5174`
Status: partial harness, environment currently blocked by missing Playwright Chromium 1228 payload

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
| Browser baseline | `ENVIRONMENT-BLOCKED` | `browser-baseline-summary.json` records missing Playwright Chromium executable on port `5184`. | Playwright 1.61 requires Chromium 1228 / Headless Shell 1228, but cache only had older 1217 payloads after install timeout. | Environment repair before candidate PASS. |
| Web Audio | `ENVIRONMENT-BLOCKED` | `web-audio-summary.json` records that AudioContext unlock, autoplay, fallback, and diagnostic smoke are blocked by missing Playwright Chromium. | Real browser cannot launch yet. | RFC-007 plus browser smoke policy. |
| Dexie / IndexedDB | `ENVIRONMENT-BLOCKED` | `dexie-indexeddb-summary.json` records that Dexie, IndexedDB, quota, reload, cleanup, export, and import smoke are blocked by missing Playwright Chromium. | Real browser cannot launch yet. | RFC-008 plus browser smoke policy. |
| Comlink / Worker | `ENVIRONMENT-BLOCKED` | `comlink-worker-summary.json` records that Comlink, Worker, worker URL, transferable, diagnostic error mapping, and terminate smoke are blocked by missing Playwright Chromium. | Real browser cannot launch yet. | RFC-010 plus browser smoke policy. |
| Spector.js | `ENVIRONMENT-BLOCKED` | `spector-dev-only-summary.json` records that Spector dev-only dynamic import guard is blocked by missing Playwright Chromium, with production static exclusion diagnostics after build. | Real browser cannot launch yet; must also remain `dev-only` and excluded from production behavior. | RFC-012 plus RFC-011 production exclusion. |
| Rapier / WASM | `ENVIRONMENT-BLOCKED` | `rapier-wasm-summary.json` records that Rapier dynamic import, WASM init, minimal world step, reload, and bundle path smoke are blocked by missing Playwright Chromium. | Real browser cannot launch yet; WASM/bundle path still unproven. | RFC-006 plus RFC-011. |
| recast-navigation | `POLICY-SKIP` | `recast-policy-skip-summary.json` records RFC-013 hold. | Navigation remains `hold-for-rfc`; no browser smoke result can promote it in this goal. | Dedicated navigation RFC before implementation. |

Storage boundary note: Dexie / IndexedDB smoke can only prove a browser-local persistence surface. It does not move source-of-truth away from canonical `data/**/*.json`, repository schemas, or migrations.
