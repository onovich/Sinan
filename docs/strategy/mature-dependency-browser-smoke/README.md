# Mature Dependency Browser Smoke Harness

Date: 2026-06-21
Branch: `codex/mature-dependency-browser-smoke-harness`
Base: `origin/codex/mature-dependency-adapter-contract-rfcs`
Recommended browser-smoke port: `5184`

## Scope

This goal turns the browser smoke requirements from the mature dependency contract pack into a repeatable isolated validation harness.

The harness is evidence only. A browser smoke PASS proves that a candidate can be exercised in a controlled browser environment; it does not approve production runtime integration, root dependency changes, source changes, schema changes, or hard dependency promotion.

## Non-Scope

- Do not implement a production `PhysicsSystem`, `AudioSystem`, `StorageAdapter`, `AssetPipeline`, `WorkerTask` runtime, or `NavigationSystem`.
- Do not modify Sinan mainline `src/**`, `data/**`, `tests/**`, `public/**`, root package files, root config files, `.codex/**`, or Phase 20/21 files.
- Do not use mainline dev server port `5174`.
- Do not commit Playwright browser binaries, cache folders, traces, videos, screenshots, `dist/**`, `coverage/**`, or `node_modules/**`.
- Do not change recast-navigation from `hold-for-rfc`.

## Input Contracts

- `docs/strategy/mature-dependency-contracts/browser-smoke-environment-policy.md`
- `docs/strategy/mature-dependency-contracts/final-contract-rfc-pack-report.md`
- `docs/strategy/mature-dependency-contracts/adapter-compatibility-matrix.md`
- `docs/rfcs/RFC-006-physics-adapter-boundary.md`
- `docs/rfcs/RFC-007-audio-system-boundary.md`
- `docs/rfcs/RFC-008-storage-save-boundary.md`
- `docs/rfcs/RFC-009-asset-pipeline-boundary.md`
- `docs/rfcs/RFC-010-worker-task-boundary.md`
- `docs/rfcs/RFC-011-wasm-bundle-dependency-policy.md`
- `docs/rfcs/RFC-012-dev-only-diagnostics-policy.md`
- `docs/rfcs/RFC-013-navigation-adapter-hold-policy.md`
- `docs/strategy/mature-dependency-spikes/final-readiness-report.md`
- `spikes/mature-dependencies/package.json`

## Required Outputs

- `docs/strategy/mature-dependency-browser-smoke/environment-audit.md`
- `docs/strategy/mature-dependency-browser-smoke/browser-smoke-results.md`
- `docs/strategy/mature-dependency-browser-smoke/final-browser-smoke-harness-report.md`
- `spikes/mature-dependencies/playwright.config.ts`
- `spikes/mature-dependencies/src/browser-smoke/**`
- `spikes/mature-dependencies/reports/browser-smoke/**`
- Browser smoke scripts in `spikes/mature-dependencies/package.json`

## Candidate Status Enum

Each browser-sensitive candidate must end with one of these statuses:

- `PASS`: repeatable browser smoke succeeded and emitted normalized evidence.
- `POLICY-SKIP`: smoke was intentionally skipped because an RFC or policy blocks the candidate.
- `ENVIRONMENT-BLOCKED`: local Playwright, Chromium, server, port, permission, or network environment prevents a repeatable run.
- `BUNDLE-BLOCKED`: browser bundling, worker URL, WASM asset path, or production exclusion could not be proven.
- `CANDIDATE-BLOCKED`: the candidate dependency failed to initialize or behave as required.
- `CONTRACT-BLOCKED`: the candidate would require crossing a Sinan architecture boundary.

## Allowed Paths

- `spikes/mature-dependencies/**`
- `docs/strategy/mature-dependency-browser-smoke/**`

## Forbidden Paths

- root `package.json`
- root `package-lock.json`
- root Vite, TypeScript, and Vitest config files
- `src/**`
- `data/**`
- `tests/**`
- `public/**`
- `.codex/**`
- Phase 20 / Phase 21 implementation files
- `spikes/mature-dependencies/node_modules/**`
- `spikes/mature-dependencies/dist/**`
- `spikes/mature-dependencies/coverage/**`
- Playwright browser binaries, cache, traces, videos, and screenshots

## Round Plan

| Round | Scope |
| --- | --- |
| 1 | Branch isolation and browser smoke README |
| 2 | Playwright / Chromium environment audit |
| 3 | Vite browser smoke runner and Playwright baseline |
| 4 | Result schema and artifact policy |
| 5 | Web Audio browser smoke |
| 6 | Dexie / IndexedDB browser smoke |
| 7 | Comlink / Web Worker browser smoke |
| 8 | Spector dev-only guard and production exclusion smoke |
| 9 | Rapier / WASM smoke and recast policy-skip |
| 10 | Buffer: environment, port, flaky, and artifact fixes |
| 11 | Buffer: report consistency and review feedback |
| 12 | Final validation and handoff report |

## Boundary Principle

```txt
Browser smoke proves environment and adapter-candidate behavior.
Browser smoke does not approve production integration.
Sinan contracts remain the authority.
External browser APIs and packages remain replaceable implementation details.
```
