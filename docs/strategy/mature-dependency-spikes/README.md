# Mature Dependency Spikes

Date: 2026-06-20
Branch/worktree: `codex/mature-dependency-spikes` at `D:\LabProjects\Sinan-MatureDependencySpikes`

This folder contains isolated evaluation reports for the first mature dependency spike batch. The spike package will live at:

```txt
spikes/mature-dependencies/
```

Scope boundaries:

- No Sinan root package/config/source/data/public/test files were modified.
- All npm dependencies must be installed only in `spikes/mature-dependencies/package.json`.
- Runtime semantics, schemas, registries, validation, and future adapters remain Sinan-owned.
- Candidate packages only own difficult algorithms, browser/platform compatibility, or dev tooling behavior behind replaceable adapters.

Non-scope:

- Do not implement production Sinan PhysicsSystem, AudioSystem, StorageAdapter, or NavigationSystem.
- Do not modify `src/**`, `data/**`, `tests/**`, `public/**`, or root package/config files.
- Do not occupy the mainline dev server port `5174`.
- Do not require Phase 20/21 mainline programmers to change code.

Candidate list:

- Rapier JS.
- Web Audio API.
- glTF Transform + meshoptimizer.
- Dexie / IndexedDB.
- Spector.js + Performance API.
- Web Workers + Comlink.
- recast-navigation-js.

Execution estimate:

| Stage | Scope | Estimated conversation rounds |
| --- | --- | --- |
| 0 | Handoff and isolation baseline | 1 |
| 1 | Isolated spike package scaffold | 1 |
| 2 | Dependency installation and license audit | 1 |
| 3 | Rapier physics spike | 1 |
| 4 | Web Audio and Dexie spike | 1 |
| 5 | glTF Transform / meshoptimizer spike | 1 |
| 6 | Diagnostics, worker, and navigation spike | 1 |
| 7 | Final readiness report | 1 |

Commit boundary:

- Allowed: `spikes/mature-dependencies/**`.
- Allowed: `docs/strategy/mature-dependency-spikes/**`.
- Optional only if required: `.gitignore`.
