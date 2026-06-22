# Abeto Messenger-like Development Plan

Date: 2026-06-18
Status: Post Phase 14 product roadmap for a Messenger-like vertical slice.

This plan incorporates `docs/abeto-messenger-gap-closure-plan.md` and the Web3D Shader GLSL MVP planning docs into the Sinan roadmap. The source gap document currently appears to have text encoding damage in the Chinese sections, so this file is the clean roadmap entry point for executors.

## Phase 14 Status

Phase 14 is accepted for the current release-candidate baseline.

Evidence:

- Commit `104a404` finalized and pushed the Phase 14 release candidate.
- `docs/phase-14-release-candidate-finalization.md` records the final validation evidence.
- `npm ci`, `npm audit --audit-level=moderate`, `Validate.cmd`, `Smoke.cmd`, and the browser demo gate passed on 2026-06-18.

Phase 15 scope lock is recorded in `docs/phase-15-abeto-scope-lock-final-report.md`. Its status is PASS for the documentation and handoff gate. Runtime implementation remains deferred until Phase 16.

## Product Target

Sinan should evolve from an asset-backed scene director/editor into a compact, browser-based, stylized 3D world demo:

- Three.js/WebGL runtime with a strict runtime adapter boundary.
- Compact spherical or folded open space instead of a large open world.
- Palette-toon visual style with outlines, highlight states, fog, and controlled color grading.
- Lightweight delivery, exploration, and social stamp loops.
- Showcase Mode for direct play without editor panels.
- Mobile-aware performance budget.
- Data-driven, AI-maintainable, Git-friendly content.

The goal is not to build a general commercial engine or a massive open world.

## Baseline

Phase 8 through Phase 13 provide most of the required technical base:

- GLB/glTF loading through `src/runtime/three/**`.
- Cached model assets, cloned scene instances, fallback placeholders, and animation clip support.
- Timeline, camera shot, action, condition, trigger, AABB debug, HUD, and audio bridges.
- Editor authoring, save validation, dirty state, migration checks, and browser smoke coverage.
- Boundary automation that keeps Three.js out of game, event, director, world, schema, data, and migration layers.

Phase 14 is now the accepted release-candidate baseline for the Abeto route.

## Source Gap Document Note

`docs/abeto-messenger-gap-closure-plan.md` is preserved as source input because it contains useful technical decomposition despite damaged text encoding in parts of the Chinese prose. Executors should not delete or overwrite it. Use this clean roadmap as the readable planning entry point.

The shader source inputs are:

- `docs/Web3D_Shader_GLSL_MVP_支持度评估与实施计划.md`
- `docs/Web3D_Shader_研发方案与架构指南_GLSL_MVP.md`

These shader docs are now integrated into the roadmap as a dedicated Shader GLSL MVP track after Phase 17. Executors should read them before starting Phase 18 or any material/shader work.

## Scope Lock Brief

The first Abeto-like vertical slice is intentionally compact:

- one small spherical or folded world prototype
- three readable regions
- one player avatar
- one or two delivery jobs
- one NPC or mailbox delivery endpoint
- palette-toon material direction with outline/highlight support
- small instanced vegetation or repeated prop example
- Showcase Mode for direct play

Non-goals:

- no massive open world
- no generic engine/editor expansion
- no early MMO-scale networking
- no shader graph or visual material editor
- no runtime implementation during Phase 15

## Phase Summary

