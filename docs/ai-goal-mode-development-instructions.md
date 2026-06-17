# Sinan Scene Director Goal-Mode Development Instructions

This document is the handoff prompt for an AI coding agent that will run a long goal-mode task to implement Sinan Scene Director from Phase 0 through Phase 7.

## Goal Objective

Implement the full MVP roadmap for Sinan Scene Director, from project foundation through trigger/physics enhancement, while preserving the architecture in the source design documents.

Use this objective if goal mode needs a concrete goal:

```txt
Complete Sinan Scene Director Phase 0 through Phase 7 according to docs/ai-goal-mode-development-instructions.md, keeping every phase runnable, tested, validated, committed, and aligned with the architecture guide.
```

Do not mark the goal complete until all Phase 0-7 acceptance criteria in this document pass.

## Required Reference Documents

Read these before coding, and re-read the relevant sections before each phase:

1. `AGENTS.md`
   - Repository-level Codex instructions.
   - Project architecture boundaries.
   - Workflow wrapper guidance.

2. `docs/Sinan_Scene_Director_研发方案与架构指南.md`
   - Primary product, architecture, schema, runtime, editor, and phase design.
   - Important sections:
     - Section 4: architecture overview
     - Section 5: recommended directory structure
     - Section 6: import boundary rules
     - Sections 7-15: data, world, runtime, event, director, camera, animation, editor, and schema design
     - Section 17: MVP roadmap
     - Section 18: AI implementation rules
     - Section 19: testing strategy
     - Section 24: first implementation file order

3. `docs/development-plan.md`
   - Short execution plan and phase summary.

4. `docs/codex-git-workflow.md`
   - Git workflow and safety policy.

5. `docs/codex-ops-workflow.md`
   - Mechanical project operation policy.

If a requirement is unclear, prefer the architecture guide as the source of truth, then `docs/development-plan.md`, then `AGENTS.md`.

## Non-Negotiable Architecture Rules

1. `data/**/*.json` is the source of truth for assets, prefabs, levels, events, timelines, camera shots, and other game semantics.
2. Three.js must stay isolated to `src/runtime/three/**` and thin editor viewport glue. Do not import `three` from:
   - `src/game/**`
   - `src/events/**`
   - `src/director/**`
   - `src/world/**`
   - `src/schemas/**`
   - `src/data/**`
   - `src/migrations/**`
3. React owns slow UI state only: mode, selected entity, selected timeline, selected camera shot, active tool, inspector tab, and similar editor state.
4. Per-frame game state, animation state, physics, AI, timeline sampling, and camera sampling must not live in React state.
5. Every JSON format must have a Zod schema before or alongside runtime/editor usage.
6. Condition and Action behavior must go through registries. Do not add `eval`, script strings, arbitrary JS code strings, or dynamic `window[name]()` calls.
7. Timeline scrub mode must not execute `runtimeOnly` or `destructive` actions.
8. Editor mutations must go through command objects when they affect data that should support undo/redo or saving.
9. Do not store `THREE.Object3D` or any Three.js type in entity/world/schema/game data.
10. Do not silently swallow schema or reference validation errors.

## Fixed Session Plan

Treat one "session round" as one complete implementation checkpoint: inspect context, implement a scoped slice, debug, run validation, do architecture checks, update docs if needed, and commit.

Total planned rounds: 28.

| Phase | Rounds | Goal |
| --- | ---: | --- |
| Phase 0 | 2 | Project foundation |
| Phase 1 | 3 | Schema and data loading |
| Phase 2 | 4 | Editor MVP |
| Phase 3 | 4 | Event / Condition / Action |
| Phase 4 | 5 | Director / Timeline runtime |
| Phase 5 | 3 | Camera Shot system/editor |
| Phase 6 | 5 | Timeline editor |
| Phase 7 | 2 | Trigger and physics layer |

Stay within these round counts unless there is a real blocker. If a blocker appears, document it clearly, reduce scope only with an explicit rationale, and continue with the smallest useful checkpoint.

## Mandatory Self-Check At The End Of Every Round

At the end of each session round, perform and report all of the following:

1. Functional debug
   - Run the relevant app/test path for the round.
   - Fix runtime errors, console errors, TypeScript errors, failing unit tests, and obvious UI breakage.
   - If a dev server is started, verify the page manually or with Browser/Playwright where appropriate, then stop only servers you started unless the user asked to keep one running.

