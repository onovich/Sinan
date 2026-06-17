# Sinan Scene Director Post-MVP Development Plan

This plan starts after the accepted Phase 0-7 MVP. The current MVP proves the architecture, data model, editor shell, timeline/director systems, camera shots, AABB triggers, registry validation, and browser smoke tests.

The next objective is to turn the architecture MVP into a useful, inspectable, asset-backed editor and demo experience.

Important product note: the accepted MVP is intentionally immature in UI and rendering. It proves the architecture, not the final experience. The post-MVP plan explicitly prioritizes rendering quality, demo presentation, and editor UX instead of treating them as incidental polish.

## Planning Assumption

One session round means one complete implementation checkpoint:

1. inspect relevant docs and code
2. implement a scoped slice
3. debug locally
4. run validation
5. run architecture checks
6. update docs if behavior changed
7. commit and push when the phase or checkpoint is complete

## Phase Summary

| Phase | Name | Goal | Estimated Rounds |
| --- | --- | --- | ---: |
| Phase 8 | Real Asset Runtime | Replace placeholder rendering with a real GLB/glTF pipeline while keeping fallback behavior | 4 |
| Phase 9 | Demo Visual Pass | Build a visually legible asset-backed demo room with lighting, helpers, and presentation affordances | 4 |
| Phase 10 | Runtime Effects Integration | Make action/timeline effects visible and audible in runtime/editor preview | 4 |
| Phase 11 | Editor UI/UX Redesign | Mature the editor shell, panels, toolbars, states, and interaction model | 5 |
| Phase 12 | Authoring Workflow And Data Safety | Improve authoring flows, save-time validation, dirty-state tracking, migrations, and asset/reference hardening | 4 |
| Phase 13 | Testing, Performance, And Boundaries | Expand browser automation, enforce architecture boundaries, and address build/runtime performance risks | 4 |
| Phase 14 | Release Candidate Packaging | Prepare a documented, reproducible, demo-ready release candidate | 2 |
| Phase 15 | Optional Advanced Gameplay Layer | Add optional Rapier/physics or richer gameplay systems after the asset-backed demo is stable | 4-6 |

Recommended core path: Phase 8 through Phase 14.

Optional path: Phase 15 only after Phase 14 is stable.

Core path estimate: 27 rounds.

With optional Phase 15: 31-33 rounds.

## Rendering And Demo Visual Principles

These principles apply from Phase 8 onward:

1. The main viewport should reveal actual scene structure and interaction targets, not just placeholder boxes.
2. Use real or generated GLB assets where possible; keep placeholders only as fallback or clearly marked development helpers.
3. Use restrained but deliberate lighting: ambient, key/fill, shadows where practical, and readable material contrast.
4. Keep editor helpers such as grid, transform gizmo, camera preview, and trigger bounds visually distinct from game objects.
5. Add a presentation path for the demo. A future Showcase Mode may hide authoring panels and play the open-gate flow.
6. Browser smoke should check that rendering is nonblank and visually varied, not only that DOM nodes exist.

## Editor UI/UX Principles

These principles apply especially to Phase 11 and Phase 12:

1. Treat the editor as a work tool, not a landing page.
2. Keep the shell stable: top toolbar, left hierarchy/assets, central viewport, right inspector, bottom timeline.
3. Use icon or icon+text controls for common tools where an icon is recognizable; use text buttons for clear commands.
4. Make Play, Edit, and Preview modes visually distinct.
5. Avoid high-frequency runtime state in React. React should show slow editor state and sampled status only.
6. Every editable data path should expose validation state, dirty state, save state, and undo/redo behavior.
7. Timeline and Camera Shot panels should feel like authoring tools, not raw JSON editors.
8. UI smoke tests should cover actual workflows: select, edit, preview, save, reload, and inspect validation errors.

## Phase 8: Real Asset Runtime

Goal: replace placeholder-only model rendering with a real GLB/glTF loading pipeline inside `src/runtime/three/**`.

Estimated rounds: 4.

### Scope