| Phase      | Name                                    | Goal                                                                                                                                                             | Estimated Rounds |
| ---------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------: |
| Phase 14   | Release Candidate Finalization          | Clean working tree, verify fresh checkout workflow, and close the current platform release gate                                                                  |              1-2 |
| Phase 15   | Abeto Scope Lock                        | Cleanly translate the gap plan into project scope, budgets, acceptance gates, and implementation entry points                                                    |                4 |
| Phase 16   | Stylized Runtime Foundation             | Add render style schema, palette-toon materials, outline/highlight, fog/color grade, and low-end toggles                                                         |                4 |
| Phase 17   | Asset Budget And Compression            | Add asset metadata, texture/colorSpace metadata, budget validation, asset reports, and compressed asset loading strategy                                         |                4 |
| Phase 18   | Shader GLSL Material Runtime Foundation | Add renderer-neutral MaterialDefinition/MaterialRuntime contracts, GLSL raw imports, Three ShaderMaterial backend, fallback materials, and browser compile tests |                6 |
| Phase 18.5 | Engine Core Alignment                   | Add EngineSession, EngineLoop, minimal World, and EditorSessionBridge so Viewport stops acting as the engine root                                                |                3 |
| Phase 19   | Shader Dissolve And Material Timeline   | Add the first story shader material, texture-backed dissolve, material.parameter timeline tracks, material.setParameter actions, and Material Inspector MVP      |                6 |
| Phase 20   | Shader Globals And Postprocessing Ramp  | Add shared shader globals, a second material, resource sharing/lifecycle checks, and the first postprocessing runtime pass                                       |                6 |
| Phase 21   | Shader Production Quality Gate          | Add shader visual regression, HMR/fallback/error diagnostics, precompile guidance, and mobile shader baseline                                                    |                4 |
| Phase 21.5 | Engine Maturity External Contract Gate  | Add Sinan-owned RFCs, adapter boundary policy, POC briefs, mature dependency evaluation templates, and compatibility matrix before external infrastructure work  |                6 |
| Phase 22   | LOD, Instancing, And Vegetation         | Add LOD runtime/schema, InstancedMesh scatter, vegetation data, and perf smoke checks                                                                            |                5 |
| Phase 23   | Compact Spherical World Prototype       | Add cube-sphere projection, spherical placement/camera, player surface movement, and three readable regions                                                      |                6 |
| Phase 24   | Delivery Gameplay Showcase              | Add Showcase Mode, player controller, delivery jobs, route/target feedback, and 1-2 complete jobs                                                                |                6 |
| Phase 25   | Multiplayer-lite Social Layer           | Add local remote-player simulator, avatar/emote/stamp schema, and a small WebSocket room prototype                                                               |              5-6 |
| Phase 26   | Vertical Slice RC Hardening             | Lock performance budgets, mobile profile, perf smoke, docs, and final vertical-slice release checklist                                                           |                3 |

Core route without multiplayer, from the current accepted Phase 16 baseline onward: Phase 17 through Phase 24 plus Phase 26, about 55 rounds.

Full route with multiplayer-lite, from the current accepted Phase 16 baseline onward: Phase 17 through Phase 26, about 60-61 rounds.

## Non-Negotiable Rules

1. `data/**/*.json` remains the source of truth for worlds, chunks, assets, palettes, render styles, delivery jobs, emotes, avatars, events, timelines, and camera shots.
2. Three.js, custom materials, shaders, instancing, GLTF/texture loaders, and render passes stay in `src/runtime/three/**`.
3. Renderer-neutral systems expose typed data and runtime adapter contracts, not Three.js objects.
4. New JSON DSL behavior must have Zod schemas, validators, tests, and clear editor or runtime boundaries.
5. No `eval`, script strings, `new Function`, or dynamic global dispatch.
6. Editor mutations remain command-backed.
7. Performance budgets are first-class acceptance criteria, not after-the-fact polish.
8. Shader timeline/event/editor data may address public material parameters such as `progress`, never raw uniform names such as `uProgress`.
9. The Shader MVP uses standard GLSL plus `THREE.ShaderMaterial` and `.glsl?raw` imports; no custom shader DSL, shader graph, TSL, WGSL, or transpiler in the MVP.
10. Sinan Engine is the product boundary; Scene Director is a first-party Director System inside the engine, not the whole engine root.
11. Editor viewport code is an authoring surface. It should not keep accumulating project loading, frame loop, world state, physics, input, UI, material, and renderer orchestration responsibilities.
12. New engine systems such as `engine`, `world`, `physics`, `input`, `ui`, and `renderer` must stay semantic/adapter-neutral; platform, Three.js, browser, Rapier, WebSocket, or DOM details belong in adapter subtrees.

## Performance Budget

Initial vertical-slice targets:

| Metric                         |         Desktop Target |        Mobile Target |
| ------------------------------ | ---------------------: | -------------------: |
| Initial app and vendor JS gzip |              <= 350 KB |            <= 350 KB |
| Initial 3D assets              |     <= 8 MB compressed |   <= 5 MB compressed |
| Total demo assets              |    <= 25 MB compressed |  <= 15 MB compressed |
| Visible draw calls             |                 <= 180 |               <= 100 |
| Visible triangles              |                <= 250k |              <= 100k |
| Dynamic characters             | <= 10 players + 12 NPC | <= 6 players + 8 NPC |
| Texture memory                 |              <= 128 MB |             <= 64 MB |
| Frame rate                     |          60 fps target |       30 fps minimum |
| Pixel ratio                    |       adaptive 1.0-2.0 |       capped 1.0-1.5 |

