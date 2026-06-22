# Phase 23 Compact Spherical World Prototype Goal Mode Execution Guide

Date: 2026-06-22
Status: Guide for an executor running Phase 23 in goal mode.

Phase 23 starts after Phase 22 LOD, Instancing, And Vegetation is PASS and pushed. The accepted baseline is `699dfd7 docs: finalize phase 22 lod instancing vegetation` on `main` / `origin/main`.

The goal of this phase is to move from the room demo toward a small readable spherical-world blockout. Phase 23 adds data-first world projection contracts, cube-sphere projection logic, spherical placement, a minimal player surface movement prototype, stable spherical camera behavior, and at least three readable regions. It must not implement Phase 24 delivery jobs, full Showcase Mode, Physics/Rapier, InputFlow, ViewRig, Runtime UI, Audio, Inscape/narrative importers, multiplayer, or external adapters.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 23 for Sinan: Compact Spherical World Prototype. Start only after Phase 22 is PASS and pushed; the accepted baseline is 699dfd7 docs: finalize phase 22 lod instancing vegetation. Read AGENTS.md, docs/development-plan.md, docs/abeto-messenger-development-plan.md, docs/post-mvp-execution-workflow.md, docs/phase-22-lod-instancing-and-vegetation-final-report.md, docs/phase-22-lod-instancing-and-vegetation-goal-mode-execution-guide.md, docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md, docs/strategy/adapter-boundary-policy.md, docs/rfcs/rfc-004-sinan-camera-pose-shot-rig-boundary.md, docs/developer-guide.md, docs/Sinan_Scene_Director_研发方案与架构指南.md, .codex/project-ops-workflow.json, and .codex/project-git-workflow.json before editing. Implement Phase 23 only: add world projection schema and validation, cube-sphere projection math, data-first spherical placement, Three runtime spherical placement bridge, compact world/region data for at least three readable regions, a minimal deterministic player surface movement prototype, stable spherical camera behavior, director camera shot support for spherical-world positions, smoke/perf evidence, docs, and a Phase 23 final report. Keep data/**/*.json as the source of truth. Keep Three.js projection meshes, helper geometry, camera rig internals, renderer counters, LOD/instancing details, and visual bridge code inside src/runtime/three/** and smoke/test fixtures. Do not add Physics/Rapier, InputFlow, ViewRig, LudoWeave, Inscape, Runtime UI, Audio, delivery jobs, full Showcase Mode, multiplayer, external adapters, runtime dynamic mesh reduction, or Phase 24 scope. Every round must run Debug self-check, architecture self-check, validation, commit, and push before proceeding.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `docs/development-plan.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/phase-22-lod-instancing-and-vegetation-final-report.md`
- `docs/phase-22-lod-instancing-and-vegetation-goal-mode-execution-guide.md`
- `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md`
- `docs/phase-21-5-poc-sequencing-and-roadmap-routing.md`
- `docs/strategy/adapter-boundary-policy.md`
- `docs/rfcs/rfc-001-sinan-asset-boundary.md`
- `docs/rfcs/rfc-004-sinan-camera-pose-shot-rig-boundary.md`
- `docs/phase-21-shader-production-quality-gate-final-report.md`
- `docs/developer-guide.md`
- `docs/Sinan_Scene_Director_研发方案与架构指南.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Inspect these implementation areas before changing them:

- `data/levels/**`
- `data/prefabs/**`
- `data/cameraShots/**`
- `data/assets.manifest.json`
- `src/schemas/level.schema.ts`
- `src/schemas/entity.schema.ts`
- `src/schemas/transform.schema.ts`
- `src/schemas/cameraShot.schema.ts`
- `src/world/**`
- `src/engine/EngineSession.ts`
- `src/runtime/RuntimeTypes.ts`
- `src/runtime/WebRuntime.ts`
- `src/runtime/LodSelector.ts`
- `src/runtime/ScatterGenerator.ts`
- `src/runtime/three/ThreeRuntime.ts`
- `src/runtime/three/ThreeScatterRuntime.ts`
- `src/runtime/three/EditorCameraController.ts`
- `src/director/CameraShotPlayer.ts`
- `src/director/DirectorCameraSystem.ts`
- `src/editor/Viewport.tsx`
- `tests/smoke/editor.spec.ts`
- `scripts/validate-data.ts`
- `scripts/report-assets.ts`
- `scripts/check-boundaries.ts`

Current known context:

- Phase 18.5 created `EngineSession`, `EngineLoop`, minimal `World`, and `EditorSessionBridge` boundaries.
- Phase 21 created the shader quality gate and low-end Chromium baseline.
- Phase 21.5 is PASS and keeps external infrastructure behind Sinan-owned contracts.
- Phase 22 is PASS and added data-first LOD, deterministic scatter, Three `InstancedMesh`, and low-end perf/smoke diagnostics.
- Phase 22 scatter groups are non-selectable instanced batches. Phase 23 may use them for region readability, but must not implement per-instance selection unless explicitly scoped as a small editor/runtime diagnostic.
- Existing room demo data remains valid. Phase 23 may add compact spherical-world data, but it must keep local authoring coordinates readable while runtime maps them to sphere space.
- Existing unrelated dirty or untracked files may be present. Do not stage unrelated external docs, strategy notes, generated screenshots, local reports, or user changes.

## 2. What This Phase Must Complete

Phase 23 must complete:

- A documented Phase 23 design lock for compact spherical world scope.
- World projection schema and validation for at least:
  - Projection type, initially cube-sphere.
  - Sphere radius and face/region dimensions.
  - Region ids, names, readable labels, and local authoring bounds.
  - Mapping from local region coordinates to sphere-space runtime positions.
  - Optional region style/LOD/scatter hooks that remain renderer-neutral.
- Cube-sphere projection logic with deterministic math and tests.
- A spherical placement bridge that converts data-first local positions into runtime transforms without storing Three objects or derived sphere-space transforms as source data.
- Three runtime spherical placement support under `src/runtime/three/**`.
- World/region data for at least three readable regions, such as city, hill, and beach.
- Existing LOD/scatter/instancing support integrated where useful for distant-region readability.
- A minimal deterministic player surface movement prototype that can move around the small sphere.
- Stable spherical camera behavior across region transitions.
- Director camera shot support for spherical-world positions or targets, while preserving existing flat-world camera shots.
- Smoke/perf evidence that the compact world renders, movement is stable, camera orientation remains readable, and low-end budgets stay practical.
- Documentation updates explaining the Phase 23 contracts, region authoring model, runtime mapping, known limitations, and Phase 24 handoff.
- `docs/phase-23-compact-spherical-world-prototype-final-report.md` with validation, smoke, projection evidence, movement/camera evidence, commits, pushed status, limitations, and Phase 24 handoff.

## 3. What This Phase Must Not Do

Do not:

- Implement Phase 24 delivery jobs, route markers, target feedback, NPC/mailbox endpoints, full Showcase Mode, or game progression.
- Add Physics/Rapier, collision solver, rigid bodies, character controller physics, gravity simulation, or terrain physics.
- Add InputFlow, a full input binding system, user-remappable controls, or production input maps.
- Add ViewRig, LudoWeave, Inscape, Runtime UI, Audio, multiplayer, networking, narrative importers, external adapters, or new runtime dependencies.
- Replace Phase 22 LOD/scatter/instancing contracts or make external asset systems hard dependencies.
- Put Three.js classes, geometry, camera rig internals, face meshes, renderer counters, or derived runtime sphere-space transforms into `data/**/*.json`, schemas outside renderer-neutral contracts, events, director, or editor state.
- Let React own per-frame player movement, camera stabilization, projection math, spherical placement, or runtime transforms.
- Store generated runtime transforms as source data unless they are explicitly authored local coordinates.
- Make old flat-room demo data invalid without a migration and validation strategy.
- Commit generated Playwright output, local screenshots, ad hoc perf logs, or temporary reports unless the guide explicitly marks them as stable source fixtures.
- Stage unrelated untracked files, external reference docs, package experiments, generated outputs, or user changes.

## 4. Architecture Boundaries

Data and schema:

- `data/**/*.json` remains the source of truth for levels, regions, entities, authored local transforms, camera shots, LOD groups, scatter groups, and assets.
- Spherical-world data should store authoring-space intent: region id, local position, local orientation/up hints, authored bounds, and semantic labels.
- Runtime-derived sphere-space positions, normals, tangents, face transforms, and camera quaternions must be computed from source data, not committed as duplicated semantics.
- Schema validation owns projection ranges, region ids, duplicate detection, entity placement references, camera target references, and readable bounds.

World/runtime:

- `src/world/**` may own renderer-neutral projection, placement, region, and movement state.
- `src/runtime/**` may expose renderer-neutral projection/movement/camera types and diagnostics.
- `EngineSession` may route project data into world/runtime systems, but must not import `three`.
- Minimal player movement should be deterministic and kinematic for this phase. If browser input is needed for smoke, keep the input seam narrow and do not create the full Phase 24/25 input system.

Three runtime:

- `src/runtime/three/**` owns sphere meshes, face helpers, Three camera orientation, debug visualization, object transform application, LOD/scatter visual integration, renderer counters, and Three-specific fallback objects.
- Three runtime must preserve existing material, shader global, postprocess, transform gizmo, LOD, scatter, selection, picking, and debug helper behavior.
- Three runtime should expose diagnostics through renderer-neutral or smoke-only hooks, not by leaking Three objects to editor/state layers.

Director/camera:

- Existing `CameraShot` data remains valid.
- Spherical camera support must be backward compatible with static, keyframed, follow, and lookAt shots where practical.
- If new camera target semantics are required, add them through schemas, validation, and tests. Do not adopt ViewRig as a dependency in this phase.

Testing and smoke:

- Unit tests should cover projection math, region validation, spherical placement, movement, camera stabilization, director camera compatibility, and low-end/readability limits.
- Smoke tests should cover a visible compact spherical-world preview, movement around the small sphere, stable camera orientation across regions, nonblank canvas, and practical perf/diagnostic budgets.
- Perf checks should reuse Phase 22 style: deterministic local counters, draw calls, triangle estimates, instance counts, and renderer diagnostics where practical.

## 5. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Confirm Phase 22 final report is PASS and pushed before implementation starts.
3. Inspect current status, dirty files, and implementation files before editing.
4. Define the smallest coherent checkpoint.
5. Implement the checkpoint.
6. Run targeted tests first.
7. Run relevant validation.
8. Run browser smoke when runtime rendering, Three behavior, camera behavior, movement, diagnostics, perf counters, or pixels changed.
9. Run Debug self-check.
10. Run architecture self-check.
11. Inspect status and diff.
12. Stage only Phase 23-relevant files.
13. Commit and push before starting the next round.
14. Report commit hash, push result, validation result, and buffer usage.

Each round summary must include:

- Round objective
- Completed work
- Debug self-check
- Architecture self-check
- Validation commands and results
- Commit hash and push result
- Next round objective
- Whether buffer capacity was consumed

Progression rules:

- If validation fails, do not commit, do not push, and do not proceed.
- If validation is blocked by unrelated pre-existing dirty files, isolate the blocker, report it clearly, and do not stage unrelated fixes unless the user explicitly approves or the fix is required for the phase gate.
- If commit fails, do not proceed.
- If push fails, do not proceed.
- If spherical projection, placement, movement, or camera smoke fails, localize whether the failure is schema, data, projection math, world state, movement update, camera pose, director sampling, Three transform application, LOD/scatter integration, renderer output, browser timing, or UI/editor shell before editing further.
- If generated artifacts appear, keep them out of commits unless explicitly named as source fixtures.
- If Phase 24 delivery gameplay, external adapter work, Physics, InputFlow, Runtime UI, Audio, or multiplayer appears in the current diff, stop and remove it from the Phase 23 commit scope unless the user explicitly changes the phase.

Reusable self-checks for every round:

Debug self-check:

- Can the current change be explained by the smallest relevant fixture or user workflow?
- Can failures be localized to a specific layer such as schema, data validation, projection math, region mapping, world state, movement update, camera sampling, director camera bridge, Three placement bridge, LOD/scatter integration, smoke harness, tooling, CLI, or UI?
- Are success, failure, empty, stale, missing region, invalid face, pole/edge crossing, incompatible camera target, low-end profile, fallback, disposal, and generated-output states covered where relevant?
- If UI changed, was a repeatable smoke or component verification added?
- If state changed, are export/import, validate, migration, report-assets, boundary check, and runtime disposal boundaries covered?

Architecture self-check:

- Does `data/**/*.json` remain the source of truth for world, region, camera, entity, LOD, scatter, and asset semantics?
- Did host/editor/UI code avoid duplicating projection, movement, camera, validation, runtime, or renderer semantics?
- Are public capability/schema contracts, binding/mapping, diagnostics/audit, and runtime state still separated?
- Did the phase avoid Phase 24 delivery gameplay, Physics, InputFlow, ViewRig, Runtime UI, Audio, multiplayer, external adapters, and unrelated engine-module scope?
- Are unrelated files, generated outputs, and user changes left alone?
- Does Three.js remain inside `src/runtime/three/**` and accepted thin editor glue?
- Are Three-specific objects, renderer counters, camera rig internals, and derived runtime transforms kept out of data, events, director semantics, schemas outside renderer-neutral contracts, and authoring docs?

## 6. Commit And Push Workflow

Use the repository wrappers.

Status:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
```

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

Smoke:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
```

Commit and push with explicit Phase 23 paths:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "feat: add spherical world projection" -Paths src\schemas,src\world,src\runtime,src\director,src\engine,src\editor,data,tests,scripts,docs\phase-23-compact-spherical-world-prototype-goal-mode-execution-guide.md,docs\phase-23-compact-spherical-world-prototype-final-report.md,docs\developer-guide.md,docs\development-plan.md,docs\abeto-messenger-development-plan.md,docs\post-mvp-execution-workflow.md
```

Adjust `-Paths` per round so only touched, phase-relevant files are staged. Do not use broad staging commands such as `git add .`.

## 7. Round Budget

Total: 16 rounds.

- Main implementation: rounds 23.1 through 23.12.
- Buffer fixes: rounds 23.13 through 23.15.
- Final validation and handoff: round 23.16.

The roadmap's 6-round estimate is the high-level planning estimate. This goal-mode guide splits Phase 23 into smaller commit-and-push checkpoints because the phase touches world schema, projection math, region data, runtime mapping, Three placement, movement, camera behavior, director camera compatibility, smoke/perf, docs, and final handoff.

## 8. Round Plan

### Round 23.1: Baseline Audit And Spherical World Design Lock

Goal:

- Confirm the Phase 22 baseline and lock Phase 23 as compact spherical-world prototype scope.

Work:

- Confirm `docs/phase-22-lod-instancing-and-vegetation-final-report.md` is PASS and pushed.
- Inspect current level data, world model, runtime types, Three runtime, director camera code, smoke tests, and Phase 22 diagnostics.
- Decide the data model for projection, regions, local coordinates, and runtime mapping.
- Decide how player surface movement will be represented without Physics/InputFlow.
- Decide how stable spherical camera behavior will be tested.
- Create or update `docs/phase-23-compact-spherical-world-prototype.md` with design lock notes if needed.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
rg "Phase 23|Compact Spherical World|cube-sphere|spherical placement|player surface movement|Phase 24" docs\abeto-messenger-development-plan.md docs\phase-22-lod-instancing-and-vegetation-final-report.md docs\phase-23-compact-spherical-world-prototype-goal-mode-execution-guide.md
git diff --check
```

Expected commit:

```txt
docs: lock phase 23 spherical world plan
```

### Round 23.2: World Projection Schema And Region Contract

Goal:

- Add source-of-truth schema and validation for compact spherical-world projection and regions.

Work:

- Add schema support for cube-sphere projection metadata in level data or a dedicated data document.
- Add region ids, labels, local bounds, face/anchor information, and readable authoring-space constraints.
- Add validation for duplicate regions, invalid radius, invalid face/bounds, entity placement references, and missing region data.
- Keep flat/room levels valid or provide a backwards-compatible default.
- Add tests for valid compact world, missing projection, invalid regions, and mixed flat/spherical data.

Validation:

```powershell
npm run test -- schema world projection region validate-data
npm run validate-data
git diff --check
```

Expected commit:

```txt
feat: add spherical world schema
```

### Round 23.3: Cube-Sphere Projection Math

Goal:

- Add deterministic renderer-neutral cube-sphere projection math.

Work:

- Add pure projection helpers under `src/world/**` or `src/runtime/**` without importing Three.
- Convert authored region/local coordinates into sphere position, normal, tangent, bitangent, and rotation data.
- Add tests for all cube faces, seams, corners, radius scaling, invalid face/coordinate handling, and deterministic floating-point tolerance.
- Keep projection math independent from assets, editor UI, and Three objects.

Validation:

```powershell
npm run test -- cube sphere projection world
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add cube sphere projection math
```

### Round 23.4: Spherical Placement Runtime Contract

Goal:

- Bridge source data into renderer-neutral spherical placement state.

Work:

- Add runtime/world types for spherical placements, region placements, surface frames, and diagnostics.
- Extend `World` or a narrow helper to expose entity placement state without duplicating source data.
- Add validation/runtime tests for missing regions, stale entity references, flat-level fallback, and transform compatibility.
- Ensure authored local coordinates remain the data source; runtime sphere-space transforms are derived.

Validation:

```powershell
npm run test -- spherical placement world runtime
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add spherical placement runtime contract
```

### Round 23.5: Three Spherical Placement Bridge

Goal:

- Apply spherical placement to visible objects in Three runtime.

Work:

- Add Three-specific spherical placement support under `src/runtime/three/**`.
- Apply derived sphere transforms to entities while preserving material, LOD, scatter, selection, transform gizmo, debug AABB, and animation behavior where practical.
- Add fallback behavior for flat levels and invalid placements.
- Add tests for transform application, region placement, seam/pole cases, disposal, and no forbidden imports.

Validation:

```powershell
npm run test -- ThreeRuntime spherical placement
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
feat: apply spherical placement in three runtime
```

### Round 23.6: Compact Region Data And Readability Fixtures

Goal:

- Add compact spherical-world data for at least three readable regions.

Work:

- Add or update level data for three regions such as city, hill, and beach.
- Place existing prefabs/assets using authored local coordinates and region references.
- Use Phase 22 LOD/scatter infrastructure only as rendering infrastructure for readability.
- Add data tests and asset report checks if region/scatter changes affect budgets.
- Keep old demo behavior understandable or document the transition.

Validation:

```powershell
npm run validate-data
npm run report-assets
npm run test -- region spherical data
git diff --check
```

Expected commit:

```txt
feat: add compact spherical region data
```

### Round 23.7: Player Surface Movement Contract

Goal:

- Add deterministic, data-first player surface movement semantics without adding Physics or full input systems.

Work:

- Add renderer-neutral movement types and a pure surface movement helper.
- Define how movement updates region/local coordinates, heading, and surface frame.
- Add tests for forward movement, turning, region edge crossing, pole/seam behavior, clamping or wrapping rules, zero input, stale region, and deterministic deltas.
- Keep input binding and production controls out of scope. Use test commands or a narrow preview command seam only.

Validation:

```powershell
npm run test -- player surface movement spherical
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add player surface movement contract
```

### Round 23.8: Preview Movement Runtime Integration

Goal:

- Make the player movement prototype observable in runtime or editor preview.

Work:

- Wire movement state through `EngineSession`, `World`, and runtime contracts without React owning per-frame movement.
- Add a narrow preview or smoke-control seam for deterministic movement steps.
- Keep production input mapping, interaction radius, delivery job state, and Showcase Mode out of scope.
- Add tests for movement state application, cancellation/disposal, editor reload, and flat-level fallback.

Validation:

```powershell
npm run test -- EngineSession World movement spherical
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: integrate spherical movement preview
```

### Round 23.9: Stable Spherical Camera Behavior

Goal:

- Add stable camera behavior for the compact spherical world.

Work:

- Add renderer-neutral camera pose helpers for surface-relative follow/look behavior.
- Ensure camera up, horizon, and target orientation remain stable across region transitions.
- Add tests for region transitions, edge crossing, pole/seam cases, near/far/fov preservation, and flat-level fallback.
- Do not add ViewRig or a full camera framework.

Validation:

```powershell
npm run test -- camera spherical follow surface
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add spherical camera stabilization
```

### Round 23.10: Director Camera Shot Compatibility

Goal:

- Let existing director camera shots target spherical-world positions while preserving flat-world compatibility.

Work:

- Extend camera shot sampling or target resolution only as needed.
- Support region/entity targets and derived sphere-space positions through renderer-neutral contracts.
- Add tests for static, lookAt, follow, and keyframed camera paths where practical.
- Ensure existing camera shot data and tests remain valid.

Validation:

```powershell
npm run test -- CameraShot Director spherical
npm run validate-data
git diff --check
```

Expected commit:

```txt
feat: support spherical director camera targets
```

### Round 23.11: LOD Scatter And Low-End Spherical Integration

Goal:

- Prove Phase 22 LOD/scatter infrastructure works on the compact spherical world.

Work:

- Ensure LOD, scatter, and instancing diagnostics still work when objects are projected to the sphere.
- Add tests for distant-region LOD, scatter placement, low-end profile, and invalid region fallback.
- Keep scatter deterministic and non-selectable unless a narrow diagnostic says otherwise.
- Update asset/perf docs if spherical layout changes budgets.

Validation:

```powershell
npm run test -- lod scatter spherical low-end
npm run report-assets
git diff --check
```

Expected commit:

```txt
test: integrate spherical lod scatter readability
```

### Round 23.12: Spherical World Smoke And Perf Gate

Goal:

- Add browser smoke and local perf evidence for the compact spherical world prototype.

Work:

- Add Playwright smoke that loads the compact world, verifies nonblank rendering, three readable regions, movement around the sphere, stable camera orientation, and diagnostics.
- Add deterministic local budgets for draw calls, triangle estimates, instance counts, and runtime diagnostics where practical.
- Record limitations for browser/GPU memory if still environment-sensitive.
- Keep generated smoke artifacts out of commits.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run test -- spherical smoke perf low-end
git diff --check
```

Expected commit:

```txt
test: add spherical world smoke gate
```

### Round 23.13: Buffer Fix Round 1

Goal:

- Fix Phase 23 defects found by validation, smoke, or architecture review.

Work:

- Triage failures by layer before editing.
- Keep fixes inside Phase 23 scope.
- Focus on projection math, schema validation, placement, movement, camera stability, Three bridge, LOD/scatter integration, smoke stability, and docs.
- Do not add Phase 24 gameplay, Physics, InputFlow, Runtime UI, Audio, external adapters, or multiplayer.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: stabilize spherical world prototype
```

### Round 23.14: Buffer Fix Round 2

Goal:

- Reserve a second buffer for remaining Phase 23 issues only.

Work:

- Use only if integrated checks still find Phase 23 blockers.
- Focus on deterministic seam/pole behavior, camera transitions, low-end budgets, editor reload, data validation, or smoke timing.
- Skip this round if no defects remain and record it as unused in the final report.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: close spherical world validation gaps
```

### Round 23.15: Buffer Fix Round 3

Goal:

- Reserve the final buffer for integrated Phase 23 blockers.

Work:

- Use only if final integrated validation still finds Phase 23 issues.
- Keep fixes small and tied to reproducible validation failures.
- Do not use this round to start Phase 24 delivery gameplay or external integration.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: finalize spherical world stability
```

### Round 23.16: Final Validation And Handoff

Goal:

- Close Phase 23 with full validation, smoke, final docs, and Phase 24 handoff.

Work:

- Run full validation and smoke.
- Confirm all Phase 23 commits are pushed.
- Create `docs/phase-23-compact-spherical-world-prototype-final-report.md`.
- Update roadmap entry points so Phase 24 Delivery Gameplay Showcase is the recommended next goal.
- The final report must include status, completed work, projection contract, region data, movement evidence, camera evidence, LOD/scatter integration, smoke/perf evidence, validation, commits, pushed status, known limitations, and Phase 24 handoff.
- Confirm Phase 23 did not implement delivery jobs, Physics, InputFlow, ViewRig, Runtime UI, Audio, multiplayer, external adapters, or Phase 24 scope.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
rg "Phase 23|Compact Spherical World|cube-sphere|spherical|region|movement|camera|Phase 24" docs src data tests scripts
git diff --check
```

Expected commit:

```txt
docs: finalize phase 23 spherical world prototype
```

## 9. PASS Criteria

Phase 23 is PASS only when all of these are true:

- Phase 22 final report is PASS and the executor confirmed it was pushed before Phase 23 implementation started.
- World projection schema and validation exist.
- Cube-sphere projection math exists and is unit-tested.
- Region data exists for at least three readable regions.
- Local authoring coordinates remain readable and source-of-truth.
- Runtime sphere-space positions/transforms are derived, not duplicated as source data.
- Three runtime renders the compact spherical world without leaking Three details into data or semantic layers.
- Minimal deterministic player surface movement works around the small sphere.
- Camera orientation is stable across region transitions and edge/seam cases covered by tests.
- Director camera shots can target spherical-world positions or entities while preserving existing flat-world camera behavior.
- Phase 22 LOD/scatter/instancing continues to work on the compact spherical world where used.
- Smoke proves the compact world renders, movement is observable, camera remains stable, and three regions are readable in preview or a narrow smoke mode.
- Low-end/perf evidence is recorded with practical local budgets.
- No Three.js imports are introduced outside `src/runtime/three/**` and accepted thin editor glue.
- No delivery jobs, full Showcase Mode, Physics/Rapier, InputFlow, ViewRig, LudoWeave, Inscape, Runtime UI, Audio, multiplayer, external adapters, or Phase 24 scope is implemented.
- `Validate.cmd` passes.
- `Smoke.cmd` passes.
- `git diff --check` passes.
- Phase 23 final report exists.
- All Phase 23 commits are pushed to `origin/main` or the active remote branch requested by the user.
- Roadmap entry points identify Phase 24 Delivery Gameplay Showcase as the next implementation phase.

## 10. Validation Matrix

| Area | Required validation |
| --- | --- |
| Projection schema | Unit/schema tests for projection type, radius, regions, bounds, face anchors, duplicate ids, missing references |
| Data validation | `npm run validate-data` passes committed compact world data and fails bad projection/region data |
| Projection math | Unit tests for cube faces, seams, corners, radius, local axes, surface normals, deterministic tolerance |
| Spherical placement | Tests for source local coordinates to runtime transforms, missing region fallback, flat-level compatibility |
| Three placement | Tests for object transform application, sphere helper behavior, disposal, selection/debug compatibility, no forbidden imports |
| Region readability | Data tests and smoke assertions for city/hill/beach or equivalent readable regions |
| Player movement | Unit/runtime tests for forward/turn movement, seam/edge crossing, pole behavior, zero input, stale region |
| Spherical camera | Unit/runtime tests for stable up/horizon, follow/look behavior, region transitions, fov/near/far preservation |
| Director camera | Tests for static/lookAt/follow/keyframed compatibility where practical |
| LOD/scatter integration | Tests for LOD/scatter diagnostics on projected world, low-end profile, invalid region fallback |
| Smoke/perf | Playwright smoke for nonblank compact world, movement, camera stability, regions, and deterministic local budgets |
| Boundary checks | `check-boundaries` proves Three.js stays inside runtime adapter boundaries |
| Full gate | `Validate.cmd`, `Smoke.cmd`, `git diff --check`, roadmap link checks |

## 11. Final Report Template

Create `docs/phase-23-compact-spherical-world-prototype-final-report.md` using this structure:

```markdown
# Phase 23 Compact Spherical World Prototype Final Report

Date: <date>

## Status

PASS or BLOCKED.

## Completed

- ...

## Projection Contract

- Schema:
- Cube-sphere math:
- Region data:
- Local authoring model:
- Runtime derived transforms:
- Fallback behavior:

## Spherical Runtime

- Three placement bridge:
- LOD/scatter integration:
- Region readability:
- Diagnostics:
- Known editor limitations:

## Player Movement

- Movement contract:
- Deterministic controls or smoke seam:
- Edge/seam behavior:
- Limitations:

## Camera

- Spherical camera behavior:
- Director camera compatibility:
- Stable orientation evidence:

## Perf And Smoke Evidence

- Draw calls:
- Triangle estimates:
- Instance counts:
- Movement/camera smoke:
- Low-end profile:
- Browser/GPU memory limitations:

## Validation

- Validate.cmd:
- Smoke.cmd:
- Targeted tests:
- Data validation:
- Asset report:
- Boundary checks:
- git diff --check:

## Commits And Push

- `<hash>` <message> pushed to `<remote>/<branch>`

## Buffer

Consumed or not consumed. Explain why.

## Known Limitations

- ...

## Remaining Blockers

None, or list blockers.

## Recommended Next Goal

Complete Phase 24 from docs/abeto-messenger-development-plan.md: Delivery Gameplay Showcase. Start only after Phase 23 is PASS and pushed. Use the compact spherical-world prototype as the playable environment, but keep delivery jobs, route feedback, player interaction, Runtime UI, audio, and any new input semantics scoped by the Phase 24 guide.
```

## 12. Phase 24 Handoff Notes

After Phase 23 passes, Phase 24 may start Delivery Gameplay Showcase.

Phase 24 should use Phase 23 only as infrastructure:

- The compact spherical world provides regions, placement, movement, and camera readability.
- Delivery jobs, route markers, target feedback, and completion loops belong to Phase 24.
- Any broader input, Runtime UI, audio, or interaction system must be scoped explicitly in the Phase 24 guide.
- Physics, InputFlow, ViewRig, LudoWeave, Inscape, Audio, Runtime UI, multiplayer, and external adapters remain behind Phase 21.5 boundaries unless the Phase 24 guide deliberately adopts a narrow, validated slice.
