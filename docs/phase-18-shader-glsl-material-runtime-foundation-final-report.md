# Phase 18 Shader GLSL Material Runtime Foundation Final Report

Date: 2026-06-20

## Status

PASS.

Phase 18 completed Shader MVP S0: a renderer-neutral material contract, a minimal GLSL raw import path, a Three-only `ShaderMaterial` factory/runtime/fallback backend, renderable material slot validation, and Chromium shader compile smoke coverage. It did not implement dissolve gameplay material behavior, material timeline tracks, material actions, shader globals, postprocessing, LOD, instancing, spherical world, gameplay, or multiplayer scope.

## Completed

- Added renderer-neutral material contracts and registry support under `src/runtime/materials/**`.
- Added the built-in S0 debug material definition `debug.uv-gradient` with public parameters `baseColor`, `accentColor`, `strength`, and `uvScale`.
- Added optional `Renderable.materials` schema support while preserving the Phase 16 `Renderable.renderStyle` path.
- Added data/reference validation for material ids, S0 `main` slot use, public parameter names, parameter value types, and texture/image asset references.
- Added `.glsl?raw` type support through `src/vite-env.d.ts` and included that declaration in `tsconfig.node.json` for smoke fixtures.
- Added debug GLSL sources under `src/shaders/materials/debug/**`.
- Added Three-only material creation, fallback material creation, runtime binding, public parameter updates, reset, and disposal under `src/runtime/three/materials/**`.
- Wired optional renderable material assignment through `WebRuntime`, `Viewport`, and `ThreeRuntime`.
- Added Chromium shader compile smoke coverage in `tests/smoke/shader-material.spec.ts`.
- Updated developer, roadmap, workflow, and Phase 18 docs for shader material authoring boundaries and Phase 19 handoff.
- Hardened project workflow config so git commits use explicit paths and smoke health checks survive the product-name transition from `Sinan Scene Director` to `Sinan`.

## Material Runtime Contracts

- `MaterialDefinition`, `MaterialParameter`, `MaterialRegistry`, and `MaterialRuntime` live in renderer-neutral code and do not import Three.
- Public material parameters are separated from internal uniform names. JSON and editor-facing contracts use names such as `baseColor`; the Three backend maps those to uniforms such as `uBaseColor`.
- The current supported S0 parameter types cover number, boolean, color, vec2, vec3, texture asset ids, and null where allowed by schema/definition validation.
- The default registry exposes the debug material only; production story materials are deferred to Phase 19.

## Three ShaderMaterial Runtime

- The Three implementation lives under `src/runtime/three/materials/**`.
- `ThreeMaterialFactory` creates known materials, validates public parameters, and returns fallback material results with structured errors.
- `ThreeMaterialRuntime` binds owned material instances to entity/slot targets, applies the S0 `main` slot, updates public parameters, resets defaults, restores original materials, and disposes owned materials.
- `createFallbackMaterial` provides a visible fallback for material/factory failures.
- Existing Gate Demo data remains render-style driven and only uses custom shader materials when `Renderable.materials` is explicitly present.

## Schema And Validation

- `src/schemas/material.schema.ts` defines material ids, slot names, public parameter names, parameter values, and renderable material slot payloads.
- `Renderable` supports optional `materials` without replacing `model` or `renderStyle`.
- `ReferenceResolver` and `validateProject` validate material ids, unsupported slots, unknown parameters, wrong parameter types, missing texture assets, and wrong texture/image asset types without constructing Three materials.
- Current demo data validates unchanged.

## Browser Shader Compile Tests

- `tests/smoke/shader-material.spec.ts` imports a browser-side fixture through the Vite dev server.
- The fixture creates a minimal Three scene, instantiates `debug.uv-gradient`, enables `renderer.debug.checkShaderErrors`, calls `renderer.compileAsync(scene, camera)` when supported, renders once, and asserts a compiled program exists.
- `Smoke.cmd` now passes with 15 Chromium smoke tests, including the S0 shader compile test.

## Docs Updated

- `docs/phase-18-shader-glsl-material-runtime-foundation.md`
- `docs/phase-18-shader-glsl-material-runtime-foundation-goal-mode-execution-guide.md`
- `docs/developer-guide.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/phase-18-shader-glsl-material-runtime-foundation-final-report.md`
- `docs/Web3D_Shader_GLSL_MVP_支持度评估与实施计划.md`
- `docs/Web3D_Shader_研发方案与架构指南_GLSL_MVP.md`

## Validation

- `Validate.cmd`: PASS on 2026-06-20. Includes format, typecheck, lint, build, test, check-boundaries, validate-data, report-assets, and migration check. Lint still reports the pre-existing Fast Refresh warning in `src/editor/Viewport.tsx`.
- `Smoke.cmd`: PASS on 2026-06-20 with 15 Chromium smoke tests.
- `npm run report-assets`: PASS on 2026-06-20 with 5 assets, 19,404 B used, 36,864 B budget, and 0 issues.
- `git diff --check`: PASS on 2026-06-20.
- Boundary checks: PASS through `Validate.cmd`.
- Shader planning docs: tracked by Git.
- Final validation was run on a clean tracked tree after temporarily stashing unrelated local workspace changes.

## Commits And Push

All listed commits were pushed to `origin/main`.

- `0f4cf72` docs: lock phase 18 shader runtime plan
- `c2832c5` feat: add material runtime contracts
- `09158c1` feat: register debug material definition
- `b9b440a` feat: add renderable material slot schema
- `52eab77` feat: validate material slot references
- `163d02f` feat: add glsl raw shader foundation
- `935fd70` feat: add three shader material factory
- `903766e` feat: add three material runtime skeleton
- `41452dc` feat: wire renderable materials into runtime
- `bf0df28` test: compile shader material in chromium
- `73c489a` chore: remove unrelated files from shader smoke commit
- `e52e789` docs: add shader material authoring guidance
- `f66005c` chore: harden project workflow gates

The final report commit contains this file and the Phase 18 PASS roadmap markers.

## Buffer

Consumed.

- Round 18.13 was used to fix validation workflow issues found during integrated validation: the git wrapper's staging policy was changed from all-changes staging to explicit-path staging, and the smoke health check now uses the stable `Sinan` ready text.
- Rounds 18.14 and 18.15 were skipped because no Phase 18 runtime, shader, schema, or validation blockers remained after Round 18.13.

## Known Limitations

- Only the S0 debug shader material `debug.uv-gradient` exists.
- Only the `main` material slot is supported.
- There is no production dissolve material yet.
- There are no material timeline tracks or `material.setParameter` actions yet.
- There is no Material Inspector UI yet.
- Shader globals such as `uTime`, `uDeltaTime`, viewport, camera, or player position are not implemented.
- Postprocessing, visual regression infrastructure, LOD, instancing, spherical world, gameplay, and multiplayer remain out of scope.
- No texture/image assets are currently present in `data/assets.manifest.json`; texture parameter validation is ready for future assets.

## Remaining Blockers

None for Phase 18.

## Recommended Next Goal

Complete Phase 19 from `docs/abeto-messenger-development-plan.md`: Shader Dissolve And Material Timeline. Phase 19 should add the first production dissolve/open-gate story material, texture-backed public parameters, material timeline/action integration, Material Inspector MVP, validation, runtime tests, and Chromium smoke coverage without bypassing the Phase 18 material runtime.