## Shader GLSL MVP Integration

The Web3D Shader GLSL MVP docs are accepted as a roadmap input, but shader work should not begin by writing one-off visual effects. It must first establish a data-first material runtime contract that preserves Sinan's existing architecture boundaries.

Integrated decisions:

- Keep `renderStyle` as the high-level built-in style switch from Phase 16. Do not repurpose it into a shader runtime.
- Add a separate renderer-neutral material layer under `src/runtime/materials/**` with `MaterialDefinition`, public `MaterialParameter` metadata, `MaterialRegistry`, and `MaterialRuntime` contracts.
- Add the Three.js implementation under `src/runtime/three/materials/**`, including `ThreeMaterialFactory`, `ThreeMaterialRuntime`, fallback material creation, and shader compile diagnostics.
- Store GLSL sources under `src/shaders/**` and import them with Vite `?raw`. Add the required TypeScript declarations before using `.glsl` files.
- Extend renderable data with explicit material slot assignment while preserving the existing Phase 16 `renderStyle` path for ordinary built-in materials.
- Add material parameter tracks and actions through schemas, registries, validators, and runtime adapters. Timeline and events use public material parameter names; only the material runtime maps those names to uniforms.
- Treat texture metadata, especially `colorSpace`, as a Phase 17 prerequisite. Color textures should be declared separately from data/noise/mask textures so Phase 18+ can assign Three texture color spaces correctly.
- Postprocessing is a separate runtime pass and should only start after material runtime, texture metadata, and at least one production material are stable.

Shader stage mapping:

| Shader Stage                   | Roadmap Phase | Purpose                                                                                        |
| ------------------------------ | ------------- | ---------------------------------------------------------------------------------------------- |
| S0 Infrastructure              | Phase 18      | Material runtime contracts, `.glsl?raw`, Three ShaderMaterial backend, fallback, compile tests |
| S1 First story material        | Phase 19      | Dissolve material, material timeline/action integration, Material Inspector MVP                |
| S2 Globals and second material | Phase 20      | Shared shader globals, second material, material sharing/cloning, lifecycle tests              |
| S3 Postprocessing              | Phase 20      | Initial `EffectComposer`/pass runtime and postprocess parameter path                           |
| S4 Production quality          | Phase 21      | Compile/visual regression, HMR/error handling, mobile and precompile baseline                  |

## Engine Positioning Integration

`docs/engine-positioning-architecture-adjustment-plan.md` is accepted as a roadmap input after the Sinan Engine positioning update. The important planning change is that Phase 18 should not be followed immediately by story-material work. First, the project needs a small architecture checkpoint so the editor viewport stops serving as the implicit engine root.

Integrated decisions:

- Sinan Engine is now the product framing. The earlier Scene Director scope remains a first-party Director System for events, actions, timelines, camera shots, animation cues, and cinematic flow.
- Director System orchestrates engine systems; it must not own world state, input interpretation, physics/trigger detection, UI lifetime, Three.js materials, or raw shader uniforms.
- Add Phase 18.5 before Phase 19. It is a lightweight alignment checkpoint, not a broad engine rewrite.
- Phase 18.5 should introduce `EngineSession`, `EngineLoop`, `EngineMode`, minimal renderer-neutral `World`, and `EditorSessionBridge`.
- Phase 18.5 should move project loading, update/render/dispose orchestration, and the bulk of frame lifecycle responsibility out of `src/editor/Viewport.tsx`.
- Phase 18.5 should update boundary checks so future semantic directories such as `src/engine/**`, `src/world/**`, `src/physics/**`, `src/input/**`, `src/ui/**`, and `src/renderer/**` cannot import Three.js directly.
- Project identity migration such as package rename from `sinan-scene-director` to `sinan-engine` should be a separate small phase/commit and should not be mixed with EngineSession or shader/gameplay changes.

## Phase 15: Abeto Scope Lock

Goal: convert the current gap analysis into clean, actionable project documents before implementation starts.

