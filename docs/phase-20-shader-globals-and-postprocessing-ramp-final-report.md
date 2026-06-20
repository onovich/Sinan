# Phase 20 Shader Globals And Postprocessing Ramp Final Report

Date: 2026-06-20

## Status

PASS.

Phase 20 completed the shader globals and postprocessing ramp for the Gate Demo runtime. The project now has a renderer-neutral `ShaderGlobals` contract, engine/runtime global routing, Three shader global uniform binding, a second production shader material, explicit shader material lifecycle diagnostics, a Three-only postprocessing runtime, a controlled vignette pass, and a small public postprocess parameter contract.

## Completed

- Added renderer-neutral `ShaderGlobals` with public semantic names `elapsedSeconds`, `deltaSeconds`, `viewportSize`, and optional `cameraPosition`.
- Routed globals from `EngineLoop` and `EngineSession` through `WebRuntime.setShaderGlobals`, keeping per-frame shader state out of React state.
- Bound globals to Three shader materials through Three-only uniform mapping with object reuse for vector uniforms.
- Added second production material id `story.hologram-scanline` with public parameters `intensity`, `baseColor`, `scanlineColor`, `scanlineDensity`, and `flickerStrength`.
- Added separate hologram GLSL sources under `src/shaders/materials/story/**`.
- Extended Three material factory/runtime support for `story.hologram-scanline`, including create, apply, set, reset, fallback, and dispose behavior.
- Added lifecycle diagnostics and tests for repeated apply, entity rebind/reload, original material restoration, fallback disposal, shared texture ownership, and no per-frame material creation from globals.
- Added Chromium shader smoke for shader globals, bounded material lifecycle/resource counters, and shader compile/pixel evidence.
- Added `ThreePostProcessRuntime` under `src/runtime/three/**` with `EffectComposer`, `RenderPass`, `OutputPass`, render fallback, resize, and disposal handling.
- Added a controlled vignette `ShaderPass` with enable/disable, public intensity/softness settings, and Chromium pixel evidence.
- Added renderer-neutral postprocess public contract under `src/runtime/postprocess/**` for `cinematic.vignette` with public parameters `enabled`, `intensity`, and `softness`.
- Updated developer docs and roadmap entry points so Phase 21 is the next implementation phase and Phase 21.5 stays gated until after Phase 21 PASS and pushed.

## Shader Globals Evidence

- `src/runtime/materials/ShaderGlobals.ts` defines and normalizes the public global contract.
- `src/engine/EngineLoop.ts` is the authoritative elapsed/delta source.
- `src/engine/EngineSession.ts` routes elapsed/delta and viewport globals to `WebRuntime`.
- `src/runtime/three/materials/ThreeShaderGlobalUniforms.ts` maps public globals to Three-only uniforms.
- Tests cover default globals, clamping/sanitizing, viewport sync, no raw-uniform public names, EngineSession routing, Three material uniform updates, fallback paths, disposed bindings, and object reuse.

## Second Material Evidence

- Material id: `story.hologram-scanline`
- Public parameters: `intensity`, `baseColor`, `scanlineColor`, `scanlineDensity`, `flickerStrength`
- GLSL sources:
  - `src/shaders/materials/story/hologram-scanline.vert.glsl`
  - `src/shaders/materials/story/hologram-scanline.frag.glsl`
- Three helper: `src/runtime/three/materials/createHologramScanlineMaterial.ts`
- Tests prove definition validation, shader raw imports, factory creation/defaults/fallback, runtime set/reset/get behavior, and lifecycle ownership.

## Lifecycle And Resource Evidence

- `ThreeMaterialRuntime.getLifecycleDiagnostics()` exposes narrow test/runtime diagnostics for binding count and material ids without exposing renderer counters as gameplay data.
- Repeated apply replaces and disposes owned materials while restoring original mesh materials.
- Entity rebind simulates scene reload and disposes previous owned shader materials.
- Original shared textures remain owned by their original material owner, not by `ThreeMaterialRuntime`.
- Chromium smoke repeats shader material apply/render/dispose and confirms runtime binding count returns to zero and renderer program/memory counters remain bounded for the demo.

## Postprocessing Evidence

- `src/runtime/three/ThreePostProcessRuntime.ts` owns Three-only composer/pass details.
- `ThreeRuntime.render()` can route through composer or fall back to direct `renderer.render`.
- Resize and dispose are wired for composer and passes.
- Vignette pass is inserted before final `OutputPass`; disabled state does not create per-frame allocations.
- `src/runtime/postprocess/**` exposes public effect id `cinematic.vignette` and public parameters only.
- Chromium smoke proves the vignette pass changes edge pixels while preserving alpha and bounded renderer counters.

## Validation

- `Validate.cmd`: PASS on 2026-06-20. Includes `format:check`, `typecheck`, `lint`, `build`, `test`, `check-boundaries`, `validate-data`, `report-assets`, and migration check.
- `Smoke.cmd`: PASS on 2026-06-20 with 20 Chromium smoke tests.
- `npm run test`: PASS, 51 files / 229 tests.
- `npm run validate-data`: PASS, 5 prefabs, 1 level, 3 events, 1 timeline, 1 camera shot, 1 palette, 5 assets.
- `npm run report-assets`: PASS, 5 assets, 19,404 B used, 36,864 B budget, 0 issues.
- `git diff --check`: PASS.
- Boundary checks: PASS through `Validate.cmd`; Three.js and postprocessing imports remain inside `src/runtime/three/**`.

## Commits And Push

All listed commits were pushed to `origin/main`.

- `44c1949` docs: lock phase 20 shader globals plan
- `5d438e6` feat: add shader globals contract
- `65cb35d` feat: route shader globals through engine session
- `ea3d387` feat: bind shader globals to three materials
- `0817a09` test: cover shader globals smoke
- `80fed62` feat: add second production shader material
- `183c2a2` feat: support second shader material runtime
- `222e2a5` test: harden shader material lifecycle
- `3ee8382` test: add shader resource lifecycle diagnostics
- `780ed29` feat: add three postprocessing runtime boundary
- `45fc161` feat: add vignette postprocessing pass
- `f985997` feat: drive postprocess parameters through public contract
- Final documentation commit: this report and Phase 21 roadmap handoff.

## Buffer

Not consumed.

Rounds 20.13 through 20.15 were skipped because integrated `Validate.cmd`, `Smoke.cmd`, and `git diff --check` found no remaining Phase 20 runtime, shader, postprocess, data, docs, or smoke blocker.

## Known Limitations

- Only the `main` renderable material slot is supported.
- Static shader material pooling is deferred; Phase 20 deliberately keeps shader materials owned per entity and slot because runtime parameters and globals mutate uniforms.
- High-cardinality material variation is deferred to future instancing/attribute work.
- `cinematic.vignette` has a public runtime contract and smoke evidence, but Phase 20 does not add a full postprocess editor or timeline track.
- Postprocessing remains disabled by default in the main editor runtime unless explicitly enabled by runtime integration.
- Phase 20 does not add shader visual regression, HMR shader fallback/error diagnostics, precompile guidance, mobile shader baseline, LOD, instancing, spherical world, gameplay input, physics, Runtime UI, audio, narrative importers, multiplayer, or external adapters.

## Remaining Blockers

None for Phase 20.

## Recommended Next Goal

Complete Phase 21 from `docs/abeto-messenger-development-plan.md`: Shader Production Quality Gate.

Phase 21 should add shader visual regression, HMR/fallback/error diagnostics, precompile guidance, and mobile/low-end shader baseline. Phase 21.5 must remain blocked until Phase 21 is PASS and pushed.
