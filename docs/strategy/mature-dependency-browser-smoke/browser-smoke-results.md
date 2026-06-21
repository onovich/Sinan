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
| Web Audio | `ENVIRONMENT-BLOCKED` | Pending candidate smoke. | Real browser cannot launch yet. | RFC-007 plus browser smoke policy. |
| Dexie / IndexedDB | `ENVIRONMENT-BLOCKED` | Pending candidate smoke. | Real browser cannot launch yet. | RFC-008 plus browser smoke policy. |
| Comlink / Worker | `ENVIRONMENT-BLOCKED` | Pending candidate smoke. | Real browser cannot launch yet. | RFC-010 plus browser smoke policy. |
| Spector.js | `ENVIRONMENT-BLOCKED` | Pending candidate smoke. | Real browser cannot launch yet; must also remain `dev-only`. | RFC-012 plus RFC-011 production exclusion. |
| Rapier / WASM | `ENVIRONMENT-BLOCKED` | Pending candidate smoke. | Real browser cannot launch yet; WASM/bundle path still unproven. | RFC-006 plus RFC-011. |
| recast-navigation | `POLICY-SKIP` | Not run. | RFC-013 keeps navigation on hold. | Dedicated navigation RFC before implementation. |
