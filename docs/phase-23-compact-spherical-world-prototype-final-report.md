# Phase 23 Compact Spherical World Prototype Final Report

Date: 2026-06-22

## Status

PASS.

Phase 23 is complete and pushed through the integrated gate. The implementation adds a
data-first compact spherical-world prototype with cube-sphere projection, spherical entity
placement, three readable regions, deterministic surface movement, stable spherical camera
sampling, director camera compatibility, and smoke/perf evidence. It does not implement
delivery jobs, full Showcase Mode, Physics/Rapier, InputFlow, ViewRig, LudoWeave, Inscape,
Runtime UI, Audio, multiplayer, external adapters, or Phase 24 gameplay scope.

## Completed

- Locked the Phase 23 design in `docs/phase-23-compact-spherical-world-prototype.md`.
- Added `cube-sphere` world projection schema, validation, duplicate-region checks, and
  reference validation for LOD/scatter hooks.
- Added cube-sphere projection math with deterministic surface frames, normals, tangents,
  bitangents, and quaternion rotation output.
- Added renderer-neutral spherical placement derivation and runtime diagnostics.
- Wired spherical placement through `EngineSession`, `WebRuntime`, and `ThreeRuntime`.
- Added compact demo data with `city`, `hill`, and `beach` regions in
  `data/levels/level_01.json`.
- Added deterministic player surface movement on spherical regions and an engine-session
  movement preview seam.
- Added stable surface-follow camera sampling and director camera shot support for spherical
  points.
- Kept Phase 22 LOD/scatter/instancing readable on the compact world with standard and low-end
  perf evidence.
- Added Playwright smoke diagnostics for spherical placement, movement, camera pose application,
  LOD, scatter, and nonblank canvas checks.
- Updated roadmap entry points to recommend Phase 24 next.

## Projection Contract

- Schema: `src/schemas/worldProjection.schema.ts` owns `WorldProjectionSchema`,
  `SphericalRegionSchema`, and `EntityPlacementSchema`.
- Level data: `data/levels/level_01.json` declares a `cube-sphere` projection with radius `6`.
- Region data: the demo world has `city`, `hill`, and `beach` regions with face assignment,
  local bounds, style hints, and LOD hooks; `city` also references `scatter_switch_markers`.
- Cube-sphere math: `src/world/CubeSphereProjection.ts` converts a region face plus local
  coordinates into a surface frame with position, normal, tangent, bitangent, and rotation.
- Local authoring model: source JSON keeps authored local positions and yaw through
  `placement.mode = "spherical-region"` while preserving legacy `transform` as fallback data.
- Runtime derived transforms: `src/world/SphericalPlacement.ts` derives renderer-neutral runtime
  transforms and diagnostics from level data.
- Fallback behavior: missing projection or stale region references produce diagnostics and keep
  the affected entity on its authored transform.

## Spherical Runtime

- Three placement bridge: `src/runtime/three/ThreeRuntime.ts` applies derived spherical transforms
  through `setSphericalPlacements` and exposes cloned diagnostics.
- Engine bridge: `src/engine/EngineSession.ts` sends placement diagnostics to runtime after
  project load and after successful movement preview steps.
- LOD/scatter integration: `switch_a` remains LOD-driven after spherical placement; standard
  profile selects `model.switch_wall.lod0`, low-end selects `model.switch_wall.lod1`, and
  `scatter_switch_markers` stays a non-selectable instanced batch.
- Region readability: standard runtime evidence covers all three spherical regions, 5 spherical
  placements, 6 scatter instances, and 1 instanced draw-call estimate.
- Diagnostics: `?runtimeDiagnostics=1` exposes read-only spherical diagnostics plus smoke-only
  movement and camera hooks in `src/editor/Viewport.tsx`.
- Known editor limitation: the editor source data still shows authored transforms; spherical
  transforms are runtime-derived diagnostics, not a new authoring UI.

## Player Movement

- Movement contract: `src/world/SurfaceMovement.ts` owns deterministic kinematic surface
  movement with `forward`, `turn`, `deltaSeconds`, movement speed, and turn speed.
- Engine preview: `World.stepSphericalMovement` and `EngineSession.stepSphericalMovement` update
  spherical placement state for preview/smoke without adding production input.
- Smoke seam: Playwright calls `__SINAN_RUNTIME_STEP_SPHERICAL_MOVEMENT__` for
  `player_spawn_01` and verifies that the runtime position changes.
- Edge behavior: region-local X/Z bounds are clamped; no region-to-region traversal or seam
  crossing is implemented in Phase 23.
- Limitations: this is not InputFlow, a production player controller, collision, Physics/Rapier,
  or route interaction.

## Camera

- Spherical camera behavior: `src/world/SphericalCamera.ts` samples surface-relative follow
  camera poses using the region normal as camera up.