- Add `GLTFLoader` inside the Three runtime adapter.
- Cache loaded GLB assets by asset id.
- Instantiate scene clones for each entity.
- Preserve renderer-neutral `WebRuntime` contracts.
- Preserve deterministic placeholder fallback when an asset is missing, invalid, or still loading.
- Capture animation clips from GLB files.
- Route `animation.play`, `animation.stop`, and `setAnimationTime` to real `AnimationMixer` behavior when clips exist.
- Keep tests deterministic by using mocks/fakes where real GLB loading is unsuitable.

### Round Plan

Round 8.1: GLB loader adapter

- Add a loader module under `src/runtime/three/**`.
- Implement async model loading and cache state.
- Keep placeholder fallback.
- Add unit tests around cache state and error fallback.

Round 8.2: model instantiation and disposal

- Clone loaded GLB scenes safely.
- Track entity id to `Object3D` mapping.
- Ensure geometry/material/texture disposal remains correct.
- Verify repeated instantiate/destroy does not leak obvious objects.

Round 8.3: animation bridge

- Store GLB clips per asset/entity.
- Implement `AnimationMixer` playback, stop, fade, loop, and seek.
- Keep command behavior stable when clips are missing.

Round 8.4: smoke and docs

- Add or update browser smoke to confirm asset-backed rendering.
- Document GLB loading behavior, fallback behavior, and accepted MVP limitations.

### Acceptance

- Assets listed in `data/assets.manifest.json` can load real `.glb` files from `public/models/**`.
- Missing assets still show placeholders and surface useful errors.
- `animation.play` can play a real clip when available.
- `setAnimationTime` supports timeline scrub for real clips.
- `npm run validate-data`, `npm run test`, `npm run build`, and smoke pass.
- No Three.js type leaks outside allowed runtime/editor glue.

## Phase 9: Demo Visual Pass

Goal: turn `level_01` into a small, coherent, visually legible, asset-backed demo that can be shown and tested.

Estimated rounds: 4.

### Scope

- Add minimal real assets under `public/models/**` and `public/audio/**`.
- Update asset manifest and demo data.
- Add a small room, door, switch, trigger bounds, player marker, and optional NPC marker.
- Add a first visual pass: camera framing, grid/helper layer, light setup, material contrast, and readable scale.
- Distinguish debug/editor helpers from game objects.
- Add or plan a Showcase Mode path that can play the demo without the authoring UI dominating the view.
- Ensure the gate timeline uses real or placeholder-compatible animation/sound/subtitle/camera effects.
- Keep all data Git-friendly JSON.

### Round Plan

Round 9.1: asset folders and manifest

- Add `public/models/` and `public/audio/`.
- Add initial GLB/audio assets or lightweight generated development assets.
- Update `data/assets.manifest.json`.
- Validate asset paths.

Round 9.2: demo scene data pass

- Update `data/prefabs/**`, `data/levels/level_01.json`, `data/timelines/tl_open_gate.json`, and `data/cameraShots/cam_gate_reveal.json`.
- Ensure entity ids, prefab ids, timeline ids, camera shot ids, and asset ids are stable and validated.

Round 9.3: lighting, framing, and helper layers

- Tune camera defaults, ambient/key/fill lights, ground/grid visibility, and readable material colors.
- Ensure trigger bounds and editor helpers are visually distinct from gameplay assets.
- Confirm the open-gate scene is understandable at first glance.

Round 9.4: demo smoke

- Add browser smoke around visible demo entities and the open-gate flow.
- Validate trigger bounds, timeline play, camera preview, and action results.

### Acceptance

- Opening the editor shows an asset-backed room demo.
- The viewport is visually legible: the room, gate, switch, trigger helper, and camera framing are distinguishable.
- Switch, gate, trigger zone, camera shot, timeline, subtitle/sound markers, and flag action are present in data.
- Timeline playback produces visible runtime changes.
- Browser smoke proves the demo is nonblank and interactive.

## Phase 10: Runtime Effects Integration

Goal: make registry actions and timeline tracks produce visible/audible effects in runtime and preview mode.

Estimated rounds: 4.

### Scope