2. Architecture validation
   - Check that forbidden layers do not import `three`.
   - Confirm new JSON data has a schema.
   - Confirm new action/condition types have schema plus registry entries.
   - Confirm high-frequency runtime state is not pushed into React state.
   - Confirm editor data changes go through command paths where applicable.

3. Data validation
   - Run `npm run validate-data` once it exists.
   - Before it exists, run the best available schema/reference tests and note that `validate-data` is not established yet.

4. Mechanical validation
   - Once package scripts exist, run:
     - `npm run typecheck`
     - `npm run lint`
     - `npm run build`
     - `npm run test`
     - `npm run validate-data`
   - If Playwright smoke tests exist for the edited surface, run them too.

5. Git hygiene
   - Inspect `git status`.
   - Review your own diff.
   - Do not revert unrelated user changes.
   - Commit the round with a concise conventional commit message after checks pass.
   - Push at the end of each phase, or sooner if explicitly requested.

6. Round report
   - State what changed.
   - State what checks passed.
   - State any known limitations or follow-up items for the next round.

Recommended architecture check commands once the code tree exists:

```powershell
rg "from ['\"]three['\"]|import \\* as THREE|require\\(['\"]three['\"]\\)" src/game src/events src/director src/world src/schemas src/data src/migrations
rg "eval\\(|new Function|window\\[" src data scripts
rg "setState|useState" src/editor src/game src/director src/world
```

Interpret these checks carefully. A match may be harmless in comments or tests, but every match must be reviewed.

## Phase 0: Project Foundation

Goal: create a runnable Vite + React + TypeScript app with a visible Three.js scene and baseline tooling.

### Round 0.1: Tooling And App Skeleton

Tasks:

1. Initialize package tooling for Vite + React + TypeScript.
2. Add baseline scripts:
   - `dev`
   - `build`
   - `test`
   - `lint`
   - `typecheck`
   - `format` or `format:check`
3. Install initial dependencies:
   - runtime: `react`, `react-dom`, `three`, `zod`
   - dev: `typescript`, `vite`, `@vitejs/plugin-react`, `vitest`, ESLint/Prettier tooling
4. Create initial files:
   - `src/main.tsx`
   - `src/App.tsx`
   - `src/editor/EditorApp.tsx`
   - `src/editor/Viewport.tsx`
   - basic CSS
5. Render the actual editor shell as the first screen, not a marketing page.