Estimated rounds: 4.

Scope:

- Confirm Phase 14 release-candidate status and list any blocker that must be resolved first.
- Preserve the original gap plan, but create clean UTF-8 project docs that executors can read reliably.
- Lock the vertical-slice scope, non-scope, performance budgets, validation gates, and implementation order.
- Define the initial schema/system inventory for phases 16-22.
- Update project entry points so a development AI knows what to read.

Acceptance:

- A clean roadmap document exists and is linked from the main project plan.
- Phase 16 has a dedicated goal-mode guide ready to generate or use.
- Performance budgets and non-goals are explicit.
- The current dirty/untracked worktree status is documented, not accidentally staged.
- Documentation validation passes.

## Phase 16: Stylized Runtime Foundation

Goal: make the current Gate Demo capable of switching from default Three.js blockout rendering to a Sinan palette-toon style.

Estimated rounds: 4.

Status: PASS. Final report: `docs/phase-16-stylized-runtime-foundation-final-report.md`.

Execution: `docs/phase-16-stylized-runtime-foundation-goal-mode-execution-guide.md` expands this into a 16-round goal-mode plan. Implementation notes and authoring guidance are captured in `docs/phase-16-stylized-runtime-foundation.md` and `docs/developer-guide.md`.

Scope:

- Add `renderStyle` schema and renderer-neutral runtime types.
- Add palette-toon material profile, fallback standard profile, and low-end profile switches.
- Add outline/highlight support for interactable, selected, player, and NPC objects.
- Add lightweight fog/color grade controls.
- Update generated development assets or metadata so the existing demo can use the style.
- Add unit and smoke coverage for style application and fallback.

Acceptance:

- Gate Demo objects can use `standard` or `palette-toon` from data.
- Interactable objects and selection are visually distinguishable without affecting editor helpers.
- Low-end profile can disable outline or expensive style features.
- No Three.js imports leak into renderer-neutral layers.

## Phase 17: Asset Budget And Compression

Goal: make assets measurable before the project grows beyond demo scale.

Status: PASS on 2026-06-19. Final report: `docs/phase-17-asset-budget-compression-final-report.md`.

Estimated rounds: 4.

Scope:

- Extend asset manifest metadata with category, material profile, triangle budget, texture budget, texture colorSpace, LOD group, compression status, and instancing hint.
- Add `AssetBudgetValidator` and `report-assets`.
- Add loader strategy for Draco or meshopt, plus KTX2/Basis texture support if practical.
- Prepare the texture metadata contract needed by the Phase 18 Shader GLSL Material Runtime Foundation.
- Document Blender/GLB/optimization workflow.

Acceptance:

- `npm run report-assets` reports model, texture, animation, compression, and budget status.
- Over-budget assets fail validation or produce explicit warnings according to policy.
- Texture assets can distinguish color maps from data/noise/mask textures through metadata.
- Compressed production assets can be loaded or the loader strategy is documented with tests around fallback.

## Phase 18: Shader GLSL Material Runtime Foundation

Goal: make custom shader materials possible without leaking Three.js or uniforms into data, timeline, events, or editor semantics.

Estimated rounds: 6.

Execution: `docs/phase-18-shader-glsl-material-runtime-foundation-goal-mode-execution-guide.md` expands this into a 16-round goal-mode plan.

Current status: PASS on 2026-06-20. Final report: `docs/phase-18-shader-glsl-material-runtime-foundation-final-report.md`.

Scope:

- Add renderer-neutral `MaterialDefinition`, `MaterialParameter`, `MaterialRegistry`, and `MaterialRuntime` contracts under `src/runtime/materials/**`.
- Add `.glsl?raw` support and the first `src/shaders/**` directory structure.
- Add Three runtime material implementation under `src/runtime/three/materials/**`.
- Add `THREE.ShaderMaterial` creation, typed uniform mapping, fallback material creation, and compile diagnostics.
- Extend renderable data with material slot assignment while preserving Phase 16 `renderStyle` behavior.
- Add ReferenceResolver checks for material ids, material slots, parameters, and texture asset references.
- Add browser shader compile tests using the real renderer path.

Acceptance:

- A material definition can be loaded, validated, and resolved to a Three `ShaderMaterial` through the runtime adapter.
- Public material parameters are distinct from internal uniform names.
- Invalid shader/material references fail with actionable validation errors.
- Shader compile failures use an explicit fallback material and are not silent.
- No Three.js imports leak into renderer-neutral layers.

