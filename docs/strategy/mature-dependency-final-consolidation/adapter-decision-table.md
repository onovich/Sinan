# Mature Dependency Adapter Decision Table

Date: 2026-06-22
Status: final consolidation decision table

## Decision Rules

This table mirrors `docs/strategy/mature-dependency-contracts/adapter-compatibility-matrix.md`.

Accepted evidence means the isolated spike, RFC, or policy phase met its validation target. It does not approve direct production dependency adoption, root package changes, runtime/editor integration, generated artifact source-of-truth changes, or Phase 20/21 scope changes.

## Consolidated Table

| Module | Candidate dependency | Current status | Accepted evidence | Fallback or exit | Future gate | Not authorized |
| --- | --- | --- | --- | --- | --- | --- |
| `PhysicsAdapter` | Rapier JS/WASM | `accept-for-contract` | Physics report and browser/aggregate smoke evidence cover fixed-step shape, rigid body movement, collider queries, and deterministic adapter contract behavior. | Null physics adapter with no dynamic collision and a visible diagnostic reason. | Future implementation guide must re-approve RFC-006/RFC-011 scope, browser WASM loading, bundle budget, rollback, and authored JSON ownership. | No mainline physics runtime, root dependency, WASM package, or `src/**` integration is approved by this packet. |
| `AudioSystem` | Web Audio API first, optional wrapper later | `accept-for-contract` | Audio report and browser smoke evidence cover command sequencing and adapter reporting; real unlock/autoplay remains governed by browser policy. | Silent audio system with visible diagnostics while timeline completion remains stable. | Future implementation guide must prove browser unlock, decode, spatial panner, scheduling, fallback behavior, and timeline cue ownership. | No production AudioSystem integration, package/config change, or runtime cue execution path is approved here. |
| `StorageAdapter` | Dexie / IndexedDB | `accept-for-contract` | Storage report covers CRUD, versioned stores, export/import shape, cleanup, and IndexedDB smoke evidence. | In-memory volatile storage with quota/error diagnostic. | Future implementation guide must cover RFC-008 migration ownership, private-mode/quota failure, upgrade/downgrade handling, export, and canonical `data/**/*.json` boundaries. | IndexedDB is not promoted as JSON source of truth; no root dependency or save-system integration is approved. |
| `AssetPipelineAdapter` | glTF Transform and meshoptimizer | `adapter-spike-ready` | Asset pipeline report and repair evidence cover offline inspect/build/rebuild reports, normalized path policy, and generated artifact guard behavior. | Raw asset pass-through with explicit budget warning. | Future implementation guide must authorize root package/config paths, generated artifact policy, artifact diffs, source asset ownership, cleanup, and CI validation. | No runtime asset loader, generated GLB truth, package dependency, or mainline build pipeline is approved. |
| `WorkerTaskAdapter` | Comlink | `adapter-spike-ready` | Worker task report covers worker RPC ergonomics, browser smoke, error propagation, repeatable aggregate smoke, and artifact cleanup. | Main-thread task runner for small jobs with performance warning. | Future implementation guide must define registered tasks, worker URL bundling, transfer policy, cancellation, timeout, error mapping, and fallback behavior. | No mainline worker transport, task registry, bundler config, or production worker dependency is approved. |
| `DiagnosticsAdapter` | Spector.js plus Performance API | `dev-only` | Diagnostics report and repair evidence cover dev-only adapter contract, production exclusion guard, disabled-by-default behavior, and artifact-clean validation. | Diagnostics unavailable state. | Future implementation guide must prove lazy/dynamic loading, production bundle exclusion, debug UI authorization, capture retention, and no data semantics. | No production diagnostics, always-on capture, runtime dependency, or player behavior is approved. |
| `NavigationAdapter` | recast-navigation / Recast WASM, or simpler fallback candidate | `hold-for-showcase` | Navigation RFC resolution report defines RFC-014 boundary, fallback states, generated artifact policy, and browser/WASM gates. Prior recast evidence remains non-implementation evidence. | No navigation service; static waypoint graph, grid/approximate fallback, or straight-line editor preview only when separately approved. | Future implementation must wait for a named showcase/gameplay acceptance case, RFC-014 architect acceptance, RFC-011 dependency/bundle approval, browser/WASM smoke, path query proof, reload/cache proof, fallback failure proof, disposal, and bundle budget. | Navigation is not adapter-spike-ready; no recast import, WASM dependency, navmesh generation, root package change, or runtime navigation service is approved. |

## Status Interpretation

- `accept-for-contract` accepts the contract direction only.
- `adapter-spike-ready` allows a future isolated spike guide, not mainline adoption.
- `dev-only` is an explicit production boundary.
- `hold-for-showcase` is a stop sign for implementation until a named showcase/gameplay case exists.

## Future Guide Requirement

Every future adapter implementation must be created as a separate architect-approved guide with explicit paths, validation commands, rollback plan, and package/config authorization. This final table is not an implementation guide.
