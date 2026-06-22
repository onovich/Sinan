# Mature Dependency PhysicsAdapter Spike

Date: 2026-06-22
Branch: `codex/mature-dependency-physics-adapter-spike`
Base: `origin/codex/mature-dependency-audio-system-spike`

## Scope

This branch is an isolated mature-dependency spike for a Sinan-shaped `PhysicsAdapter`.
It evaluates Rapier JS/WASM behind an adapter boundary and produces evidence only inside the spike package.

Allowed committed paths:

- `spikes/mature-dependencies/**`
- `docs/strategy/mature-dependency-physics-adapter-spike/**`

## Non-Scope

This spike does not approve or implement mainline physics.

Forbidden paths and work:

- Sinan mainline `src/**`, `data/**`, `tests/**`, `public/**`
- root `package.json`, lockfiles, Vite/TypeScript/Vitest config, `.codex/**`, `Role.md`
- Phase 20/21/22/23/24/25 documents or reports
- production gameplay physics, navigation, controller, delivery, multiplayer, route feedback, or camera integration
- canonical JSON schema changes for physics authoring
- Rapier class names, enum values, handles, package paths, WASM paths, or version details in authored data

## Architecture Inputs

Required policy and evidence:

- `docs/rfcs/RFC-006-physics-adapter-boundary.md`
- `docs/rfcs/RFC-011-wasm-bundle-dependency-policy.md`
- `docs/rfcs/RFC-013-navigation-adapter-hold-policy.md`
- `docs/strategy/mature-dependency-contracts/adapter-compatibility-matrix.md`
- `docs/strategy/mature-dependency-spikes/rapier-evaluation.md`
- `docs/strategy/mature-dependency-browser-smoke/browser-smoke-results.md`
- `spikes/mature-dependencies/reports/browser-smoke/rapier-wasm-summary.json`
- `docs/strategy/mature-dependency-audio-system-spike/final-audio-system-spike-report.md`

## Boundary Principle

Sinan owns body and collider descriptors, fixed-step policy, query and event result semantics, diagnostics, fallback, and authored physics intent.

Rapier owns WASM initialization, internal world allocation, rigid body and collider handles, solver details, contact manifolds, raycast internals, and disposal only.

Public adapter results must use stable Sinan ids, world-space data, lifecycle states, result statuses, and diagnostic codes. Raw Rapier handles or objects must not leave the adapter.

## Evidence Baseline

The existing raw Rapier browser smoke is PASS:

- package: `@dimforge/rapier3d-compat`
- browser port: `5184`
- dynamic import base package in browser: intentionally skipped so base `@dimforge/rapier3d` does not enter the Vite browser graph
- exercised evidence: WASM init, world step, dynamic body motion, raycast hit, contact event, trigger event

This baseline is not sufficient for production integration. This spike must prove the same path through a `PhysicsAdapter` contract, not by directly reusing raw Rapier smoke as approval.

## Planned Deliverables

- `spikes/mature-dependencies/src/physics-adapter/**`
- `spikes/mature-dependencies/src/browser-smoke/physics-adapter.pw.ts`
- `spikes/mature-dependencies/reports/browser-smoke/physics-adapter-summary.json`
- `spikes/mature-dependencies/reports/physics-adapter/**`
- `docs/strategy/mature-dependency-physics-adapter-spike/physics-adapter-contract-notes.md`
- `docs/strategy/mature-dependency-physics-adapter-spike/physics-adapter-browser-smoke-results.md`
- `docs/strategy/mature-dependency-physics-adapter-spike/physics-adapter-evidence-matrix.md`
- `docs/strategy/mature-dependency-physics-adapter-spike/physics-adapter-bundle-policy-notes.md`
- `docs/strategy/mature-dependency-physics-adapter-spike/final-physics-adapter-spike-report.md`

## Round Plan

| Round | Target |
| --- | --- |
| 1 | Branch isolation and this README |
| 2 | PhysicsAdapter contract types, statuses, diagnostics |
| 3 | Body/collider normalization and layer/mask policy |
| 4 | Null/fake adapter, fixed-step sequencing, fallback diagnostics |
| 5 | Rapier compat adapter lifecycle, WASM init, id-to-handle ownership |
| 6 | Rigid bodies, colliders, step transforms, disposal |
| 7 | Collision and trigger event normalization |
| 8 | Raycast and overlap query API |
| 9 | Browser smoke through PhysicsAdapter, aggregate smoke, bundle notes |
| 10 | Buffer round for WASM/browser cleanup or flake repair |
| 11 | Buffer round for report consistency and review feedback |
| 12 | Final validation and handoff report |

## Validation Commands

Round-level validation will use the commands named in the execution guide. Final validation must include:

```powershell
npm --prefix spikes\mature-dependencies run check
npm --prefix spikes\mature-dependencies run smoke:browser
npm --prefix spikes\mature-dependencies run smoke:physics-adapter
git diff --check
git status --short --branch
```

## Artifact Policy

Committed artifacts may include small JSON summaries, Markdown reports, smoke source, and package scripts inside the spike package.

Do not commit Playwright traces, videos, screenshots, browser binaries, cache folders, `dist/**`, `coverage/**`, `node_modules/**`, `test-results/**`, or `playwright-report/**`.