## Phase 18.5: Engine Core Alignment

Goal: make the runtime/editor architecture match the Sinan Engine positioning before adding the first production story material.

Estimated rounds: 3.

Current status: PASS on 2026-06-20. Final report: `docs/phase-18-5-engine-core-alignment-final-report.md`.

Scope:

- Add a thin `EngineSession` that receives project data and a `WebRuntime` implementation, then owns project load, runtime object synchronization, update/render, and disposal orchestration.
- Add `EngineLoop` and `EngineMode` so edit, preview, play, and future showcase modes have an explicit update lifecycle.
- Add a minimal renderer-neutral `World` layer initialized from `LevelData`, with entity/component lookup and transform read/write helpers sufficient for current editor/runtime flows.
- Add `EditorSessionBridge` so `Viewport.tsx` can focus on canvas mount, editor input bridge, selection, and React UI state instead of acting as the engine root.
- Move the current project-loading/frame-loop responsibilities out of `Viewport.tsx` in small steps without changing user-visible editor behavior.
- Update boundary checks for new semantic directories and document the new engine/editor/runtime split.

Acceptance:

- Existing editor behavior, Gate Demo loading, timeline preview, transform editing, save/reload, and shader compile smoke still pass.
- `Viewport.tsx` no longer owns the main project load/update/render/dispose loop.
- `EngineSession` and `World` do not import Three.js or React.
- `WebRuntime` remains the renderer adapter contract; `ThreeRuntime` remains the Three implementation facade.
- No new gameplay, dissolve material, material timeline/action, physics engine, input map, runtime UI, LOD, spherical world, or multiplayer behavior is added.

## Phase 19: Shader Dissolve And Material Timeline

Goal: prove that GLSL shader materials can serve real story/demo behavior instead of remaining isolated tech samples.

Estimated rounds: 6.

Scope:

- Add the first production story material, likely a dissolve/open-gate material, with separate vertex and fragment GLSL files.
- Add or reuse a noise/data texture with correct Phase 17 texture metadata.
- Add a `material.parameter` timeline track that samples public material parameters such as `progress`.
- Add a `material.setParameter` action through schema, registry, runtime adapter, validation, and tests.
- Add Material Inspector MVP controls for public material parameters and validation state.
- Add a visual fixture or smoke path proving the material changes over time.

Acceptance:

- Timeline playback and scrub can drive a material parameter deterministically.
- Events/actions can set material parameters through the registry path.
- The editor can inspect public material parameters without exposing raw uniforms as authoring fields.
- The dissolve material compiles in browser tests and has a stable fallback.

## Phase 20: Shader Globals And Postprocessing Ramp

Goal: make shader behavior reusable across the runtime and add the first controlled postprocessing path.

Estimated rounds: 6.

Execution: `docs/phase-20-shader-globals-and-postprocessing-ramp-goal-mode-execution-guide.md` defines the goal-mode plan.

Scope:

- Add a renderer-neutral `ShaderGlobals` contract for values such as time, delta time, viewport size, and optional world/player signals.
- Add a second material, such as hologram/scanline/highlight, to prove the runtime is not hard-coded to dissolve.
- Add material sharing, cloning, and lifecycle/disposal tests.
- Add the first postprocessing runtime under `src/runtime/three/**` using `EffectComposer`, `RenderPass`, and final output handling.
- Add a small postprocess parameter path only after material parameter handling is stable.
- Clarify the boundary between Phase 16 `ThreeEnvironmentStyle.colorGrade` and real postprocessing.

Acceptance:

- Multiple materials can receive shared shader globals without per-frame React state.
- Material sharing/cloning behavior is explicit and tested.
- The first postprocess pass can be enabled, disabled, and validated without double-applying color-space conversion.
- Runtime memory/program counters remain within the accepted budget for the demo.

## Phase 21: Shader Production Quality Gate

Goal: make shader work reliable enough for future visual development and vertical-slice release hardening.

Estimated rounds: 4.

Status: PASS on 2026-06-20. Final report: `docs/phase-21-shader-production-quality-gate-final-report.md`.

Execution: `docs/phase-21-shader-production-quality-gate-goal-mode-execution-guide.md` defines the goal-mode plan.

