# Phase 24 Delivery Gameplay Showcase Design Lock

Date: 2026-06-22
Status: Round 24.1 design lock.

## Baseline

Phase 24 starts from the accepted Phase 23 baseline:
`1417f10 docs: finalize phase 23 spherical world prototype` on `main` /
`origin/main`.

Phase 23 is PASS in `docs/phase-23-compact-spherical-world-prototype-final-report.md`.
It provides the compact cube-sphere world, spherical entity placements, three readable
regions, deterministic spherical-region movement through `EngineSession`, stable
spherical camera sampling, director camera compatibility, LOD/scatter readability, and
browser smoke evidence.

This phase uses those seams as playable infrastructure. It does not re-open Phase 23
projection, camera, LOD, or scatter scope.

## Current Audit

- `src/engine/EngineMode.ts` already declares `showcase`, but the editor shell still
  exposes only editor-oriented modes and panels.
- `src/editor/EditorApp.tsx` owns slow UI state and always renders editor panels and the
  timeline today. Phase 24 will add a Showcase Mode shell that hides those panels.
- `src/editor/Viewport.tsx` already hosts runtime diagnostics and smoke-only movement
  hooks. Phase 24 may extend this seam for delivery/showcase smoke, keeping it narrow.
- `src/engine/EngineSession.ts` and `src/world/World.ts` already expose
  `stepSphericalMovement`, which is the movement seam for the first-party showcase
  controller.
- `src/world/SurfaceMovement.ts` owns deterministic local-region movement and clamps
  inside region bounds. Phase 24 will build on that behavior rather than adding physics.
- `src/schemas/*`, `src/data/*`, and `scripts/validate-data.ts` have no delivery job
  contract yet.
- The existing event/action/condition system is typed and data-driven. Delivery gameplay
  should add explicit job actions and conditions where needed, not `function.call`
  shortcuts.
- `src/runtime/RuntimeTypes.ts`, `src/runtime/WebRuntime.ts`, and
  `src/runtime/three/ThreeRuntime.ts` have no route marker or delivery target feedback
  contract yet.
- `data/levels/level_01.json` is the compact spherical-world fixture for this phase.

## Scope

Phase 24 completes a playable single-player Delivery Gameplay Showcase:

- Showcase Mode without editor panels.
- Minimal first-party player controller using the Phase 23 spherical movement seam.
- Deterministic interaction radius for endpoints and interactables.
- Delivery job schema, validation, source data, and runtime state.
- Route marker and delivery target feedback.
- Acceptance, progress, ready-to-deliver, and completion feedback.
- Editor affordances for inspecting or editing delivery job data.
- One NPC or mailbox endpoint and one to two complete delivery jobs.
- Browser smoke for a successful accept, move, deliver, and complete flow.

## Non-Scope

Phase 24 does not implement Phase 25 multiplayer-lite, WebSocket rooms, remote avatars,
network schemas, Physics/Rapier, external InputFlow, ViewRig, LudoWeave, Inscape, Audio
runtime, production Runtime UI, broad input rebinding, a general gameplay framework,
save/progression systems, dialogue systems, or arbitrary script execution.

## Data Contract

`data/**/*.json` remains the source of truth.

Delivery jobs will be authored as plain data on the level for this vertical slice. The
initial contract should add an optional `deliveryJobs` array to the level schema instead
of introducing a separate package or external data source. A future phase may split job
catalog data into separate files if multiple levels require it.

Each delivery job should define:

- `id`, `title`, and `description`.
- `acceptEndpointId` and `targetEndpointId`.
- `defaultStatus`, initially `available`.
- Optional package/message metadata.
- Optional route hints using endpoint ids or spherical-region hints.
- Completion rules using explicit status and endpoint references.
- Feedback text for accepted, in-progress, ready, and completed states.

Delivery endpoints should be regular entities with a typed component such as
`DeliveryEndpoint`. The component should contain an `endpointId`, `kind` such as `npc` or
`mailbox`, a readable `label`, an `interactionRadius`, and prompt text. Endpoint ids are
gameplay data ids, not DOM ids or Three object ids.

