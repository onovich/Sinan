# Phase 19 Shader Dissolve And Material Timeline Final Report

Date: 2026-06-20

## Status

PASS.

Phase 19 completed the first production shader-material story path for the Gate Demo. The project now has a renderer-neutral `story.gate-dissolve` material definition, Three shader/runtime support, material timeline sampling, action-driven material parameter updates, demo data integration, Material Inspector MVP authoring, and browser smoke evidence that public material parameter changes affect visible output.

## Completed

- Added production material id `story.gate-dissolve` with public parameters `progress`, `edgeWidth`, `edgeColor`, `baseColor`, and `noiseScale`.
- Added separate GLSL sources under `src/shaders/materials/story/**`.
- Extended the Three material factory/runtime so the dissolve material can be created, applied, updated, reset, disposed, and fall back deterministically.
- Assigned `story.gate-dissolve` to the Gate Demo `gate_a` renderable `main` slot.
- Added Chromium shader smoke that compiles the production material and compares visible pixels across `progress` values.
- Added `material.parameter` timeline schema, deterministic sampler, panel support, director playback/scrub routing, runtime bridge calls, validation, and tests.
- Added `material.setParameter` action schema, Event Inspector authoring, registry dispatch, preview-safe runtime route, validation, and tests.
- Updated `tl_open_gate` and `ev_switch_a_open_gate` so the open-gate sequence resets and animates dissolve `progress`.
- Added ReferenceResolver validation for material timeline/action entity, slot, parameter, and value references.
- Added Material Inspector MVP controls for selected renderable material slots and public parameter edits.
- Added editor smoke covering material inspection, command-backed parameter edit/undo, material track selection, timeline scrub, and visible pixel change.
- Updated shader authoring docs and roadmap entry points so Phase 20 is the next implementation phase.

## Production Material

- Material id: `story.gate-dissolve`
- Public parameters: `progress`, `edgeWidth`, `edgeColor`, `baseColor`, `noiseScale`
- GLSL sources: `src/shaders/materials/story/gate-dissolve.vert.glsl`, `src/shaders/materials/story/gate-dissolve.frag.glsl`
- Texture/data assets: none added; Phase 19 uses inline procedural GLSL noise.
- Fallback behavior: unknown or invalid material creation still returns a visible fallback material through the Three material runtime path.

## Timeline Integration

- `material.parameter` schema uses entity id, slot, public parameter name, and typed public key values.
- `MaterialParameterTrackPlayer` samples number, color, vec2, and vec3 values deterministically, with discrete fallback for non-continuous values.
- `DirectorSystem` routes sampled material parameters through `RuntimeMaterialParameterUpdate`, `EngineSession`, `WebRuntime`, and the Three material runtime.
- Playback and scrub preserve existing action, camera, animation, property, sound, subtitle, and wait behavior.

## Action Integration

- `material.setParameter` is schema-backed and registry-backed.
- The action is preview-safe and writes public material parameters through the runtime action port.
- Event authoring supports entity id, slot, parameter, and typed value fields without exposing raw uniforms.
- Reference validation catches missing entities, unsupported slots, missing material slots, unknown parameters, and wrong value types before runtime.

## Material Inspector

- The selected entity Inspector now shows renderable material slots with material id, display name, validation status, current/default values, and override state.
- Public parameter controls support number, color, boolean, vec2, vec3, and texture/null-shaped inputs.
- Edits are command-backed via existing Renderable component updates, so undo, dirty state, and save flows remain editor-owned.
- The panel consumes shared material definitions and does not show GLSL source, Three objects, or raw uniforms.

## Validation

- `Validate.cmd`: PASS on 2026-06-20. Includes `format:check`, `typecheck`, `lint`, `build`, `test`, `check-boundaries`, `validate-data`, `report-assets`, and migration check.
- `Smoke.cmd`: PASS on 2026-06-20 with 17 Chromium smoke tests.
- `npm run test`: PASS, 47 files / 199 tests.
- `npm run validate-data`: PASS, 5 prefabs, 1 level, 3 events, 1 timeline, 1 camera shot, 1 palette, 5 assets.
- `npm run report-assets`: PASS, 5 assets, 19,404 B used, 36,864 B budget, 0 issues.
- `git diff --check`: PASS before Phase 19 round commits; final report commit reruns it before push.
- Boundary checks: PASS through `Validate.cmd`.
- Browser shader compile: PASS for debug and production dissolve shader smoke.
- Editor material workflow smoke: PASS for Material Inspector edit/undo, material track selection, timeline scrub, and visible pixel delta.

## Commits And Push

All listed commits were pushed to `origin/main`.

- `ae248fb` docs: lock phase 19 dissolve material plan
- `867a55e` feat: register dissolve material definition
- `1c55ac8` feat: create dissolve shader material
- `5b076dd` feat: update dissolve material parameters
- `5b246e9` feat: assign dissolve material to demo data
- `5735016` test: add dissolve shader smoke
- `9d8a54c` feat: add material parameter timeline track
- `619a921` feat: drive material parameters from timelines
- `fb2c951` feat: add material set parameter action
- `37acf30` feat: add dissolve material demo sequence
- `7a3a22e` feat: add material inspector mvp
- `5cace84` test: cover material timeline editor workflow
- Final documentation commit: this report and Phase 20 roadmap handoff.

## Buffer

Not consumed.

Rounds 19.13 through 19.15 were skipped because the main implementation rounds and final validation found no remaining Phase 19 runtime, shader, data, editor, or smoke blocker. A final lint issue found during Round 19.16 was fixed inside the final validation round before this report.

## Known Limitations

- Only the `main` renderable material slot is supported.
- The first production material uses procedural noise and does not add texture/noise asset metadata.
- Material Inspector edits are command-backed data edits; live runtime preview remains timeline/action driven in Phase 19.
- No shader globals such as time, delta time, viewport, camera, or player position are implemented.
- No second production material, postprocessing pass, shader graph, visual regression suite, LOD, instancing, spherical world, gameplay input, physics migration, multiplayer, or package identity migration was added.

## Remaining Blockers

None for Phase 19.

## Recommended Next Goal

Complete Phase 20 from `docs/abeto-messenger-development-plan.md`: Shader Globals And Postprocessing Ramp. Start only after this Phase 19 final report is committed and pushed.

Phase 20 should build on the Phase 19 public material parameter path. It should not introduce raw uniforms into timeline/action/editor contracts, and it should keep shader globals and postprocessing under renderer/runtime adapter boundaries.
