# Mature Dependency WorkerTaskAdapter Spike

Date: 2026-06-22
Branch: `codex/mature-dependency-worker-task-adapter-spike`
Base: `origin/codex/mature-dependency-storage-adapter-spike`
Status: Round 1 handoff entry

## Scope

This goal implements an isolated WorkerTaskAdapter spike inside the mature dependency spike package. It is evidence for a future implementation guide, not production integration approval.

The spike may define and test a Sinan-shaped worker task contract, a deterministic fake/main-thread adapter, a Comlink / Web Worker adapter, browser smoke evidence, reports, and validation scripts under the allowed paths only.

## Non-Scope

- No Sinan mainline `src/**` changes.
- No Sinan mainline `data/**` changes.
- No Sinan mainline `tests/**` changes.
- No Sinan mainline `public/**` changes.
- No root `package.json`, lockfile, Vite, TypeScript, Vitest, or workflow config changes.
- No production `WorkerTask` runtime, plugin SDK, asset pipeline, navigation build, physics job, audio decode job, or storage migration job.
- No editor store, React state, runtime world, Three.js object, Rapier handle, Web Audio node, Dexie object, DOM node, or live project object in worker payloads.
- No worker task connection to Phase 20, Phase 21, Phase 22, Phase 23, or Phase 24 mainline work.

## Inputs

- `docs/rfcs/RFC-010-worker-task-boundary.md`
- `docs/rfcs/RFC-011-wasm-bundle-dependency-policy.md`
- `docs/rfcs/RFC-012-dev-only-diagnostics-policy.md`
- `docs/strategy/mature-dependency-contracts/adapter-compatibility-matrix.md`
- `docs/strategy/mature-dependency-contracts/final-contract-rfc-pack-report.md`
- `docs/strategy/mature-dependency-spikes/comlink-worker-evaluation.md`
- `docs/strategy/mature-dependency-browser-smoke/browser-smoke-results.md`
- `spikes/mature-dependencies/reports/browser-smoke/comlink-worker-summary.json`
- `spikes/mature-dependencies/src/workers/comlink-smoke.ts`
- `spikes/mature-dependencies/src/workers/comlink-worker.ts`
- `spikes/mature-dependencies/src/browser-smoke/comlink-worker.pw.ts`
- `docs/strategy/mature-dependency-storage-adapter-spike/final-storage-adapter-spike-report.md`
- `spikes/mature-dependencies/src/storage-adapter/run-storage-smoke.mjs`

The worker task goal guide is currently a handoff document in the main Sinan workspace. Do not copy it into this branch or rewrite it under a non-allowed path.

## Evidence Baseline

RFC-010 accepts a Sinan-owned `WorkerTaskAdapter` boundary. The compatibility matrix marks `WorkerTaskAdapter` / Comlink as `adapter-spike-ready`, which permits an isolated spike but not direct dependency adoption or mainline source integration.

The browser smoke harness has real Playwright Chromium evidence for raw Comlink / Worker behavior:

- Comlink / Worker status: `PASS`.
- Browser port: `5184`; port `5174` is not used.
- Evidence file: `spikes/mature-dependencies/reports/browser-smoke/comlink-worker-summary.json`.
- Evidence includes Worker support, Vite module worker URL, RPC success, transferable payload detach, diagnostic error mapping, and terminate/dispose.

That evidence is a prerequisite only. This spike must prove the same path through `WorkerTaskAdapter`, not raw Comlink.

## Boundary Principle

```txt
Sinan owns task registry, task ids, payload schemas, diagnostics,
scheduling policy, timeout/cancellation/stale policy, fallback policy,
and result semantics.

Comlink owns RPC ergonomics only.

Web Worker owns thread isolation only.

Workers receive snapshots or copies, never live editor/runtime/project objects.

data/**/*.json remains the canonical source-of-truth.
```

## Allowed Paths

- `spikes/mature-dependencies/**`
- `docs/strategy/mature-dependency-worker-task-adapter-spike/**`

## Forbidden Paths

- root `package.json`
- root `package-lock.json`
- root Vite / TypeScript / Vitest config
- `src/**`
- `data/**`
- `tests/**`
- `public/**`
- `.codex/**`
- Phase 20 / Phase 21 / Phase 22 / Phase 23 / Phase 24 files
- `spikes/mature-dependencies/node_modules/**`
- `spikes/mature-dependencies/dist/**`
- `spikes/mature-dependencies/coverage/**`
- `spikes/mature-dependencies/test-results/**`
- `spikes/mature-dependencies/playwright-report/**`
- Playwright traces, videos, screenshots, browser binaries, and cache folders

## Required Validation Commands

Round-level validation starts with:

```powershell
git status --short --branch
Test-Path docs\rfcs\RFC-010-worker-task-boundary.md
Test-Path docs\strategy\mature-dependency-spikes\comlink-worker-evaluation.md
Test-Path spikes\mature-dependencies\reports\browser-smoke\comlink-worker-summary.json
Test-Path docs\strategy\mature-dependency-worker-task-adapter-spike\README.md
git diff --check
```

Later rounds must also pass:

```powershell
npm --prefix spikes\mature-dependencies run check
npm --prefix spikes\mature-dependencies run smoke:browser
npm --prefix spikes\mature-dependencies run smoke:worker-task
```

## Artifact Policy

Commit source files, Markdown reports, small JSON summaries, and isolated package scripts only. Do not commit generated browser caches, Playwright traces, screenshots, videos, `dist/**`, `coverage/**`, `test-results/**`, `playwright-report/**`, or `node_modules/**`.

Existing uncommitted browser-smoke and storage-adapter JSON timestamp changes may be present from acceptance validation. They are validation artifacts and must not be mixed into WorkerTaskAdapter round commits unless a later round intentionally updates worker-task evidence.

## Round Plan

This guide uses 12 rounds:

- Round 1: branch isolation and README.
- Round 2: WorkerTask contract types, statuses, diagnostics.
- Round 3: task registry, validators, fixture tasks.
- Round 4: fake/main-thread adapter and contract tests.
- Round 5: Comlink worker host and adapter lifecycle.
- Round 6: timeout, cancellation, stale result, queue overflow.
- Round 7: transferable and serialization policy.
- Round 8: browser smoke through WorkerTaskAdapter.
- Round 9: boundary guard, aggregate smoke script, reports.
- Round 10: buffer fixes.
- Round 11: report consistency and review feedback.
- Round 12: final validation and handoff report.
