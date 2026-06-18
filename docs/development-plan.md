# Sinan Scene Director Development Plan

## Project Goal

Sinan Scene Director is an AI-native, text-data-driven Web 3D game director system and project-specific editor. Its long-term value is not a generic Unity clone; it is a maintainable stack where TypeScript, JSON, schemas, validators, registries, and tests make 3D scene direction editable by humans and AI agents through Git-friendly files.

The first runtime target is Three.js, with a deliberate adapter boundary so the game semantics can later survive a Babylon.js runtime migration.

## Non-Negotiable Architecture Rules

1. `data/**/*.json` is the source of truth for assets, prefabs, levels, events, timelines, camera shots, and other game semantics.
2. `src/runtime/three/**` owns Three.js. Game, world, events, director, schemas, data, and migrations must stay renderer-neutral.
3. React owns editor shell, HUD, panels, selection, inspector tabs, and other slow UI state. Per-frame game state does not live in React state.
4. Every JSON input needs a Zod schema and clear validation errors.
5. Actions and conditions execute through registries. JSON must not contain `eval`, arbitrary script strings, or unregistered function calls.
6. Timeline scrub must not run irreversible or runtime-only side effects.
7. Editor mutations go through command objects so undo, redo, save, and test coverage remain tractable.

## Phase Plan

### Phase 0: Project Foundation

Goal: a runnable Vite + React + TypeScript app with a visible Three.js canvas.

Work:

- Initialize package tooling and scripts.
- Install `three`, `zod`, `vitest`, and Playwright.
- Add ESLint/Prettier, including import boundary checks.
- Create the recommended `src`, `data`, `public`, `scripts`, and `tests` structure.
- Implement the minimal `WebRuntime` interface and `ThreeRuntime` init/render/dispose path.

Acceptance:

- `npm run dev` starts the editor shell.
- `npm run build`, `npm run test`, and the first lint/typecheck checks pass.
- The first page renders a nonblank Three.js scene.

### Phase 1: Schema And Data Loading

Goal: load project data from JSON and instantiate a level.

Work:

- Implement common, transform, entity, prefab, level, and asset manifest schemas.
- Add `DataRepository`, JSON loading, and project validation.
- Add demo `assets.manifest.json`, prefabs, and `level_01.json`.
- Implement model loading and entity-to-runtime-object instantiation.
- Add `scripts/validate-data.ts` and cross-reference checks.

Acceptance:

- `level_01.json` loads into the scene.
- Invalid JSON produces actionable schema errors.
- Entity transforms are correctly applied and reference errors are caught.

MVP to Post-MVP transition note:

- The Phase 0-7 MVP used deterministic placeholder geometry to keep data, schema, editor, and runtime adapter contracts testable before real assets existed.
- Post-MVP Phase 8 now adds `GLTFLoader` inside `src/runtime/three/**`, preserves the renderer-neutral `WebRuntime` boundary, caches loaded GLB scenes/animations, and keeps placeholder fallback for missing or invalid local assets.
- See `docs/phase-8-real-asset-runtime.md` for current GLB loading behavior, generated development assets, fallback behavior, and remaining limitations.

### Phase 2: Editor MVP

Goal: select, inspect, transform, save, undo, and redo level edits.

Work:

- Build `EditorApp`, `Viewport`, `HierarchyPanel`, and `InspectorPanel`.
- Add picking and TransformControls through the runtime interface.
- Add editor commands for transform and component updates.
- Implement command history.
- Add a dev-only save JSON API restricted to `data/**`.

Acceptance:

- Clicking an entity selects it.
- Move/rotate/scale gizmos update entity transforms.
- Inspector edits and gizmo edits are undoable.
- Saving updates the relevant JSON file.

### Phase 3: Events, Conditions, And Actions

Goal: trigger gameplay/director behavior through data-driven events.

Work:

- Implement event, trigger, condition, and action schemas.
- Add trigger, condition, and action registries.
- Support MVP triggers such as `entity.interact`, `level.start`, and `timeline.finished`.
- Support MVP actions such as `flag.set`, `door.open`, `timeline.play`, and `animation.play`.
- Build an Event Inspector MVP.

Acceptance:

- Interacting with `switch_a` evaluates conditions and dispatches actions.
- Actions are schema-validated and registry-backed.
- Unit tests cover condition evaluation and action dispatch.

### Phase 4: Director And Timeline Runtime

Goal: play JSON timelines with animation, camera, sound/subtitle markers, and safe scrub behavior.

Work:

