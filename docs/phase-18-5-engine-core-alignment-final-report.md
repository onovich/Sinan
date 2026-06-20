# Phase 18.5 Engine Core Alignment Final Report

Date: 2026-06-20

## Status

PASS.

Phase 18.5 completed the lightweight engine-root alignment checkpoint between Phase 18 and Phase 19. The editor still opens the Gate Demo and preserves existing smoke-covered authoring workflows, while runtime orchestration now sits behind an explicit engine/session boundary.

## Completed

- Added renderer-neutral engine contracts under `src/engine/**`: `EngineMode`, `EngineLoop`, and `EngineSession`.
- Added a minimal renderer-neutral world layer under `src/world/**` with entity storage, transform read/write, and debug/test snapshots.
- Added `src/editor/EditorSessionBridge.ts` so selection, editor camera input, transform gizmo wiring, selected entity state, and trigger debug visibility are routed through a bridge instead of direct Viewport ownership.
- Moved project load, runtime object creation, style/environment/material synchronization, update/render ordering, resize delegation, trigger debug sync, and disposal orchestration out of `src/editor/Viewport.tsx`.
- Updated `scripts/check-boundaries.ts` so `src/engine`, `src/world`, `src/physics`, `src/input`, `src/ui`, and `src/renderer` are covered by the no-Three-import policy.
- Updated runtime-style documentation to reference `EngineSession.loadProject` instead of the removed `loadProjectIntoRuntime` helper.
- Updated roadmap entry points so Phase 19 is the next active implementation phase.

## Engine Root

- EngineSession: owns project loading, renderer-neutral `World` creation, runtime object synchronization, frame stepping, resize delegation, selection/debug runtime state, and disposal.
- EngineLoop: owns deterministic update-before-render ordering, edit/play/preview/showcase mode context, injected frame scheduler support, stop, and dispose behavior.
- EngineMode: defines `edit`, `play`, `preview`, and `showcase` readiness.
- World: initializes from level data, keeps cloned entity data, supports entity id lookup, entity reads, transform reads/writes, and snapshots without React, DOM, Three.js, GLSL, or raw shader uniforms.
- EditorSessionBridge: keeps editor-only interaction mapping outside the engine root while allowing Viewport to remain a canvas mount and React event surface.

## Validation

- `npm run test -- World EngineSession EngineLoop`: PASS in Round 18.5.1.
- `npm run test -- EngineSession EditorSessionBridge ViewportRuntimeStyle ThreeRuntime`: PASS in Round 18.5.2, 4 files / 12 tests.
- `npm run typecheck`: PASS.
- `npm run check-boundaries`: PASS, including the new semantic directories.
- `npm run validate-data`: PASS, 5 prefabs, 1 level, 3 events, 1 timeline, 1 camera shot, 1 palette, 5 assets.
- `Validate.cmd`: PASS in Round 18.5.2 and again in Round 18.5.3 with 44 test files / 171 tests, build, lint, asset report, and migration check.
- `Smoke.cmd`: PASS in Round 18.5.2 and again in Round 18.5.3 with 15 Playwright smoke tests, including shader compile, styled runtime nonblank/low-end pixels, viewport navigation, transform gizmo, timeline preview, save/reload, and narrow viewport containment.
- `git diff --check`: PASS before each Phase 18.5 commit and before the final report commit.

## Boundary Evidence

- `scripts/check-boundaries.ts` now checks `src/engine`, `src/world`, `src/physics`, `src/input`, `src/ui`, and `src/renderer`.
- `src/engine/**` imports data selectors, runtime interfaces/types, collider schemas, and `src/world/**`; it does not import Three.js or React.
- `src/world/**` stores JSON-derived entity data and transforms only; it does not store `THREE.Object3D`, DOM nodes, React state, GLSL, or raw shader uniforms.
- `src/runtime/three/**` remains the Three.js implementation boundary.

## Commits

- `09e4e2b feat: add engine core alignment contracts` pushed to `origin/main`.
- `1de3df1 refactor: route viewport runtime through engine session` pushed to `origin/main`.
- Final documentation commit `docs: finalize phase 18.5 engine core alignment` contains this report and roadmap handoff updates.

## Known Limitations

- `World` is intentionally minimal. It does not yet own physics, gameplay actions, input interpretation, UI lifetime, material timeline state, or director command execution.
- `EngineSession` synchronizes current project data to `WebRuntime`; it does not yet provide a generalized diff/flush system for future action systems.
- `EditorSessionBridge` covers current editor selection, camera, gizmo, selected entity, and trigger debug needs. Dirty/save state remains in existing editor store flows.
- Runtime initialization still occurs at the canvas/adapter mount boundary in `Viewport.tsx`; the engine root receives an initialized `WebRuntime`.
- Package identity migration to `sinan-engine` remains explicitly out of scope.

## Phase 19 Handoff

Recommended next goal: Phase 19 Shader Dissolve And Material Timeline.

Use `docs/phase-19-shader-dissolve-material-timeline-goal-mode-execution-guide.md` as the active goal-mode guide.

Phase 19 should use `EngineSession` and `EditorSessionBridge` as the integration path for material timeline tracks and material actions. Do not put material timeline/action runtime orchestration back into `src/editor/Viewport.tsx`.

Suggested next prompt:

```txt
Complete Phase 19 from docs/abeto-messenger-development-plan.md: Shader Dissolve And Material Timeline. Start only after confirming docs/phase-18-5-engine-core-alignment-final-report.md is PASS and pushed.
```
