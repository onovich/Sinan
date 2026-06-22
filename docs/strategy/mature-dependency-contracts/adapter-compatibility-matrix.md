# Mature Dependency Adapter Compatibility Matrix

Date: 2026-06-21
Scope: docs-only adapter contract classification for the mature dependency spike branch.
Status: Draft contract matrix for RFC-006 through RFC-013.

## Status Enum

| Status | Meaning | Allowed next action |
| --- | --- | --- |
| `accept-for-contract` | Spike evidence supports a Sinan-owned adapter contract, but not direct dependency adoption. | Write or keep an RFC contract before implementation. |
| `adapter-spike-ready` | Contract is plausible and the next safe action is an isolated adapter spike. | Prepare a narrow implementation spike after RFC approval. |
| `dev-only` | Candidate may be used for diagnostics or tooling only. | Keep out of production runtime and data semantics. |
| `hold-for-rfc` | Candidate has useful evidence but needs another boundary RFC or policy before implementation. | Do not implement until the missing RFC is accepted. |
| `hold-for-showcase` | Candidate is better evaluated inside a specific playable/editor showcase. | Revisit when the showcase acceptance target exists. |
| `blocked` | Candidate cannot proceed because an environmental, licensing, browser, or architecture blocker remains. | Resolve blocker and update this matrix before any spike. |
| `reject` | Candidate should not be adopted for the current architecture. | Keep only as negative evidence. |

## Matrix