- Add runtime/HUD bridges for subtitle and sound.
- Make `camera.playShot` route through Director Camera.
- Implement `entity.animateTransform` as a sampled, preview-safe transform animation path.
- Ensure timeline action tracks, animation tracks, sound tracks, subtitle tracks, and property tracks have clear runtime behavior.
- Preserve side-effect classification.

### Round Plan

Round 10.1: subtitle and HUD bridge

- Add a lightweight HUD subtitle surface.
- Route `subtitle.show` from actions/timeline into HUD state without polluting high-frequency runtime state.

Round 10.2: audio bridge

- Add an audio runtime interface or editor-safe audio service.
- Route `sound.play` through the service.
- Keep browser autoplay restrictions in mind; provide graceful fallback.

Round 10.3: camera and transform actions

- Route `camera.playShot` through `DirectorCameraSystem`.
- Implement `entity.animateTransform` through director sampling or a runtime command path.
- Add tests for scrub safety.

Round 10.4: integrated timeline effects

- Run the open-gate timeline end to end.
- Add smoke coverage for visible subtitle/camera/timeline state.

### Acceptance

- `sound.play` and `subtitle.show` produce observable runtime/editor behavior.
- `camera.playShot` uses the runtime adapter path, not direct Three.js access outside the adapter.
- `entity.animateTransform` can be previewed safely.
- Runtime-only and destructive actions still do not run during unsafe scrub.

## Phase 11: Editor UI/UX Redesign

Goal: mature the editor shell, panels, toolbars, visual states, and interaction model so the tool feels intentionally designed rather than prototype-generated.

Estimated rounds: 5.

### Scope

- Stabilize the editor layout: top toolbar, hierarchy/assets, viewport, inspector, timeline.
- Improve visual hierarchy, spacing, labels, panel density, empty states, disabled states, hover/focus states, and status states.
- Make Edit, Play, and Preview modes visually distinct.
- Iconize or icon+text common tool controls where appropriate.
- Improve Inspector, EventInspector, TimelinePanel, and CameraShotPanel composition without changing their core data contracts.
- Add visible validation, dirty, saving, saved, failed, and preview status patterns.
- Keep data edits command-backed.

### Round Plan

Round 11.1: editor shell layout pass

- Rework layout, panel sizing, scroll behavior, toolbar grouping, and status placement.
- Keep the app as a working editor, not a marketing page.

Round 11.2: toolbar and mode UX

- Make Edit, Play, and Preview mode affordances clearer.
- Improve transform tool controls and command buttons.
- Add tooltips/accessible labels where icons are introduced.

Round 11.3: panel visual redesign

- Improve Hierarchy, Inspector, Asset, Event, Camera Shot, Event Debug, and Timeline panel presentation.
- Keep text compact and readable inside panels.

Round 11.4: validation and state UX

- Add consistent UI treatment for validation messages, dirty state, save state, preview state, and runtime/debug state.

Round 11.5: UI smoke and responsive pass

- Add browser smoke for mode switching, panel visibility, timeline interaction, and validation/status UI.
- Check common desktop and narrow viewports for overlap or unreadable controls.

### Acceptance

- The editor has a stable, intentional visual hierarchy.
- Edit, Play, and Preview modes are visually distinct.
- Common controls are easier to scan and use.
- Validation, dirty, save, and preview states are visible and consistent.
- Browser smoke covers the redesigned shell and catches layout/interaction regressions.

## Phase 12: Authoring Workflow And Data Safety

Goal: make common authoring tasks practical in UI and make project data safer to edit over time.

Estimated rounds: 4.

### Scope

- Improve component editing in Inspector.
- Improve EventInspector for actions and conditions.
- Improve TimelinePanel for markers, tracks, and keyframes.
- Improve CameraShotPanel for key management and preview.
- Save-time validation.
- Dirty-state tracking.
- Migration scaffolding.
- Stronger reference and asset checks.
- Better validation reports.

### Round Plan

Round 12.1: component and inspector authoring

- Add structured editing for common components: Transform, Renderable, Door, Switch, Interactable, Collider, TriggerZone.
- Use schema-backed validation.

Round 12.2: event, timeline, and camera authoring