- Implement timeline schemas and `TimelinePlayer`.
- Support action, animation, camera shot, property, subtitle, and sound tracks.
- Add action side-effect classification.
- Add `timeline.finished` trigger dispatch.
- Add preview-safe scrub behavior.

Acceptance:

- `tl_open_gate` can move camera, play gate animation, play markers, and set flags.
- Scrubbing previews camera/animation without running runtime-only actions.
- Timeline unit tests cover sampling and marker execution.

### Phase 5: Camera Shot System

Goal: author and preview simple cinematic camera shots.

Work:

- Implement `cameraShot` schema, `CameraShotPlayer`, and `DirectorCameraSystem`.
- Add keyframed/static/follow/lookAt MVP shot types.
- Build `CameraShotPanel`.
- Add Set Key From View, View Through Camera, Look At Selected, and preview controls.

Acceptance:

- `cam_gate_reveal` can be created, edited, previewed, and played by a timeline.
- The runtime camera receives poses through the runtime adapter, not direct Three.js access from director code.

### Phase 6: Timeline Editor

Goal: edit timeline tracks and keyframes in the editor.

Work:

- Build `TimelinePanel`, ruler, playhead, track list, and keyframe/action marker editing.
- Support add/remove/move keyframes and tracks.
- Save `timeline.json` through editor commands.

Acceptance:

- Users can author action markers, camera shot tracks, and animation tracks.
- Saved timelines reload cleanly and pass data validation.

### Phase 7: Trigger And Physics Layer

Goal: reliable trigger zones and lightweight collision support.

Work:

- Add collider schemas and trigger zone visualization.
- Implement AABB trigger MVP.
- Add debug draw.
- Keep the MVP on data-backed AABB trigger zones; evaluate Rapier integration only after trigger semantics, validation, and editor visualization are stable.

Acceptance:

- Entering a trigger zone can fire an event.
- Trigger bounds are visible in edit mode.
- Reference validation catches missing trigger targets.

## Immediate Implementation Order

Start with the first file batch from the architecture guide:

1. `src/schemas/common.schema.ts`
2. `src/schemas/transform.schema.ts`
3. `src/schemas/entity.schema.ts`
4. `src/schemas/prefab.schema.ts`
5. `src/schemas/level.schema.ts`
6. `src/runtime/WebRuntime.ts`
7. `src/runtime/RuntimeTypes.ts`
8. `src/runtime/three/ThreeRuntime.ts`
9. `src/data/DataRepository.ts`
10. `src/world/World.ts`
11. `src/editor/EditorApp.tsx`
12. `src/editor/Viewport.tsx`
13. `data/assets.manifest.json`
14. `data/prefabs/*.json`
15. `data/levels/level_01.json`
16. `scripts/validate-data.ts`

## Validation Plan

Phase 0 should establish the permanent validation command set:

```txt
npm run typecheck
npm run lint
npm run build
npm run test
npm run validate-data
```

After those scripts exist, wire them into `.codex/project-ops-workflow.json` and `.codex/project-git-workflow.json` so future commits use the repository wrappers instead of ad hoc commands.

## Post-MVP Plan

Phase 0-7 now define the architecture MVP. Continue with:

- `docs/post-mvp-development-plan.md` for Phase 8-15 scope, acceptance criteria, and estimated session rounds.
- `docs/post-mvp-execution-workflow.md` for the goal-mode execution workflow, phase gates, validation commands, and commit rhythm.

The post-MVP route explicitly prioritizes rendering quality and editor UI/UX maturity. Phase 9 is the demo visual pass, Phase 11 is the editor UI/UX redesign, and Phase 12 carries detailed authoring workflows plus data safety.

After Phase 14, the next product route is the Abeto Messenger-like vertical slice:

- `docs/abeto-messenger-development-plan.md` for Phase 15-22 scope, budgets, acceptance gates, and estimated session rounds.
- `docs/phase-15-abeto-scope-lock-goal-mode-execution-guide.md` for the next goal-mode handoff.

Phase 14 release-candidate status is accepted in `docs/phase-14-release-candidate-finalization.md`. Phase 15 is a scope-lock and handoff phase only; it should not start runtime, UI, shader, gameplay, multiplayer, or asset-compression implementation.

For the next implementation goal after Phase 15 passes, read `AGENTS.md` and `docs/Sinan_Scene_Director_研发方案与架构指南.md`, then execute Phase 16 from `docs/abeto-messenger-development-plan.md`: Stylized Runtime Foundation.
