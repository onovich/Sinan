# Dependency Installation Audit

Date: 2026-06-20
Stage: 2
Worktree: `D:\LabProjects\Sinan-MatureDependencySpikes`
Package root: `spikes/mature-dependencies`

## 1. Summary

All candidate packages installed inside the isolated spike package. No root package files were modified. The packages are evaluation inputs only and must not become Sinan hard dependencies before Phase 21.5 adapter policy.

Command used for verification:

```powershell
npm --prefix spikes\mature-dependencies ls --depth=0
```

`npm ls` reported the requested top-level packages plus two local extraneous transitive entries, `@emnapi/runtime@1.10.0` and `tslib@2.8.1`. They are not Sinan candidates and were not added as explicit dependencies.

## 2. Package Metadata

| Package | Version | License | Role | Initial risk |
| --- | --- | --- | --- | --- |
| `@dimforge/rapier3d` | 0.19.3 | Apache-2.0 | Physics candidate | WASM asset and ESM loader policy required |
| `@dimforge/rapier3d-compat` | 0.19.3 | Apache-2.0 | Rapier compatibility probe | Larger bundle, compat-only fallback candidate |
| `dexie` | 4.4.4 | Apache-2.0 | IndexedDB wrapper | Browser quota/support diagnostics required |
| `fake-indexeddb` | 6.2.5 | Apache-2.0 | Node test support | Test-only dependency, not runtime truth |
| `@gltf-transform/core` | 4.4.0 | MIT | Offline GLB inspect/read/write | Offline-only, not runtime source of truth |
| `@gltf-transform/functions` | 4.4.0 | MIT | Offline transforms | Keep out of production runtime |
| `@gltf-transform/extensions` | 4.4.0 | MIT | Extension handling | KTX2/Basis/Draco policy deferred |
| `@gltf-transform/cli` | 4.4.0 | MIT | Tooling reference | CLI is pipeline tooling only |
| `meshoptimizer` | 1.1.1 | MIT | Mesh optimization component | Encoder/decoder loading and output policy required |
| `spectorjs` | 0.9.30 | MIT | WebGL diagnostics | Dev-only, dynamic import only |
| `comlink` | 4.4.2 | Apache-2.0 | Worker RPC | Must not define plugin SDK or editor-store access |
| `recast-navigation` | 0.43.1 | MIT | Navigation/navmesh candidate | WASM and bundle policy required |

Dev/test tooling:

| Package | Version | License |
| --- | --- | --- |
| `typescript` | 6.0.3 | Apache-2.0 |
| `vite` | 8.0.16 | MIT |
| `vitest` | 4.1.9 | MIT |
| `playwright` | 1.61.0 | Apache-2.0 |
| `@types/node` | 26.0.0 | MIT |

## 3. WASM / Native Scan

WASM files found in candidate packages:

```txt
spikes/mature-dependencies/node_modules/@dimforge/rapier3d/rapier_wasm3d_bg.wasm
spikes/mature-dependencies/node_modules/@dimforge/rapier3d-compat/rapier_wasm3d_bg.wasm
spikes/mature-dependencies/node_modules/@recast-navigation/wasm/dist/recast-navigation.wasm.wasm
```

No native `.node`, `.dll`, or `.exe` runtime requirement was accepted into Sinan mainline. Playwright browser binaries are development tooling and remained outside the repository.

## 4. Architecture Boundary

Sinan-owned:

- Schemas.
- Registries.
- Runtime semantics.
- Validation.
- Adapter contracts.
- Source-of-truth JSON.

Candidate-owned:

- Physics solving.
- Browser audio graph primitives.
- GLB inspect/transform algorithms.
- IndexedDB wrapper ergonomics.
- WebGL capture tooling.
- Worker RPC plumbing.
- Navmesh generation/query algorithms.

Adapter rule:

```txt
Sinan contract
  -> replaceable adapter
  -> candidate package or browser API
```

## 5. Initial Follow-up

- Rapier requires explicit WASM distribution and async initialization policy.
- Web Audio requires browser unlock/autoplay diagnostics in a real browser smoke.
- glTF Transform must remain an offline pipeline tool.
- Dexie must be limited to cache/draft/save snapshots, not project source truth.
- Spector.js must be dev-only and dynamically imported.
- Comlink should be evaluated through a WorkerTaskAdapter boundary.
- recast-navigation-js should wait for Phase 21.5 NavigationAdapter policy before hard dependency.
