# Mature Dependency Adapter Contract RFC Pack

Date: 2026-06-21
Branch: `codex/mature-dependency-adapter-contract-rfcs`
Base evidence: `origin/codex/mature-dependency-spikes`

## Scope

This contract pack converts the accepted mature dependency spike reports into Sinan-owned architecture contracts for Phase 21.5 review.

The work is documentation and architecture-contract work only. It creates RFCs, policies, and a compatibility matrix. It does not integrate runtime code or promote any candidate package into Sinan mainline dependencies.

## Non-Scope

- Do not implement `PhysicsSystem`, `AudioSystem`, `StorageAdapter`, `AssetPipeline`, `WorkerTask` runtime, or `NavigationSystem`.
- Do not modify root `package.json`, root `package-lock.json`, root Vite/TypeScript/Vitest config, `src/**`, `data/**`, `tests/**`, `public/**`, or `.codex/**`.
- Do not install, upgrade, or approve root dependencies.
- Do not touch Phase 20/21 implementation files.
- Do not request mainline executor changes.

## Input Evidence

- `docs/strategy/mature-dependency-spikes/final-readiness-report.md`
- `docs/strategy/mature-dependency-spikes/dependency-installation-audit.md`
- `docs/strategy/mature-dependency-spikes/rapier-evaluation.md`
- `docs/strategy/mature-dependency-spikes/web-audio-evaluation.md`
- `docs/strategy/mature-dependency-spikes/dexie-evaluation.md`
- `docs/strategy/mature-dependency-spikes/gltf-transform-evaluation.md`
- `docs/strategy/mature-dependency-spikes/spector-evaluation.md`
- `docs/strategy/mature-dependency-spikes/comlink-worker-evaluation.md`
- `docs/strategy/mature-dependency-spikes/recast-navigation-evaluation.md`

## Output Documents

- `docs/strategy/mature-dependency-contracts/adapter-compatibility-matrix.md`
- `docs/strategy/mature-dependency-contracts/browser-smoke-environment-policy.md`
- `docs/strategy/mature-dependency-contracts/final-contract-rfc-pack-report.md`
- `docs/rfcs/RFC-006-physics-adapter-boundary.md`
- `docs/rfcs/RFC-007-audio-system-boundary.md`
- `docs/rfcs/RFC-008-storage-save-boundary.md`
- `docs/rfcs/RFC-009-asset-pipeline-boundary.md`
- `docs/rfcs/RFC-010-worker-task-boundary.md`
- `docs/rfcs/RFC-011-wasm-bundle-dependency-policy.md`
- `docs/rfcs/RFC-012-dev-only-diagnostics-policy.md`
- `docs/rfcs/RFC-013-navigation-adapter-hold-policy.md`

## Allowed Paths

- `docs/rfcs/**`
- `docs/strategy/mature-dependency-contracts/**`

## Forbidden Paths

- `src/**`
- `data/**`
- `tests/**`
- `public/**`
- `package.json`
- `package-lock.json`
- `vite.config.*`
- `tsconfig.*`
- `.codex/**`
- `spikes/mature-dependencies/node_modules/**`
- `spikes/mature-dependencies/dist/**`
- `spikes/mature-dependencies/coverage/**`

## Round Budget

| Round | Scope |
| --- | --- |
| 1 | Branch isolation and contract pack README |
| 2 | Compatibility matrix and shared status enum |
| 3 | RFC-006 Physics Adapter Boundary |
| 4 | RFC-007 Audio System Boundary |
| 5 | RFC-008 Storage / Save Boundary |
| 6 | RFC-009 Asset Pipeline Boundary |
| 7 | RFC-010 WorkerTask Boundary |
| 8 | RFC-011 WASM / Bundle / Dependency Policy |
| 9 | RFC-012 Diagnostics, RFC-013 Navigation, browser smoke policy |
| 10 | Cross-RFC consistency reconciliation |
| 11 | Review-feedback/reference finalization buffer |
| 12 | Final validation and handoff report |

## Contract Principle

```txt
Sinan owns schemas, registries, runtime semantics, validation, diagnostics, and adapter contracts.
External mature dependencies own difficult algorithms, browser/platform behavior, or dev-only capture tooling.
External object handles never enter Sinan JSON, data source-of-truth, editor command state, or public engine DSL.
```