Scope:

- Add browser compile coverage for all production shader materials and postprocess passes.
- Add visual regression fixtures for the shader paths that affect demo presentation.
- Add shader HMR guidance for development and structured shader error output for debugging.
- Add precompile guidance for known production materials.
- Add mobile or low-end shader performance baseline and documentation.

Acceptance:

- Production shaders have compile tests, visual fixtures, and documented fallback behavior.
- Shader error messages identify material id, shader stage, source file, and affected entity or slot when practical.
- Mobile/low-end shader guidance is recorded before LOD/world/gameplay phases depend on it.

## Phase 21.5: Engine Maturity And External Infrastructure Contract Gate

Goal: convert the external infrastructure cooperation strategy and mature-engine gap analysis into Sinan-owned contracts before LOD, instancing, spherical world, gameplay input, physics, Runtime UI, audio, and narrative authoring work start depending on external systems.

Estimated rounds: 6.

Execution: `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-goal-mode-execution-guide.md` defines the 6-round goal-mode plan.

Scope:

- Review and align RFC-001 through RFC-004 for assets, input, Runtime UI, and camera.
- Add RFC-005 Narrative / Inscape Bridge Boundary.
- Add RFC-006 Physics Adapter Boundary.
- Add RFC-007 Audio System Boundary.
- Define adapter boundary policy for future `src/assets/adapters/**`, `src/input/adapters/**`, `src/camera/adapters/**`, `src/ui/adapters/**`, `src/physics/adapters/**`, `src/audio/adapters/**`, and `src/narrative/adapters/**`.
- Add partner POC brief, mature dependency evaluation, and compatibility matrix templates.
- Route future POCs through `docs/phase-21-5-poc-sequencing-and-roadmap-routing.md` without making them hard dependencies for Phase 22.
- Update roadmap entry points and produce a Phase 21.5 final report.

Acceptance:

- Sinan-owned RFCs and templates exist before external infrastructure enters implementation phases.
- Future early partners and mature dependencies are evaluated through adapter, fallback, validation, and compatibility gates.
- Phase 21.5: Engine Maturity And External Infrastructure Contract Gate provides the roadmap routing between Phase 21 and Phase 22.
- No external dependency is installed and no runtime adapter is implemented in Phase 21.5.
- Phase 22 remains the next implementation phase after this contract gate passes.

## Phase 22: LOD, Instancing, And Vegetation

Goal: make repeated objects and distant content controllable.

Estimated rounds: 5.

Scope:

- Add LOD schema, runtime types, and Three runtime switching.
- Add hysteresis or another anti-popping strategy.
- Add instance scatter schema and deterministic seeded scatter.
- Add Three InstancedMesh support for vegetation, rocks, lamps, or equivalent repeated props.
- Add low-end device profile LOD bias.
- Add perf smoke around draw calls, triangles, and runtime memory signals.

Acceptance:

- At least one asset supports three LOD levels.
- At least one scatter group renders through instancing.
- Low-end profile uses more aggressive LOD bias.
- Perf smoke can prove draw calls and triangles remain under budget for the demo scene.

## Phase 23: Compact Spherical World Prototype

Goal: move from the room demo to a small readable spherical world blockout.

Estimated rounds: 6.

Scope:

- Add world projection schema and cube-sphere projection logic.
- Add spherical placement bridge in Three runtime.
- Add player surface movement and stable spherical camera behavior.
- Add world/region data for at least three regions such as city, hill, and beach.
- Keep local authoring coordinates readable while runtime maps them to sphere space.
- Ensure director camera shots can target spherical-world positions.

Acceptance:

- The player can move around the small sphere.
- Camera orientation is stable across region transitions.
- Three regions are readable in Showcase Mode or preview.
- Existing editor and validation boundaries remain intact.

## Phase 24: Delivery Gameplay Showcase

Goal: produce a playable single-player Messenger-like vertical slice.

Estimated rounds: 6.

Status: PASS on 2026-06-22. Final report: `docs/phase-24-delivery-gameplay-showcase-final-report.md`.

Scope:

- Add Showcase Mode without editor panels.
- Add player controller and interaction radius.
- Add delivery job schema, data, validators, and editor affordances.
- Add route markers, delivery target feedback, completion feedback, and one NPC or mailbox endpoint.
- Add 1-2 complete delivery jobs.

