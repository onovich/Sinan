# Mature Dependency Final Readiness Report

Date: 2026-06-20
Worktree: `D:\LabProjects\Sinan-MatureDependencySpikes`
Branch: `codex/mature-dependency-spikes`

## 1. Scope Result

The isolated spike package was created under `spikes/mature-dependencies/`. Reports were created under `docs/strategy/mature-dependency-spikes/`.

No root `package.json`, root lockfile, Vite config, TS config, `src/**`, `data/**`, `tests/**`, `public/**`, or `.codex/**` files were modified in the spike worktree.

## 2. Validation

- `npm --prefix spikes\mature-dependencies run check`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 8 files / 9 tests.
- `npm run build`: passed.
- `git diff --check`: passed.
- `git status --short --untracked-files=all`: only allowed `spikes/mature-dependencies/**` and `docs/strategy/mature-dependency-spikes/**` paths were present.
- Vite production bundle warning: main chunk was larger than 500 kB. Main spike chunk was 2,375,080 bytes; recast WASM compat chunk was 726,299 bytes.
- Playwright browser smoke: blocked. Playwright 1.61 expected Chromium 1228. Existing cache had older Chromium 1217, and `playwright install chromium` timed out after 304s.

## 3. Stage Completion

| Stage | Commit | Result |
| --- | --- | --- |
| 0 | `35735c0` | Isolation baseline README |
| 1 | `6ef4e06` | Spike package scaffold |
| 2 | `e31159c` | Dependency installation audit |
| 3 | `9bdd7bd`, `66bdd26` | Rapier smoke/report and whitespace fix |
| 4 | `52082dc` | Web Audio and Dexie smoke/reports |
| 5 | `99a773f` | glTF Transform fixture/smoke/report |
| 6 | `0bf39de` | Diagnostics, worker, and navigation smoke/reports |
| 7 | this final round | Final readiness report and README |

## 4. Decision Matrix

| Module | Candidate | Decision | Notes |
| --- | --- | --- | --- |
| Physics / Collision | Rapier JS | accept-for-adapter-spike | Compat package passed. Base package needs WASM/ESM policy. |
| Audio | Web Audio API | accept-for-adapter-spike | Browser-native low-level backend, Sinan owns semantics. |
| Asset Optimization | glTF Transform + meshoptimizer | accept-for-adapter-spike | Offline pipeline only, report generated. |
| Storage | IndexedDB + Dexie | accept-for-adapter-spike | Use for cache/draft/save snapshots, not JSON truth. |
| Diagnostics | Spector.js + Performance API | dev-only | Keep behind feature flag and dynamic import. |
| Worker isolation | Web Workers + Comlink | accept-for-adapter-spike | Good WorkerTaskAdapter candidate. |
| Navigation | recast-navigation-js | hold-for-phase-21-5-rfc | Works, but needs nav contract and WASM/bundle policy. |

## 5. Can Enter Future Adapter Spike

- Rapier JS, after Phase 21.5 decides base package versus compat package and WASM distribution.
- Web Audio API, after Sinan-owned AudioSystem contract is defined.
- glTF Transform + meshoptimizer, as an offline asset pipeline adapter.
- Dexie, as a StorageAdapter for browser-local cache/drafts/save snapshots.
- Comlink, as WorkerTaskAdapter RPC infrastructure.

## 6. Dev-Only

- Spector.js. Performance API markers can be Sinan-owned diagnostics, but Spector.js must remain dev-only and excluded from production runtime.

## 7. Hold

- recast-navigation-js should wait for Phase 21.5 NavigationAdapter policy and gameplay/showcase demand.
- XState was not installed in this execution. The guide lists it only as an optional authoring/validation reference and does not require a minimal output file for this batch.

## 8. Reject

No evaluated candidate is rejected in this run.

## 9. Required Phase 21.5 Decisions

- WASM distribution and bundle budget policy for Rapier and recast.
- Adapter contracts for Physics, Audio, Storage, WorkerTask, Asset Pipeline, and Navigation.
- Rule that external object handles never enter Sinan JSON.
- Browser unlock/autoplay diagnostic policy for audio.
- Storage source-of-truth policy: IndexedDB cannot replace `data/**/*.json`.
- Dev-only dependency guard policy for Spector.js and similar diagnostics.
- Browser automation environment policy, because Playwright browser install was blocked in this run.

## 10. Recommended Next Step

Use these reports as Phase 21.5 input. The next implementation guide should define adapter contracts before any candidate package is introduced to Sinan mainline runtime.