- Add action/condition add/remove/reorder editing.
- Add better marker/keyframe selection and inline controls.
- Add add/remove/reorder camera keyframe operations.
- Keep all edits command-backed.

Round 12.3: save-time validation and dirty state

- Validate JSON before writing through the dev save API.
- Track dirty state per level/event/timeline/camera shot.
- Surface save failures clearly.

Round 12.4: migrations and stronger validators

- Add `src/migrations/**` and `scripts/migrate-data.ts`.
- Implement a first no-op or example migration with tests.
- Document migration rules.
- Extend `validate-data` for asset URL checks, animation clip metadata where available, duplicate ids, registry coverage, and custom whitelist coverage.

### Acceptance

- A user can author or modify the demo interaction without directly editing JSON.
- Invalid action/condition/timeline/camera data is blocked or clearly reported before save.
- Undo/redo covers the main editor data edits.
- Save API refuses invalid data with useful errors.
- Dirty state is visible and reliable.
- Migration script exists and is tested.
- `validate-data` catches common broken-reference and registry problems.

## Phase 13: Testing, Performance, And Boundaries

Goal: harden the codebase so future feature work does not erode the architecture.

Estimated rounds: 4.

### Scope

- Expand Playwright coverage.
- Add import boundary checks as tests or scripts.
- Address Vite chunk size warning.
- Add runtime smoke for GLB loading and timeline effects.
- Add performance/disposal guardrails where practical.

### Round Plan

Round 13.1: browser smoke expansion

- Cover entity selection, transform changes, save/reload, event editing, camera shot editing, and timeline editing.

Round 13.2: architecture boundary automation

- Add a script such as `npm run check-boundaries`.
- Check forbidden Three.js imports and dynamic-code patterns.
- Wire it into ops workflow.

Round 13.3: build and bundle hygiene

- Reduce chunk size with dynamic imports or manual chunks where reasonable.
- Keep app startup stable.

Round 13.4: runtime lifecycle tests

- Add tests around repeated load/destroy/dispose.
- Add smoke around no console errors during common flows.

### Acceptance

- Expanded browser smoke passes.
- Boundary checks run in regular validation.
- Build warning is resolved or documented with an accepted rationale.
- Runtime lifecycle has regression tests.

## Phase 14: Release Candidate Packaging

Goal: make the project easy to run, validate, and demonstrate from a clean checkout.

Estimated rounds: 2.

### Scope

- README and developer docs.
- Asset authoring docs.
- Demo script.
- Release checklist.
- Optional static deployment or packaged preview.

### Round Plan

Round 14.1: documentation

- Update README with setup, commands, architecture, and demo workflow.
- Add GLB export guidelines, animation clip naming, and asset manifest rules.
- Add action/condition extension guide.

Round 14.2: release candidate checklist

- Add a release checklist document.
- Run clean install validation.
- Confirm demo workflow from fresh checkout.

### Acceptance

- A new developer can clone, install, run, validate, and open the demo using documented commands.
- The project has clear docs for adding assets, actions, conditions, timelines, and camera shots.
- Release checklist passes.

## Phase 15: Optional Advanced Gameplay Layer

Goal: add optional advanced gameplay/physics features after the asset-backed demo is stable.

Estimated rounds: 4-6.

### Scope Options

Choose one track before starting:

1. Rapier integration
   - Add Rapier colliders and scene queries.
   - Keep AABB triggers as fallback.
   - Add physics debug draw.

2. Character control
   - Add simple player movement and interaction radius.
   - Add input and camera follow.
   - Keep editor mode separate from play mode.

3. Dialogue/quest layer
   - Add dialogue JSON schema.
   - Add quest state condition/action support.
   - Add editor forms and validation.

### Acceptance

- The selected track has schema, registry/runtime behavior, editor affordance, validation, and tests.
- It does not break the Phase 8-14 demo path.

## Recommended Next Step

Start with Phase 8.

Use this goal:

```txt
Implement Phase 8 from docs/post-mvp-development-plan.md: real GLB/glTF asset runtime inside the ThreeRuntime adapter, with cache, clone, animation bridge, fallback placeholders, tests, docs, and validation.
```

Do not start Phase 9 until Phase 8 acceptance passes.