Self-check:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test`
- Start dev server and verify the app renders.

Commit suggestion:

```txt
chore: scaffold vite react app
```

### Round 0.2: Runtime Interface And Three Scene

Tasks:

1. Create:
   - `src/runtime/WebRuntime.ts`
   - `src/runtime/RuntimeTypes.ts`
   - `src/runtime/RuntimeObjectHandle.ts` if useful
   - `src/runtime/three/ThreeRuntime.ts`
2. Implement minimal runtime methods:
   - `init`
   - `update`
   - `render`
   - `dispose`
   - enough camera/scene setup to render a nonblank canvas
3. Add a simple scene with camera, grid or floor, light, and test mesh.
4. Configure ESLint import boundary so only `src/runtime/three/**` can import `three`, with any narrow editor exceptions explicitly documented.
5. Update `.codex/project-ops-workflow.json` and `.codex/project-git-workflow.json` so validation wrappers run the real package scripts.

Self-check:

- Full package validation.
- Browser/Playwright smoke or manual browser verification that the canvas is nonblank.
- Import boundary check.

Commit suggestion:

```txt
feat: add web runtime and initial three viewport
```

Phase 0 acceptance:

- `npm run dev` starts.
- `npm run build`, `npm run test`, `npm run lint`, and `npm run typecheck` pass.
- Page shows a nonblank Three.js scene.
- Workflow configs know the real validation commands.

Push after Phase 0.

## Phase 1: Schema And Data Loading

Goal: load JSON project data and instantiate a level through the runtime boundary.

### Round 1.1: Core Schemas

Tasks:

1. Implement first schema batch:
   - `src/schemas/common.schema.ts`
   - `src/schemas/transform.schema.ts`
   - `src/schemas/entity.schema.ts`
   - `src/schemas/asset.schema.ts`
   - `src/schemas/prefab.schema.ts`
   - `src/schemas/level.schema.ts`
2. Export inferred TypeScript types.
3. Add schema unit tests for valid and invalid samples.
4. Keep schema files renderer-neutral.

Self-check:

- Full validation.
- Confirm `src/schemas/**` has no Three.js imports.

Commit suggestion:

```txt
feat: add core data schemas
```

### Round 1.2: Data Repository And Demo JSON

Tasks:

1. Create:
   - `src/data/loadJson.ts`
   - `src/data/DataRepository.ts`
   - `src/data/ReferenceResolver.ts` if needed now
2. Add demo data:
   - `data/assets.manifest.json`
   - `data/prefabs/*.json`
   - `data/levels/level_01.json`
3. Implement loading and parsing through Zod.
4. Add clear error reporting for invalid data.
5. Add tests for repository loading and schema failures.

Self-check:

- Full validation.
- Confirm `src/data/**` has no Three.js imports.
- Confirm invalid fixture errors are readable.

Commit suggestion:

```txt
feat: load validated project data
```

### Round 1.3: Runtime Instantiation And Validate CLI

Tasks:

1. Implement enough runtime methods to instantiate demo entities:
   - `loadModel` may support placeholders first if no GLB assets exist.
   - `instantiateModel`
   - `createEmpty`
   - `setTransform`
   - `destroyObject`
2. Load `level_01.json` into the editor viewport.
3. Implement `scripts/validate-data.ts`.
4. Add `npm run validate-data`.
5. Add reference checks for duplicate IDs and missing prefab/asset/timeline/cameraShot references.

Self-check:

- Full validation including `npm run validate-data`.
- Dev server visual verification that level entities appear.
- Import boundary check.

Commit suggestion:

```txt
feat: instantiate validated level data
```

Phase 1 acceptance:

- `level_01.json` loads.
- Invalid JSON produces actionable errors.
- Entity transforms are applied.
- `npm run validate-data` exists and passes.

Push after Phase 1.

## Phase 2: Editor MVP

Goal: select, inspect, transform, save, undo, and redo level edits.

### Round 2.1: Editor Store And Panels

Tasks:

1. Add editor state/store for slow UI state only.
2. Build:
   - `HierarchyPanel`
   - `InspectorPanel`
   - initial `AssetPanel` if useful
3. Show entities from loaded level.
4. Selecting in hierarchy updates inspector.
5. Inspector can display transform and component data read-only or minimally editable.

Self-check:

- Full validation.
- Verify React state does not hold per-frame transforms.
- Browser check: select entity from hierarchy and see inspector details.

Commit suggestion:

```txt
feat: add editor hierarchy and inspector
```

### Round 2.2: Picking And Selection Tool

Tasks:

1. Add:
   - `src/runtime/three/ThreePicking.ts` or equivalent internal runtime module
   - `src/editor/tools/SelectionTool.ts`
2. Add runtime `pick(clientX, clientY)` through `WebRuntime`.
3. Clicking a viewport entity selects it.
4. Ensure editor talks to runtime through `WebRuntime`, not direct Three.js access outside allowed files.

Self-check:

- Full validation.
- Browser/Playwright check for viewport selection.
- Import boundary check.

Commit suggestion:

```txt
feat: support viewport picking
```

### Round 2.3: Transform Gizmo And Commands

Tasks:

1. Add:
   - `Command`
   - `CommandHistory`
   - `TransformEntityCommand`
   - `UpdateComponentCommand` if needed
2. Add TransformControls support behind runtime interface methods:
   - `attachTransformGizmo`
   - `detachTransformGizmo`
   - `setTransformGizmoMode`
3. Implement move/rotate/scale modes.
4. Gizmo edits must update level data through command paths.
5. Add undo/redo.

Self-check:

- Full validation.
- Browser/Playwright check: transform selected entity and undo/redo.
- Confirm data updates do not store Three.js objects.

Commit suggestion:

```txt
feat: add transform commands and gizmo
```

### Round 2.4: Save JSON API

Tasks:

1. Add dev-only save JSON API.
2. Restrict writes to `data/**`.
3. Add UI Save command.
4. Add tests for allowed and rejected save paths.
5. Ensure saved level reloads cleanly.

Self-check:

- Full validation.
- Browser/Playwright check: edit transform, save, reload, verify persisted data.
- Security/path traversal check for save API.

Commit suggestion:

```txt
feat: save editor changes to data json
```

Phase 2 acceptance:

- Click entity to select.
- Gizmo can move/rotate/scale.
- Inspector shows transform/components.
- Save updates JSON.
- Undo/redo works.

Push after Phase 2.

## Phase 3: Event / Condition / Action

Goal: drive gameplay/director behavior from data-backed events.

### Round 3.1: Event, Trigger, Condition, Action Schemas

Tasks:

1. Add:
   - `event.schema.ts`
   - `trigger.schema.ts`
   - `condition.schema.ts`
   - `action.schema.ts`
2. Include MVP condition/action/trigger types from the architecture guide.
3. Add recursive condition schema using `z.lazy`.
4. Add schema tests.

Self-check:

- Full validation.
- Schema import boundary check.

Commit suggestion:

```txt
feat: add event condition action schemas
```

### Round 3.2: Registries And Evaluators

Tasks:

1. Add:
   - `conditionRegistry`
   - `actionRegistry`
   - `triggerRegistry`
   - `ConditionSystem`
   - `ActionSystem`
2. Implement MVP conditions:
   - `all`
   - `any`
   - `not`
   - `flag.equals`
   - `flag.exists`
   - `inventory.hasItem` if inventory state exists
3. Implement MVP actions:
   - `flag.set`
   - `flag.toggle`
   - `entity.setVisible`
   - `door.open`
   - `door.close`
   - `timeline.play` as a queued director command if Phase 4 is not ready yet
4. Add unit tests.

Self-check:

- Full validation.
- Confirm no eval or dynamic code execution.
- Confirm registry coverage tests.

Commit suggestion:

```txt
feat: evaluate conditions and dispatch actions
```

### Round 3.3: Event System And Interact Trigger

Tasks:

1. Implement:
   - `EventSystem`
   - `TriggerSystem`
   - `entity.interact`
   - `level.start`
2. Wire `switch_a` demo event:
   - condition checks
   - action dispatch
3. Add a test/debug UI button or play-mode interaction to trigger `interact switch_a`.
4. Add integration tests.

Self-check:

- Full validation.
- Browser check: interact with switch and see action effects.
- Architecture check.

Commit suggestion:

```txt
feat: trigger events from entity interaction
```

### Round 3.4: Event Inspector MVP

Tasks:

1. Build basic `EventInspector`.
2. Show event trigger, condition, and action list.
3. Allow minimal editing through command paths.
4. Save edited events to JSON.
5. Add validation messages in UI for invalid event data.

Self-check:

- Full validation.
- Browser check: edit an event and save/reload.
- Confirm edits do not live only in UI state.

Commit suggestion:

```txt
feat: add event inspector
```

Phase 3 acceptance:

- `switch_a` interaction evaluates conditions and dispatches actions.
- Actions and conditions are schema-backed and registry-backed.
- Event data can be inspected and minimally edited.

Push after Phase 3.

## Phase 4: Director / Timeline Runtime

Goal: play JSON timelines, with safe runtime and preview behavior.

### Round 4.1: Timeline Schema And Player Core

Tasks:

1. Add `timeline.schema.ts`.
2. Implement:
   - `TimelinePlayer`
   - timeline instance state
   - `play`
   - `pause`
   - `resume`
   - `stop`
   - `seek`
   - `scrub`
   - `update`
3. Add track sorting and time cursor handling.
4. Add tests for play/seek/scrub basics.

Self-check:

- Full validation.
- Confirm director code has no direct Three.js imports.

Commit suggestion:

```txt
feat: add timeline player core
```

### Round 4.2: Action And Animation Tracks

Tasks:

1. Add:
   - `ActionTrackPlayer`
   - `AnimationTrackPlayer`
2. Add action side-effect classification:
   - `none`
   - `previewSafe`
   - `runtimeOnly`
   - `destructive`
3. Ensure scrub skips runtime-only/destructive actions.
4. Route animation operations through `WebRuntime`.
5. Add tests for marker execution and scrub safety.

Self-check:

- Full validation.
- Confirm scrub does not permanently mutate runtime-only state.
- Architecture check.

Commit suggestion:

```txt
feat: play action and animation timeline tracks
```

### Round 4.3: Camera Shot Track Hook

Tasks:

1. Add a camera shot track player shell.
2. If Phase 5 camera player is not done yet, provide a clean interface and placeholder implementation.
3. Add timeline-to-director camera command flow.
4. Add tests around camera track sampling interface.

Self-check:

- Full validation.
- Confirm timeline does not directly control `THREE.Camera`.

Commit suggestion:

```txt
feat: route camera tracks through director interface
```

### Round 4.4: Property, Subtitle, Sound Tracks

Tasks:

1. Add MVP track players:
   - `PropertyTrackPlayer`
   - `SubtitleTrackPlayer`
   - `AudioTrackPlayer`
2. Route sound/subtitle through actions or runtime/editor-safe services.
3. Add timeline demo data `tl_open_gate.json`.
4. Add tests for continuous property sampling and marker tracks.

Self-check:

- Full validation.
- Data validation for timeline JSON.

Commit suggestion:

```txt
feat: support timeline property and marker tracks
```

### Round 4.5: Director System Integration

Tasks:

1. Add `DirectorSystem`.
2. Wire action `timeline.play` to director.
3. Add `timeline.finished` trigger.
4. Integrate with play/preview modes.
5. Add integration test for `tl_open_gate`.

Self-check:

- Full validation.
- Browser check: play demo timeline and observe visible effects.
- Confirm runtime-only actions are skipped in preview scrub.

Commit suggestion:

```txt
feat: integrate director timeline runtime
```

Phase 4 acceptance:

- JSON timeline can play.
- `tl_open_gate` triggers camera/animation/action behavior as far as implemented assets allow.
- Scrub behavior is preview-safe.
- `timeline.finished` can trigger events.

Push after Phase 4.

## Phase 5: Camera Shot System And Editor

Goal: author and preview simple camera shots.

### Round 5.1: Camera Shot Schema And Player

Tasks:

1. Add `cameraShot.schema.ts`.
2. Implement:
   - `CameraShotPlayer`
   - static shot
   - keyframed shot
   - lookAt resolution for vec3/entity
   - easing
3. Add tests for interpolation and lookAt behavior.

Self-check:

- Full validation.
- Director and schema import boundary check.

Commit suggestion:

```txt
feat: add camera shot playback
```

### Round 5.2: Director Camera Runtime Bridge

Tasks:

1. Implement:
   - `DirectorCameraSystem`
   - `VirtualCamera`
   - runtime camera pose bridge
2. Ensure timeline/camera shot player sets camera via runtime interface.
3. Add `cam_gate_reveal.json` demo data.
4. Integrate camera shot tracks with real shot playback.

Self-check:

- Full validation.
- Browser check: play shot and verify camera moves.
- Confirm no direct Three.js camera access outside runtime adapter.

Commit suggestion:

```txt
feat: drive runtime camera from camera shots
```

### Round 5.3: Camera Shot Panel

Tasks:

1. Build `CameraShotPanel`.
2. Add:
   - create shot
   - select keyframe
   - edit time/position/lookAt/fov/ease
   - Set Key From View
   - View Through Camera
   - Look At Selected
   - preview shot
3. Save camera shot JSON through commands.
4. Add UI tests or Playwright smoke where practical.

Self-check:

- Full validation.
- Browser check: create/edit/preview/save camera shot.
- Confirm saved shot reloads and validates.

Commit suggestion:

```txt
feat: edit camera shots in inspector
```

Phase 5 acceptance:

- `cam_gate_reveal` can be created, edited, previewed, saved, and played.
- Timeline camera track uses Director Camera through the runtime adapter.

Push after Phase 5.

## Phase 6: Timeline Editor

Goal: edit timeline tracks and keyframes in the editor.

### Round 6.1: Timeline Panel Shell

Tasks:

1. Build:
   - `TimelinePanel`
   - track list
   - time ruler
   - playhead
2. Load and select timeline JSON.
3. Show current timeline duration and tracks.
4. Scrub playhead to call timeline preview path.

Self-check:

- Full validation.
- Browser check: select timeline and scrub playhead.

Commit suggestion:

```txt
feat: add timeline panel shell
```

### Round 6.2: Track CRUD

Tasks:

1. Add commands for:
   - add track
   - remove track
   - update track
2. Support MVP track types:
   - action
   - animation.play
   - camera.shot
   - property
   - subtitle
   - sound
3. Save timeline JSON.
4. Add tests for timeline command operations.

Self-check:

- Full validation.
- Browser check: add/remove/save/reload tracks.

Commit suggestion:

```txt
feat: edit timeline tracks
```

### Round 6.3: Keyframe And Marker Editing

Tasks:

1. Add commands for:
   - add keyframe or marker
   - remove keyframe or marker
   - move keyframe or marker
   - update action marker payload
2. Add inspector/form UI for selected track item.
3. Validate edited actions through schema.

Self-check:

- Full validation.
- Browser check: edit action marker and scrub/play.
- Confirm action schema validation is visible.

Commit suggestion:

```txt
feat: edit timeline keyframes and markers
```

### Round 6.4: Playback Controls And Preview UX

Tasks:

1. Add timeline controls:
   - play
   - pause
   - stop
   - seek
   - scrub
2. Distinguish edit/play/preview modes clearly.
3. Ensure preview mode does not execute unsafe actions.
4. Add tests around mode behavior.

Self-check:

- Full validation.
- Browser check: play and scrub timeline from editor.
- Architecture check for side effects.

Commit suggestion:

```txt
feat: control timeline playback from editor
```

### Round 6.5: Timeline Editor Polish And Smoke

Tasks:

1. Improve layout and interaction ergonomics.
2. Add Playwright smoke for:
   - page opens without console errors
   - timeline panel exists
   - playhead can move
   - a marker/track can be selected
3. Ensure text and controls fit at desktop and mobile-ish widths if supported.
4. Fix any visual overlap or broken states.

Self-check:

- Full validation.
- Playwright smoke.
- Browser screenshots if visual regressions are suspected.

Commit suggestion:

```txt
test: cover timeline editor smoke flow
```

Phase 6 acceptance:

- Users can create action markers, camera shot tracks, and animation tracks.
- Dragging playhead scrubs preview.
- Saved timeline JSON reloads and validates.

Push after Phase 6.

## Phase 7: Trigger And Physics Layer

Goal: make trigger zones and lightweight collision reliable.

### Round 7.1: Collider Schema And AABB Trigger Runtime

Tasks:

1. Add collider/trigger zone schema fields if not already present.
2. Implement AABB trigger detection.
3. Add `trigger.enter` and `trigger.exit`.
4. Add tests for trigger overlap and event dispatch.
5. Keep Rapier optional; do not integrate it unless AABB semantics are stable and the scope still fits.

Self-check:

- Full validation.
- Architecture check.
- Integration test: entity enters trigger and event fires.

Commit suggestion:

```txt
feat: support aabb trigger zones
```

### Round 7.2: Trigger Visualization And Debug Draw

Tasks:

1. Visualize trigger bounds in editor mode.
2. Add debug draw toggle.
3. Add reference validation for trigger targets.
4. Add Playwright/browser smoke for trigger visualization if practical.
5. Document whether Rapier is deferred or minimally integrated.

Self-check:

- Full validation.
- Browser check: trigger bounds visible in edit mode.
- Data validation catches missing trigger targets.

Commit suggestion:

```txt
feat: visualize trigger zones
```

Phase 7 acceptance:

- Trigger zones can fire events.
- Bounds are visible in edit mode.
- Reference validation catches missing trigger target errors.

Push after Phase 7.

## Completion Criteria

The long-running goal is complete only when:

1. Phase 0-7 acceptance criteria pass.
2. Full validation passes:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
   - `npm run test`
   - `npm run validate-data`
3. Playwright smoke tests pass for editor surfaces that exist.
4. Import boundary checks show no forbidden Three.js usage.
5. No JSON DSL uses eval, raw script strings, or unregistered function execution.
6. Demo data covers the intended MVP room flow:
   - player spawn
   - switch
   - locked gate
   - key/condition
   - event
   - action
   - timeline
   - camera shot
   - animation
   - subtitle/sound/flag where assets permit
7. The repository has a final clean `git status`.
8. All phase-end commits are pushed to `origin/main`, unless the user gives a different branch strategy.

## If You Are Unsure

Use this priority order:

1. Read the relevant section in `docs/Sinan_Scene_Director_研发方案与架构指南.md`.
2. Check `docs/development-plan.md` for the short plan.
3. Check `AGENTS.md` for repository-specific rules.
4. Check `docs/codex-git-workflow.md` and `docs/codex-ops-workflow.md` for command workflow.
5. Inspect nearby code and tests.
6. Make the smallest architecture-preserving implementation.
7. Ask the user only if the decision changes product scope, data model compatibility, or phase acceptance criteria.