| Sinan contract | Candidate dependency | Prior spike evidence | Contract status | Runtime target | Browser smoke stance | Fallback stance | Approval gate | Exit strategy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PhysicsAdapter` | Rapier JS/WASM | Isolated smoke covered world stepping, rigid body movement, collider queries, and deterministic fixed-step shape. | `accept-for-contract` | Runtime world system behind adapter. | Required before mainline integration because WASM init and browser packaging must be proven outside docs. | Null physics adapter with no dynamic collision, plus diagnostic reason. | RFC-006 and RFC-011 accepted, then isolated adapter spike. | Remove adapter binding and keep authored JSON unchanged. |
| `AudioSystem` | Web Audio API first, optional wrappers later | Fake AudioContext smoke validated command sequencing; real browser unlock/autoplay remains a policy concern. | `accept-for-contract` | Runtime audio service and timeline cue playback. | Required for unlock, decode, spatial panner, and scheduling behavior. | Silent audio system with visible diagnostics and stable timeline completion. | RFC-007 accepted and browser smoke policy satisfied. | Keep `AudioCue` data; replace implementation behind service boundary. |
| `StorageAdapter` | Dexie / IndexedDB | Isolated Dexie smoke validated CRUD, versioned stores, export/import shape, and cleanup path. | `accept-for-contract` | Browser persistence for saves, drafts, cache metadata, and recent files. | Required for quota, upgrade, private-mode failure, and cleanup behavior. | In-memory volatile storage with quota/error diagnostic. | RFC-008 accepted and migration ownership documented. | Export saves, drop generated stores, preserve canonical `data/**/*.json`. |
| `AssetPipelineAdapter` | glTF Transform, meshoptimizer | Node-side smoke validated inspect/transform/report style without runtime imports. | `adapter-spike-ready` | Offline build or content pipeline only. | Optional for rendered output inspection; primary validation is artifact diff/report. | Raw asset pass-through plus budget warning. | RFC-009 and RFC-011 accepted before root dependency changes. | Remove generated artifacts and regenerate from source assets. |
| `WorkerTaskAdapter` | Comlink | Smoke validated worker RPC ergonomics and error propagation in isolation. | `adapter-spike-ready` | Long-running editor/runtime tasks behind registered task API. | Required for bundler worker URL, transferable payload, cancellation, and timeout behavior. | Main-thread task runner for small jobs with performance warning. | RFC-010 accepted and task registry defined. | Disable worker transport while preserving task contract. |
| `DiagnosticsAdapter` | Spector.js | Useful for GPU frame capture but not part of player/runtime semantics. | `dev-only` | Editor/debug builds only. | Required before enabling any capture UI; production bundle must prove exclusion. | Diagnostics unavailable state. | RFC-012 accepted. | Strip dynamic import and debug UI without data migration. |
| `NavigationAdapter` | recast-navigation / Recast WASM, or a simpler fallback candidate | RFC-014 defines a package-agnostic boundary, source-of-truth policy, generated artifact policy, fallback states, and browser/WASM gates. Prior recast evidence remains useful but not sufficient for implementation. | `hold-for-showcase` | Future navigation service only after a concrete showcase/gameplay acceptance case. | Required after showcase approval; must prove dynamic import, WASM load, path query, reload/cache, fallback failure, disposal, and bundle budget. | No navigation service, static waypoint graph, grid/approximate fallback, or straight-line editor preview. | RFC-014 architect acceptance, RFC-011 dependency/bundle approval, and showcase/gameplay gate before any implementation spike. | Keep authored levels and navigation intent unchanged; remove generated navmesh artifacts and adapter binding. |

## Matrix Rules

- A status of `accept-for-contract` approves only the boundary document, not a root dependency or runtime integration.
- A status of `adapter-spike-ready` still requires an isolated spike that cannot modify `src/**`, `data/**`, root package manifests, or editor state without a later implementation guide.
- `dev-only` dependencies must use lazy/dynamic loading and must be absent from production behavior.
- `hold-for-rfc`, `hold-for-showcase`, and `blocked` are stop signs for implementation.
- `reject` evidence should remain documented so the same dependency is not repeatedly re-evaluated without new facts.

## Contract Fields Required In Each RFC

- Background and spike evidence.
- Sinan-owned contract and data model.
- Candidate-owned responsibilities.
- Forbidden leakage to JSON, editor state, runtime world state, and migrations.
- Adapter inputs and outputs.
- Lifecycle, errors, diagnostics, and fallback behavior.
- Validation strategy and browser smoke stance.
- Gate for a future implementation guide.
- Hold, reject, and blocker rules.

## RFC Coverage Index

| Candidate area | Contract document | Matrix status | Shared policy dependency |
| --- | --- | --- | --- |
| Physics | `docs/rfcs/RFC-006-physics-adapter-boundary.md` | `accept-for-contract` | RFC-011 for WASM/bundle/dependency approval. |
| Audio | `docs/rfcs/RFC-007-audio-system-boundary.md` | `accept-for-contract` | Browser smoke policy for unlock/autoplay/decode. |
| Storage | `docs/rfcs/RFC-008-storage-save-boundary.md` | `accept-for-contract` | Browser smoke policy for IndexedDB/quota/upgrade. |
| Asset pipeline | `docs/rfcs/RFC-009-asset-pipeline-boundary.md` | `adapter-spike-ready` | RFC-011 for dependency approval and generated artifact policy. |
| Worker tasks | `docs/rfcs/RFC-010-worker-task-boundary.md` | `adapter-spike-ready` | Browser smoke policy for worker URL/transfer/timeout. |
| WASM and dependency policy | `docs/rfcs/RFC-011-wasm-bundle-dependency-policy.md` | `accept-for-contract` | Required by WASM/native or bundle-sensitive candidates. |
| Dev-only diagnostics | `docs/rfcs/RFC-012-dev-only-diagnostics-policy.md` | `dev-only` | RFC-011 production exclusion proof. |
| Navigation hold policy | `docs/rfcs/RFC-013-navigation-adapter-hold-policy.md` | superseded-by-proposal | RFC-014 resolves the RFC gap while preserving implementation hold gates. |
| Navigation boundary proposal | `docs/rfcs/RFC-014-navigation-adapter-boundary-proposal.md` | `hold-for-showcase` | RFC-011 plus showcase/gameplay acceptance and browser/WASM smoke before implementation. |
| Browser smoke environment | `docs/strategy/mature-dependency-contracts/browser-smoke-environment-policy.md` | policy | Required by browser-sensitive implementation guides. |

## Cross-RFC Consistency Decisions

- Every adapter RFC keeps Sinan-owned identifiers, schemas, diagnostics, and fallback states at the boundary.
- Candidate-owned responsibilities are implementation details only; no RFC permits raw dependency objects in JSON, editor store, runtime world state, migrations, or director state.
- A future implementation guide must cite the relevant RFC, the compatibility matrix status, and the browser smoke or bundle evidence required by that RFC.
- Fallback is not optional. Each accepted or spike-ready candidate must preserve scene/editor review with a null, silent, volatile, raw pass-through, main-thread, or unavailable fallback.
- Validation must include at least one contract-level test strategy and one leakage guard. Browser-sensitive candidates also require browser smoke evidence.
- `dev-only`, `hold-for-rfc`, and `hold-for-showcase` statuses are not weaker approvals; they are explicit stops for production/runtime integration.
- `hold-for-showcase` means the boundary is defined enough for architect review, but implementation must wait for a named playable/editor acceptance case and its validation gates.
