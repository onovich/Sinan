# Phase 21 Shader Production Quality Gate Final Report

Date: 2026-06-20

## Status

PASS.

Phase 21 is complete and pushed. Phase 21.5 is the next required gate before Phase 22.

## Completed

- Locked the Phase 21 shader production quality design and inventory.
- Added browser compile coverage for current production materials and postprocess output.
- Added compact deterministic visual regression harnesses and baselines.
- Added structured shader diagnostics for material, runtime, fallback, and postprocess paths.
- Added fallback smoke that keeps the editor visible while CI still fails real production shader errors.
- Documented shader HMR/failure triage and precompile policy.
- Added a local low-end Chromium shader/postprocess baseline.
- Added an integrated quality guard that checks production ids against compile, visual, fallback, precompile, and low-end evidence.
- Updated developer and execution docs with the production shader checklist.

## Compile Coverage

- Production materials: `story.gate-dissolve`, `story.hologram-scanline`.
- Support material retained: `debug.uv-gradient`.
- Postprocess passes: `cinematic.vignette` plus final `OutputPass` route through the vignette enabled/disabled fixture.
- Browser fixture: `tests/smoke/shader-material.spec.ts` imports `tests/smoke/shaderCompileFixture.ts` and runs the real Chromium/Three path.

## Visual Regression

- Harness: `tests/visual/shaderVisualRegression.ts`.
- Material fixtures: `tests/visual/shaderMaterialVisualBaselines.ts`.
- Postprocess fixtures: `tests/visual/postProcessVisualBaselines.ts`.
- Baseline format: compact TypeScript baselines with fixture id, target id, viewport, camera, geometry, public parameters, shader globals where needed, samples, expected RGBA pixels, and tolerance.
- Tolerance policy: small per-channel and aggregate deltas on deterministic 64x64 readback samples. Generated Playwright traces/screenshots remain uncommitted output.

## Diagnostics And Fallback

- Structured diagnostic fields: kind, material/effect id, display name where available, shader stage, source path, runtime context, Three revision, browser/GPU context when available, entity id, slot, public parameter, fixture name, and compile/validation log where available.
- Fallback behavior: invalid material runtime paths render visible `material:fallback-error`.
- CI failure behavior: production compile and visual fixtures fail tests even when fallback keeps the viewport visible.
- Editor/runtime reporting: diagnostics stay runtime/test-facing; raw uniforms do not enter data, timeline, action, editor, director, engine, world, schemas, or authoring contracts.

## HMR Guidance

`docs/developer-guide.md` documents the Phase 21 policy: create a new material before replacement, copy public parameters and `ShaderGlobals`, compile/render through deterministic fixtures, replace only after success where practical, dispose replaced owned materials, and keep the previous valid material or explicit fallback visible on failure.

## Precompile Guidance

`src/runtime/three/ShaderPrecompilePlan.ts` lists known production precompile targets. Current guidance prefers `renderer.compileAsync(scene, camera)` with synchronous `renderer.compile(scene, camera)` fallback, followed by one render so compile/output failures are observable.

## Mobile / Low-End Baseline

- Environment: Playwright Chromium, 360x640 viewport, pixel ratio `1`.
- Metrics: fixture duration, `renderer.info.programs`, `renderer.info.memory.geometries`, `renderer.info.memory.textures`, visible material pixels, and vignette edge darkening.
- Budgets: duration `<= 2500 ms`, shader programs `<= 8`, geometries `<= 6`, textures `<= 6`.
- Limitations: no real mobile hardware certification was available in this workspace. The current gate is a local low-end Chromium regression screen, not a device-grade frame pacing promise.

## Validation

- `Validate.cmd`: PASS; format, typecheck, lint, build, Vitest, boundary checks, data validation, asset report, and migration check passed.
- `Smoke.cmd`: PASS; 25 Playwright Chromium smoke tests passed.
- Targeted tests: PASS; `npm run test -- shader postprocess visual diagnostics` passed 10 files / 28 tests.
- Integrated guard: PASS; `npm run test -- shaderProductionQualityGate` passed 1 file / 2 tests.
- Browser compile: PASS; debug, dissolve, hologram, postprocess, fallback, visual, lifecycle, and low-end smoke paths passed.
- Visual regression: PASS; material and postprocess compact baselines passed.
- Data validation: PASS; 5 prefabs, 1 level, 3 events, 1 timeline, 1 camera shots, 1 palettes, 5 assets.
- Asset report: PASS; 5 assets, 19404 B used, 36864 B budget, 0 issues.
- `git diff --check`: PASS.
- Boundary checks: PASS; no forbidden Three.js imports or dynamic-code patterns found.

## Commits And Push

- `f9bf9ae` docs: lock phase 21 shader quality plan; pushed to `origin/main`.
- `e56b5fa` test: cover production shader compile matrix; pushed to `origin/main`.
- `a9a530e` test: add shader visual regression harness; pushed to `origin/main`.
- `cdee0e2` test: add production material visual baselines; pushed to `origin/main`.
- `d42b8dd` test: add postprocess visual baseline; pushed to `origin/main`.
- `2ddfbd2` feat: add structured shader diagnostics; pushed to `origin/main`.
- `a1c1484` test: cover shader fallback diagnostics; pushed to `origin/main`.
- `426ee2f` docs: document shader hmr failure policy; pushed to `origin/main`.
- `1c8991f` docs: add shader precompile guidance; pushed to `origin/main`.
- `e304559` test: add low-end shader baseline; pushed to `origin/main`.
- `a64e637` docs: add shader production quality checklist; pushed to `origin/main`.
- `4cd83be` test: integrate shader quality gate; pushed to `origin/main`.
- Final report and roadmap handoff commit: `docs: finalize phase 21 shader production quality gate`; pushed after final validation.

## Buffer

No buffer rounds were consumed. Rounds 21.13 through 21.15 were skipped because Round 21.12 integrated validation and smoke passed. One Prettier failure on the new integrated guard was fixed inside Round 21.12 before commit and did not require a buffer round.

## Known Limitations

- Real mobile hardware and device-grade frame pacing are not certified by Phase 21.
- Visual regression currently uses compact pixel baselines, not broad screenshot snapshots.
- HMR behavior is documented and fixture-backed by replacement/fallback policy, but there is no broad Vite HMR framework.
- Phase 21.5 external infrastructure contracts are intentionally not implemented here.

## Remaining Blockers

None for Phase 21.

## Recommended Next Goal

Complete Phase 21.5 from `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-goal-mode-execution-guide.md`: Engine Maturity External Contract Gate. Start only after this Phase 21 PASS final report is pushed. Phase 21.5 is a contract/documentation gate, not runtime implementation.