Validation must reject duplicate job ids, duplicate endpoint ids, missing endpoint
references, invalid default statuses, stale region/entity references, malformed route
hints, and jobs whose accept and target endpoints cannot be resolved.

## Runtime State

Delivery runtime state is derived from source data at load/reset time. It must not mutate
authoring JSON during normal play.

The first state machine should support:

- `available`
- `accepted`
- `inProgress`
- `readyToDeliver`
- `completed`
- `blocked` for invalid or temporarily unavailable runtime paths

State transitions belong in a renderer-neutral first-party gameplay module, likely under
`src/game/**`. The module should be unit-testable without React, the browser, or Three.
`EngineSession` may own the session instance and expose narrow commands such as accepting
or completing the nearest delivery job.

## Interaction Solver

The interaction solver should be deterministic and renderer-neutral. It should read
runtime transforms or spherical placements from `World`, compare the player location to
candidate endpoints, and return the nearest valid candidate within radius.

The solver should handle no player, missing endpoint, stale placement, incompatible
region, out-of-range candidate, and multiple candidates with stable tie-breaking.

## Showcase Controller

Showcase controls are first-party and minimal:

- Keyboard movement drives `EngineSession.stepSphericalMovement`.
- Interaction input triggers a narrow delivery interaction command.
- No external InputFlow dependency is introduced.
- No production input remapping is introduced.

React may collect browser input events and display slow state, but per-frame movement,
interaction resolution, and job transition rules stay outside React.

## Showcase Shell

Showcase Mode should be user-facing and reversible. It should:

- Hide the left panel, right panel, timeline, inspector, asset browser, and editor-only
  selection affordances.
- Keep the runtime viewport as the primary surface.
- Show only minimal HUD/status affordances needed for the delivery showcase.
- Set the engine session mode to `showcase`.
- Preserve Editor Mode, Play Mode, and Preview Mode compatibility.

## Feedback Model

Route and target feedback should be modeled as renderer-neutral runtime feedback data:

- Current job id and status.
- Accept endpoint and target endpoint ids.
- Optional route hint points or endpoint positions.
- Interaction prompt and completion text.
- Target highlight state.

`src/runtime/three/**` owns the actual route marker meshes, target indicators, helper
geometry, material choices, and disposal. Higher-level schema, event, editor, and gameplay
code must not depend on Three classes.

## Events And Actions

Delivery gameplay may extend the existing typed event/action/condition registries with
explicit delivery actions and conditions. Core job rules should not rely on generic
`function.call` dispatch.

Existing switch, gate, material, subtitle, sound, camera, timeline, and trigger behavior
must remain compatible.

## Editor Affordances

Editor Mode should be able to inspect delivery job data during Phase 24. Edits, where
supported, should be command-backed and should preserve undo/redo patterns. Unknown or
unsupported delivery fields may be read-only until the editor affordance round expands
them deliberately.

## Validation Plan

Each implementation round should keep checks local first, then run the project wrapper
gates. Expected coverage by the end of Phase 24:

- Schema and data validation for delivery jobs and endpoints.
- Unit tests for runtime state transitions.
- Unit tests for interaction radius resolution.
- Tests for route/target feedback snapshots.
- Editor tests for Showcase Mode shell and job affordances.
- Playwright smoke for accepting, moving, delivering, and completing one job.
- Regression smoke that Editor Mode remains usable after Showcase Mode work.
- Boundary checks proving Three.js remains isolated to runtime/editor glue.

## Risks

- The current movement seam clamps inside a single spherical region, so Phase 24 jobs
  should place endpoints in reachable positions inside the compact fixture unless a
  later round deliberately adds region transfer behavior.
- HUD/status work can drift into production Runtime UI scope. Keep it minimal and local
  to the showcase.
- Delivery can drift into a full quest/inventory framework. Keep the contract small and
  explicit for one to two jobs.
- Route feedback can leak renderer details into data or React. Keep feedback snapshots
  renderer-neutral and Three visuals inside `src/runtime/three/**`.