Acceptance:

- Opening Showcase Mode lets a user move, accept, deliver, and complete a job.
- Job state is data-driven and validated.
- Editor Mode can still inspect or edit the job data.
- Browser smoke covers a successful job flow.

## Phase 25: Multiplayer-lite Social Layer

Goal: add a small shared-space prototype after the single-player Showcase is stable.

Estimated rounds: 5-6.

Scope:

- Add local remote-player simulator first.
- Add avatar, emote, stamp, and network message schemas.
- Render remote avatars and 3D emoji/stamp events.
- Add a small WebSocket room prototype with join, pose, emote, snapshot, and disconnect messages.
- Limit room size and message rate.

Acceptance:

- Ten remote avatars can be simulated locally without obvious performance collapse.
- Emoji/stamps render in the 3D world.
- Network messages validate and invalid messages do not break runtime state.

## Phase 26: Vertical Slice RC Hardening

Goal: make the Messenger-like slice reproducible, measurable, and demo-ready.

Estimated rounds: 3.

Execution: `docs/phase-26-vertical-slice-rc-hardening-goal-mode-execution-guide.md` expands this into a 10-round goal-mode plan.

Scope:

- Add mobile and low-end profile validation.
- Add perf smoke and budget reports to release checks.
- Update README, developer guide, asset guide, and vertical-slice release checklist.
- Run fresh checkout validation where practical.

Acceptance:

- Full validation, smoke, perf smoke, and asset report pass.
- Release docs explain how to run, validate, and demo the vertical slice.
- Git status is clean and pushed.

## Recommended Next Guides

Phase 15 status is recorded in `docs/phase-15-abeto-scope-lock-final-report.md`. If that report is not PASS, finish Phase 15 first:

```txt
Complete Phase 15 from docs/abeto-messenger-development-plan.md: lock the Abeto Messenger-like vertical-slice scope, clean up readable project documentation, define budgets and phase gates, update entry points, and prepare Phase 16 implementation handoff without staging unrelated current worktree changes.
```

After Phase 16 is committed and pushed with a PASS final report, use `docs/phase-17-asset-budget-compression-goal-mode-execution-guide.md` and this implementation goal:

```txt
Complete Phase 17 from docs/abeto-messenger-development-plan.md: Asset Budget And Compression.
```

Before starting Phase 17, re-read `AGENTS.md` and `docs/Sinan_Scene_Director_研发方案与架构指南.md` and keep Three.js/compression-loader work inside `src/runtime/three/**`.

The Phase 17 goal-mode guide uses a 16-round budget: 12 implementation rounds, 3 buffer rounds, and 1 final validation/handoff round.

Shader integration update: before starting Phase 17, also read `docs/Web3D_Shader_GLSL_MVP_支持度评估与实施计划.md` and `docs/Web3D_Shader_研发方案与架构指南_GLSL_MVP.md`. Phase 17 prepares shader prerequisites through texture metadata and loader strategy, but it must not implement `MaterialRuntime`, `ShaderMaterial`, material timeline tracks, or postprocessing.

Phase 21 is PASS. `docs/phase-21-shader-production-quality-gate-final-report.md` records the final validation and push evidence. The next goal should be Phase 21.5: Engine Maturity External Contract Gate.

```txt
Complete Phase 21.5 from docs/abeto-messenger-development-plan.md: Engine Maturity External Contract Gate.
```

Use `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-goal-mode-execution-guide.md` before implementation. The guide uses 6 rounds: 4 documentation/architecture rounds, 1 buffer round, and 1 final validation/handoff round. Phase 21.5 should create Sinan-owned RFCs, adapter boundary policy, POC briefs, mature dependency evaluation templates, and compatibility matrix documents before Phase 22.

Start only after confirming `docs/phase-21-shader-production-quality-gate-final-report.md` is PASS and pushed. Phase 21.5 must remain a contract/documentation gate and must not implement LOD, input, physics, Runtime UI, audio, narrative importers, real external adapters, or runtime dependency integrations.

Use `docs/phase-21-5-poc-sequencing-and-roadmap-routing.md` to decide which future POCs belong before, beside, or after Phase 22. Phase 22 is still LOD, Instancing, And Vegetation by default; external infrastructure POCs require their own scoped guide unless a later phase explicitly adopts one.

