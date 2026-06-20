# Mature Dependency Spikes

Date: 2026-06-20
Branch/worktree: `codex/mature-dependency-spikes` at `D:\LabProjects\Sinan-MatureDependencySpikes`

This folder contains isolated evaluation reports for the first mature dependency spike batch. The spike package lives at:

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

Validation summary:

- `npm --prefix spikes\mature-dependencies run check`: passed.
- `git diff --check`: passed.
- `git status --short --branch`: clean after final commit.
- Vite browser build passed with a known large chunk warning from Rapier/recast evaluation bundles.
- Playwright browser smoke remained blocked because Playwright 1.61 expected Chromium 1228 and browser install timed out after 304s.

Candidate decisions:

| Candidate | Decision |
| --- | --- |
| Rapier JS | accept-for-adapter-spike |
| Web Audio API | accept-for-adapter-spike |
| glTF Transform + meshoptimizer | accept-for-adapter-spike |
| Dexie / IndexedDB | accept-for-adapter-spike |
| Spector.js + Performance API | dev-only |
| Web Workers + Comlink | accept-for-adapter-spike |
| recast-navigation-js | hold-for-phase-21-5-rfc |

Reports:

- `dependency-installation-audit.md`
- `rapier-evaluation.md`
- `web-audio-evaluation.md`
- `dexie-evaluation.md`
- `gltf-transform-evaluation.md`
- `spector-evaluation.md`
- `comlink-worker-evaluation.md`
- `recast-navigation-evaluation.md`
- `final-readiness-report.md`