- Director compatibility: `src/schemas/cameraShot.schema.ts`, `CameraShotPlayer`, and
  `WorldCameraShotResolver` support spherical-region camera points while keeping flat camera
  shots valid.
- Smoke evidence: Playwright dynamically samples `city` and `hill` spherical camera poses,
  applies them through `__SINAN_RUNTIME_APPLY_CAMERA_POSE__`, captures nonblank frames, and
  verifies expected surface-up vectors.
- Boundary: Phase 23 does not introduce ViewRig or full gameplay camera behavior.

## Perf And Smoke Evidence

- Draw calls: `scatter_switch_markers` remains budgeted as one instanced draw-call estimate.
- Triangle estimates: standard profile records 24 LOD triangles for `switch_a` and 72 scatter
  triangles; low-end records 12 LOD triangles and 36 scatter triangles.
- Instance counts: standard profile renders 6 scatter instances; low-end renders 3.
- Movement/camera smoke: browser smoke verifies spherical placement count, region coverage,
  player movement, camera pose application, and nonblank canvas output.
- Low-end profile: runtime tests prove lower-detail LOD selection and reduced scatter counts.
- Browser/GPU memory limitations: GPU memory counters remain environment-sensitive, so Phase 23
  gates deterministic diagnostics and smoke output rather than raw browser memory.

## Validation

- `Validate.cmd`: PASS; format, typecheck, lint, build, Vitest, boundary checks, data
  validation, asset report, and migration check passed.
- `Smoke.cmd`: PASS; 27 Playwright Chromium smoke tests passed.
- Targeted tests: PASS; `npm run test -- spherical smoke perf low-end` passed 11 files /
  30 tests. Earlier round targets also passed for spherical camera/follow/surface, director
  camera spherical points, and LOD/scatter low-end integration.
- Data validation: PASS; 5 prefabs, 1 level, 3 events, 1 timeline, 1 camera shot, 1 palette,
  8 assets.
- Asset report: PASS; 8 assets, 24884 B used, 46080 B budget, 0 issues.
- Boundary checks: PASS; Three.js remains isolated to runtime/editor boundaries and no dynamic
  code patterns were introduced.
- Required search gate: PASS; Phase 23/Phase 24/spherical-world references are discoverable
  across `docs`, `src`, `data`, `tests`, and `scripts`.
- `git diff --check`: PASS.

## Commits And Push

- `1864637` docs: lock phase 23 spherical world plan; pushed to `origin/main`.
- `f0fef81` feat: add spherical world schema; pushed to `origin/main`.
- `5b88f7c` feat: add cube sphere projection math; pushed to `origin/main`.
- `86b6e97` feat: add spherical placement runtime contract; pushed to `origin/main`.
- `0f8d3c4` feat: apply spherical placement in three runtime; pushed to `origin/main`.
- `9ddf039` feat: add compact spherical region data; pushed to `origin/main`.
- `92d9978` feat: add player surface movement contract; pushed to `origin/main`.
- `c7ed911` feat: integrate spherical movement preview; pushed to `origin/main`.
- `9d4c695` feat: add spherical camera stabilization; pushed to `origin/main`.
- `5ea2555` feat: support spherical director camera targets; pushed to `origin/main`.
- `24e5409` test: integrate spherical lod scatter readability; pushed to `origin/main`.
- `705e6c7` test: add spherical world smoke gate; pushed to `origin/main`.
- Final report and roadmap handoff commit: `docs: finalize phase 23 spherical world prototype`;
  pushed after final validation.

## Buffer

No buffer rounds were consumed. Rounds 23.13, 23.14, and 23.15 were kept unused because the
implementation rounds and Round 23.12 integrated smoke gate passed after in-round fixes.

## Known Limitations

- The compact world is a cube-sphere prototype, not final terrain, streaming world, or folded
  world production implementation.
- Movement clamps inside a region and does not yet cross spherical region seams.
- The movement preview is deterministic and command-driven; production input mapping remains
  out of scope.
- The camera helper provides stable surface-relative poses but does not replace ViewRig or a
  complete gameplay camera system.
- Scatter placement remains authored box/Y-up data from Phase 22; Phase 23 only proves it stays
  readable alongside spherical regions.
- Region styling is metadata and diagnostics only; no dedicated spherical-world art tool was
  added.
- Phase 23 deliberately did not implement delivery jobs, route markers, target feedback,
  progression, full Showcase Mode, Physics/Rapier, InputFlow, ViewRig, Runtime UI, Audio,
  multiplayer, external adapters, or any Phase 24 scope.

## Remaining Blockers

None.

## Recommended Next Goal

Complete Phase 24 from `docs/abeto-messenger-development-plan.md`: Delivery Gameplay Showcase.
Start only after this Phase 23 PASS final report is pushed. Use the compact spherical-world
prototype as the playable environment, but keep delivery jobs, route feedback, player
interaction, Runtime UI, audio, and any new input semantics scoped by the Phase 24 guide.