Before starting Phase 21.5, re-read `AGENTS.md`, the main architecture guide, `docs/engine-positioning-architecture-adjustment-plan.md`, the Phase 18, Phase 18.5, Phase 19, Phase 20, and Phase 21 final reports, both Web3D Shader GLSL MVP docs, and the current runtime/editor architecture.

After Phase 21.5 is PASS and pushed, Phase 22 LOD, Instancing, And Vegetation may start. Phase 22 remains blocked until Phase 21.5 produces its PASS final report and pushed commits.

Phase 21.5 is PASS in `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md`. The next goal should be Phase 22: LOD, Instancing, And Vegetation.

```txt
Complete Phase 22 from docs/abeto-messenger-development-plan.md: LOD, Instancing, And Vegetation. Start only after Phase 21.5 is PASS and pushed. Keep LOD and instancing data source-of-truth JSON with schema and validation; keep Three InstancedMesh, GLTF, texture, and compression details under src/runtime/three/**. Do not make Indirection, InputFlow, ViewRig, LudoWeave, Inscape, Physics, or Audio a hard dependency unless a scoped Phase 22 guide explicitly expands scope while preserving Phase 21.5 boundaries.
```

Use `docs/phase-22-lod-instancing-and-vegetation-goal-mode-execution-guide.md` before implementation. The guide uses 12 rounds: 8 implementation rounds, 2 buffer rounds, 1 integrated validation/hardening round, and 1 final validation/handoff round. Phase 22 should use traditional data-driven LOD with preauthored or offline-generated LOD assets; runtime dynamic mesh reduction, Nanite-style virtualized geometry, external asset-pipeline dependencies, Phase 23 spherical world work, and unrelated external adapters remain out of scope.

Phase 22 is PASS in `docs/phase-22-lod-instancing-and-vegetation-final-report.md`. The next goal should be Phase 23: Compact Spherical World Prototype.

```txt
Complete Phase 23 from docs/abeto-messenger-development-plan.md: Compact Spherical World Prototype. Start only after Phase 22 is PASS and pushed. Keep spherical placement, camera behavior, player movement, and region readability data-first. Use Phase 22 LOD, scatter, instancing, and low-end profile work only as renderer infrastructure; do not add Physics, InputFlow, ViewRig, LudoWeave, Inscape, Runtime UI, Audio, narrative importers, multiplayer, or external adapters unless a scoped Phase 23 guide explicitly approves them while preserving Phase 21.5 boundaries.
```

Use `docs/phase-23-compact-spherical-world-prototype-goal-mode-execution-guide.md` before implementation. The guide uses 16 rounds: 12 implementation rounds, 3 buffer rounds, and 1 final validation/handoff round. Phase 23 should produce the compact spherical-world prototype only: projection schema, cube-sphere math, spherical placement, three readable regions, minimal deterministic player surface movement, stable spherical camera behavior, director camera compatibility, and smoke/perf evidence. Delivery jobs, full Showcase Mode, Physics/Rapier, InputFlow, ViewRig, Runtime UI, Audio, multiplayer, and external adapters remain out of scope.

Phase 24 is PASS in `docs/phase-24-delivery-gameplay-showcase-final-report.md`. Phase 25 is PASS in `docs/phase-25-multiplayer-lite-social-layer-final-report.md`. The next full-route goal should be Phase 26: Vertical Slice RC Hardening.

```txt
Complete Phase 26 from docs/abeto-messenger-development-plan.md: Vertical Slice RC Hardening. Start only after Phase 25 is PASS and pushed. Preserve Showcase Mode, delivery job smoke, the multiplayer-lite social simulator/WebSocket smoke, low-end budgets, and the data-first runtime boundaries while preparing release-candidate documentation and reproducible validation.
```

Use `docs/phase-26-vertical-slice-rc-hardening-goal-mode-execution-guide.md` before implementation. The guide uses 10 rounds: 6 main hardening/documentation rounds, 2 buffer rounds, 1 integrated RC gate, and 1 final validation/handoff round. Phase 26 should harden release validation, low-end/mobile evidence, smoke/perf budget reporting, README/developer/release docs, and fresh-checkout evidence where practical. Production backend, auth, persistence, text/voice chat, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape adapters, production Runtime UI framework, Audio runtime, new gameplay, and unrelated external adapters remain out of scope unless a later scoped guide explicitly approves them.
