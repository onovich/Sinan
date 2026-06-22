# Future Implementation Gate Checklist

Date: 2026-06-22
Status: final consolidation future gate checklist

## Use

Use this checklist when a future architect decides to turn one accepted mature-dependency evidence row into a mainline implementation guide. Passing this checklist is not approval by itself; it is the minimum information needed before an executor can safely implement.

## Required Gates For Any Adapter

| Gate | Required proof | Applies to |
| --- | --- | --- |
| Architect approval | A separate implementation guide names exactly one adapter, target branch, allowed paths, forbidden paths, and acceptance criteria. | All adapters |
| Package/config authorization | The guide explicitly approves any root package, lockfile, Vite, TypeScript, Vitest, Playwright, or bundler config changes. | Any dependency or config change |
| Contract ownership | The adapter contract is Sinan-owned and dependency-agnostic, with dependency types contained behind the boundary. | All adapters |
| Source-of-truth policy | Canonical authored `data/**/*.json` and source assets remain the truth unless a future RFC explicitly changes that rule. | Storage, asset pipeline, navigation, runtime systems |
| Browser smoke | Browser-sensitive behavior has a repeatable Playwright or equivalent smoke with artifact cleanup and guard behavior. | Physics, audio, storage, worker tasks, diagnostics, navigation |
| WASM policy | WASM loading, dynamic import, disposal, fallback, and bundle budget are tested before mainline adoption. | Physics, navigation, meshoptimizer, any WASM candidate |
| Artifact policy | Generated files have declared roots, cleanup, guard checks, and source/derived distinction. | Asset pipeline, navigation, diagnostics captures |
| Fallback policy | The implementation has a declared fallback, visible diagnostic, and deterministic exit path. | All adapters |
| Error and diagnostics UX | Failures are mapped to Sinan diagnostics without leaking dependency internals into game/editor semantics. | All adapters |
| Rollback or exit strategy | The guide says how to disable the dependency while preserving authored data and contracts. | All adapters |
| Validation command list | The guide names exact commands for check, smoke, scope scan, artifact absence, and diff hygiene. | All adapters |
| Scope scan | Checker can prove committed paths are limited to the guide's allowed paths. | All adapters |

## Adapter-Specific Gates

| Adapter | Extra gates |
| --- | --- |
| `PhysicsAdapter` | Fixed-step determinism, WASM init timing, collider query parity, fallback to null adapter, no Three.js import leak outside runtime boundary. |
| `AudioSystem` | User gesture unlock, autoplay failure state, decode fallback, timeline cue scheduling, spatial panner behavior, silent fallback. |
| `StorageAdapter` | Quota/private-mode failure, schema migration ownership, export/import compatibility, cleanup, JSON source-of-truth protection. |
| `AssetPipelineAdapter` | Offline-only execution, normalized path policy before IO, generated artifact cleanup, artifact diff/report, no runtime import. |
| `WorkerTaskAdapter` | Worker URL bundling, transferable payload policy, cancellation, timeout, error propagation, main-thread fallback. |
| `DiagnosticsAdapter` | Dev-only UI approval, dynamic import, production bundle exclusion proof, capture retention policy, disabled-by-default behavior. |
| `NavigationAdapter` | Named showcase/gameplay case, RFC-014 acceptance, RFC-011 approval, browser/WASM smoke, path query proof, reload/cache proof, disposal, fallback failure proof, generated navmesh policy. |

## Safest Future First Candidate

If the deputy architect wants one future mainline candidate after the current mainline phase gates allow it, the clearest rows are `AssetPipelineAdapter` or `WorkerTaskAdapter` because both are `adapter-spike-ready` and have concrete isolated evidence.

This is a recommendation for future planning, not approval. The future guide still must pass every relevant gate above.

`NavigationAdapter` must not be selected as the first implementation target from this packet because it remains `hold-for-showcase`.
