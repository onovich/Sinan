# Phase 24 Delivery Gameplay Showcase Goal Mode Execution Guide

Date: 2026-06-22
Status: Guide for an executor running Phase 24 in goal mode.

Phase 24 starts after Phase 23 Compact Spherical World Prototype is PASS and pushed. The accepted baseline is `1417f10 docs: finalize phase 23 spherical world prototype` on `main` / `origin/main`.

The goal of this phase is to turn the compact spherical-world prototype into a playable single-player delivery showcase. Phase 24 adds a Showcase Mode shell, minimal first-party player controller, interaction radius, delivery job data/state, route and target feedback, completion feedback, editor affordances for job data, and one to two complete delivery jobs. It must not implement multiplayer, networking, Phase 25 social systems, external InputFlow/ViewRig/LudoWeave/Inscape adapters, Physics/Rapier, production Runtime UI framework, or a general-purpose gameplay framework.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 24 for Sinan: Delivery Gameplay Showcase. Start only after Phase 23 is PASS and pushed; the accepted baseline is 1417f10 docs: finalize phase 23 spherical world prototype. Read AGENTS.md, docs/development-plan.md, docs/abeto-messenger-development-plan.md, docs/post-mvp-execution-workflow.md, docs/phase-23-compact-spherical-world-prototype-final-report.md, docs/phase-23-compact-spherical-world-prototype-goal-mode-execution-guide.md, docs/phase-22-lod-instancing-and-vegetation-final-report.md, docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md, docs/strategy/adapter-boundary-policy.md, docs/rfcs/rfc-002-sinan-input-context.md, docs/rfcs/rfc-003-sinan-runtime-ui-viewmodel.md, docs/rfcs/rfc-004-sinan-camera-pose-shot-rig-boundary.md, docs/developer-guide.md, docs/Sinan_Scene_Director_研发方案与架构指南.md, .codex/project-ops-workflow.json, and .codex/project-git-workflow.json before editing. Implement Phase 24 only: add Showcase Mode without editor panels, a minimal first-party player controller using the Phase 23 spherical movement seam, interaction radius, delivery job schema/data/validators, delivery job runtime state, route marker and target feedback, completion feedback, editor affordances for job data, one NPC or mailbox endpoint, 1-2 complete delivery jobs, browser smoke for a successful job flow, docs, and a Phase 24 final report. Keep data/**/*.json as the source of truth. Keep Three.js route markers, target indicators, feedback meshes, camera internals, renderer counters, LOD/scatter/spherical placement details, and visual bridge code inside src/runtime/three/** and smoke/test fixtures. React may own Showcase/HUD slow state and editor affordances, but not per-frame movement, spherical projection, job runtime rules, event/action semantics, or renderer accounting. Do not add multiplayer, WebSocket rooms, remote avatars, Phase 25 social systems, Physics/Rapier, external InputFlow, ViewRig, LudoWeave, Inscape, Audio runtime, production Runtime UI framework, broad input rebinding, external adapters, or a general gameplay framework. Every round must run Debug self-check, architecture self-check, validation, commit, and push before proceeding.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `docs/development-plan.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/phase-23-compact-spherical-world-prototype-final-report.md`
- `docs/phase-23-compact-spherical-world-prototype-goal-mode-execution-guide.md`
- `docs/phase-22-lod-instancing-and-vegetation-final-report.md`
- `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md`
- `docs/phase-21-5-poc-sequencing-and-roadmap-routing.md`
- `docs/strategy/adapter-boundary-policy.md`
- `docs/rfcs/rfc-002-sinan-input-context.md`
- `docs/rfcs/rfc-003-sinan-runtime-ui-viewmodel.md`
- `docs/rfcs/rfc-004-sinan-camera-pose-shot-rig-boundary.md`
- `docs/rfcs/rfc-007-sinan-audio-system-boundary.md`
- `docs/developer-guide.md`
- `docs/Sinan_Scene_Director_研发方案与架构指南.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Inspect these implementation areas before changing them:

- `data/levels/**`
- `data/prefabs/**`
- `data/events/**`
- `data/timelines/**`
- `data/cameraShots/**`
- `data/assets.manifest.json`
- `src/schemas/action.schema.ts`
- `src/schemas/component.schema.ts`
- `src/schemas/condition.schema.ts`
- `src/schemas/entity.schema.ts`
- `src/schemas/event.schema.ts`
- `src/schemas/level.schema.ts`
- `src/schemas/trigger.schema.ts`
- `src/world/**`
- `src/engine/EngineMode.ts`
- `src/engine/EngineSession.ts`
- `src/events/**`
- `src/director/**`
- `src/runtime/RuntimeTypes.ts`
- `src/runtime/WebRuntime.ts`
- `src/runtime/three/ThreeRuntime.ts`
- `src/editor/Viewport.tsx`
- `src/editor/panels/**`
- `src/editor/commands/**`
- `tests/smoke/editor.spec.ts`
- `scripts/validate-data.ts`
- `scripts/report-assets.ts`
- `scripts/check-boundaries.ts`

Current known context:

- Phase 23 is PASS and provides cube-sphere projection, spherical placements, three readable regions, deterministic surface movement, stable spherical camera sampling, and director camera compatibility.
- `EngineMode` already includes `showcase`; Phase 24 should turn that into an actual user-facing shell without editor panels.
- Existing events/actions/triggers support data-driven interactions, but Phase 24 should avoid arbitrary `function.call` gameplay rules and prefer explicit schemas/registries.
- Phase 21.5 accepts InputFlow, ViewRig, LudoWeave, Inscape, and Audio as future adapter/POC boundaries, not hard dependencies. Phase 24 may reference those RFCs as constraints, but must remain first-party and dependency-free unless a narrow sub-scope is explicitly written in this guide.
- Existing unrelated dirty or untracked files may be present. Do not stage unrelated external docs, strategy notes, generated screenshots, local reports, or user changes.

## 2. What This Phase Must Complete

Phase 24 must complete:

- A documented Phase 24 design lock for single-player Delivery Gameplay Showcase scope.
- A Showcase Mode shell that runs without editor panels and uses the compact spherical world as the playable environment.
- A minimal first-party player controller that builds on Phase 23 surface movement.
- Interaction radius logic that can find nearby endpoints or interactables deterministically.
- Delivery job schema and validation for at least:
  - Job id, title, description, source/accept location, target location, status defaults.
  - Required item/package or message metadata if needed.
  - Route marker references or derived route hints.
  - Completion rules.
  - Rewards/feedback text if needed.
- Delivery job runtime state with deterministic transitions such as available, accepted, inProgress, readyToDeliver, completed, and failed/blocked where relevant.
- Data for one to two complete delivery jobs.
- At least one NPC or mailbox endpoint.
- Route marker, delivery target, acceptance, progress, and completion feedback.
- Editor affordances so Editor Mode can inspect or edit job data without becoming the runtime gameplay system.
- Browser smoke for accepting, moving, delivering, and completing a job.
- Validation, targeted tests, smoke/perf evidence, docs, and `docs/phase-24-delivery-gameplay-showcase-final-report.md`.

## 3. What This Phase Must Not Do

Do not:

- Implement Phase 25 multiplayer-lite, WebSocket rooms, remote-player replication, avatars/emotes/stamps as network systems, or network message schemas.
- Add Physics/Rapier, collision solver, rigid bodies, terrain physics, or a physics-backed character controller.
- Add external InputFlow, ViewRig, LudoWeave, Inscape, Runtime UI, Audio runtime, or any external adapter/dependency.
- Add a broad input rebinding system, production input maps, or user control customization beyond the minimal first-party controller needed for the smokeable showcase.
- Build a general gameplay framework, quest engine, inventory system, dialogue system, economy, save system, or progression system.
- Replace existing Event/Action/Condition registries with arbitrary script execution, `function.call` gameplay shortcuts, eval, string scripts, or dynamic global dispatch.
- Put Three.js classes, camera internals, route marker meshes, target feedback meshes, renderer counters, or derived spherical transforms into `data/**/*.json`, schemas outside renderer-neutral contracts, events, director semantics, or editor state.
- Let React own per-frame player movement, interaction solving, job transitions, route state, camera stabilization, spherical projection, or renderer accounting.
- Make Editor Mode data invalid or non-editable while adding Showcase Mode.
- Commit generated Playwright output, local screenshots, ad hoc perf logs, or temporary reports unless the guide explicitly marks them as stable source fixtures.
- Stage unrelated untracked files, external reference docs, package experiments, generated outputs, or user changes.

## 4. Architecture Boundaries

Data and schema:

- `data/**/*.json` remains the source of truth for delivery jobs, endpoints, interactables, regions, entities, events, timelines, camera shots, LOD groups, scatter groups, and assets.
- Delivery jobs should be plain JSON with schemas, validation, stable ids, readable labels, target references, and explicit state rules.
- Runtime job state is derived from source job data and user actions; it must not overwrite source data during normal play.
- Route/target feedback source data should use public ids and renderer-neutral concepts, not Three object references or DOM ids.

Gameplay/runtime:

- Gameplay systems may live under a first-party semantic layer such as `src/game/**` or `src/world/**`, depending on local patterns. They must stay renderer-neutral.
- Player movement, interaction solving, and job state transitions should be deterministic and testable without the browser.
- `EngineSession` may route mode, movement, interaction, job state, and runtime feedback into the runtime. It must not import `three`.
- Showcase Mode may add a narrow runtime command seam for smoke, but must not become a hidden editor-only path.

UI/editor:

- React may own Showcase shell/HUD slow state, button affordances, status text, and editor panels.
- React must not own per-frame movement, job transition rules, event/action dispatch semantics, or route calculations.
- Editor Mode must still inspect or edit delivery job data through command-backed changes where edits are supported.

Three runtime:

- `src/runtime/three/**` owns visual route markers, target indicators, interaction highlights, helper meshes, renderer diagnostics, object transform application, LOD/scatter/spherical placement visuals, and Three-specific fallback objects.
- Three runtime must preserve Phase 21 shader/postprocess behavior, Phase 22 LOD/scatter behavior, and Phase 23 spherical placement/camera behavior.
- Three runtime should expose diagnostics through renderer-neutral or smoke-only hooks, not by leaking Three objects to editor/state layers.

Events/actions:

- Delivery state should use explicit schemas and registries. Avoid relying on generic `function.call` for core gameplay.
- Existing `EventSystem`, `TriggerSystem`, `ActionSystem`, and `ConditionSystem` may be extended only with typed actions/conditions/triggers and tests.
- Event/action changes must preserve existing gate, switch, material, sound, subtitle, timeline, and camera behavior.

Testing and smoke:

- Unit tests should cover job schema, validation, state transitions, interaction radius, movement/controller logic, editor job model/commands, route feedback semantics, and event/action integration.
- Smoke tests should cover a successful job flow in Showcase Mode and a regression check that Editor Mode can still inspect or edit job data.
- Perf checks should remain deterministic and local, using draw calls, triangle estimates, instance counts, runtime diagnostics, and stable budgets where practical.

## 5. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Confirm Phase 23 final report is PASS and pushed before implementation starts.
3. Inspect current status, dirty files, and implementation files before editing.
4. Define the smallest coherent checkpoint.
5. Implement the checkpoint.
6. Run targeted tests first.
7. Run relevant validation.
8. Run browser smoke when Showcase Mode, movement, interaction, job flow, runtime rendering, Three behavior, UI, diagnostics, perf counters, or pixels changed.
9. Run Debug self-check.
10. Run architecture self-check.
11. Inspect status and diff.
12. Stage only Phase 24-relevant files.
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
- If Showcase/job smoke fails, localize whether the failure is schema, data validation, job runtime state, interaction radius, movement/controller seam, event/action dispatch, route feedback, target feedback, Three visual bridge, React shell, browser timing, or smoke harness before editing further.
- If generated artifacts appear, keep them out of commits unless explicitly named as source fixtures.
- If Phase 25 multiplayer, external adapter work, Physics/Rapier, external InputFlow, production Runtime UI, Audio runtime, or broad gameplay framework work appears in the current diff, stop and remove it from Phase 24 commit scope unless the user explicitly changes the phase.

Reusable self-checks for every round:

Debug self-check:

- Can the current change be explained by the smallest relevant fixture or user workflow?
- Can failures be localized to a specific layer such as schema, data validation, job state, interaction solver, movement/controller seam, event/action registry, route feedback, target feedback, Three bridge, React shell, smoke harness, tooling, CLI, or UI?
- Are success, failure, empty, stale, missing target, missing endpoint, invalid job state, incompatible region, out-of-range interaction, low-end profile, fallback, disposal, and generated-output states covered where relevant?
- If UI changed, was a repeatable smoke or component verification added?
- If state changed, are export/import, validate, migration, report-assets, boundary check, runtime reset, and play/edit mode boundaries covered?

Architecture self-check:

- Does `data/**/*.json` remain the source of truth for job, endpoint, interaction, world, region, camera, entity, LOD, scatter, and asset semantics?
- Did host/editor/UI code avoid duplicating job state, movement, interaction, event/action, projection, camera, validation, runtime, or renderer semantics?
- Are public capability/schema contracts, binding/mapping, diagnostics/audit, and runtime state still separated?
- Did the phase avoid Phase 25 multiplayer, Physics/Rapier, external InputFlow, ViewRig, LudoWeave, Inscape, production Runtime UI framework, Audio runtime, external adapters, and unrelated engine-module scope?
- Are unrelated files, generated outputs, and user changes left alone?
- Does Three.js remain inside `src/runtime/three/**` and accepted thin editor glue?
- Are Three-specific objects, renderer counters, camera internals, route marker meshes, target feedback meshes, and derived runtime transforms kept out of data, events, director semantics, schemas outside renderer-neutral contracts, and authoring docs?

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

Commit and push with explicit Phase 24 paths:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "feat: add delivery job schema" -Paths src\schemas,src\game,src\world,src\events,src\engine,src\runtime,src\editor,data,tests,scripts,docs\phase-24-delivery-gameplay-showcase-goal-mode-execution-guide.md,docs\phase-24-delivery-gameplay-showcase-final-report.md,docs\developer-guide.md,docs\development-plan.md,docs\abeto-messenger-development-plan.md,docs\post-mvp-execution-workflow.md
```

Adjust `-Paths` per round so only touched, phase-relevant files are staged. Do not use broad staging commands such as `git add .`.

## 7. Round Budget

Total: 16 rounds.

- Main implementation: rounds 24.1 through 24.12.
- Buffer fixes: rounds 24.13 through 24.15.
- Final validation and handoff: round 24.16.

The roadmap's 6-round estimate is the high-level planning estimate. This goal-mode guide splits Phase 24 into smaller commit-and-push checkpoints because the phase touches playable mode routing, player movement/controller behavior, delivery job schemas, runtime job state, events/actions, editor affordances, route/target feedback, UI shell, smoke/perf, docs, and final handoff.

## 8. Round Plan

### Round 24.1: Baseline Audit And Showcase Design Lock

Goal:

- Confirm the Phase 23 baseline and lock the Phase 24 single-player delivery showcase design.

Work:

- Confirm `docs/phase-23-compact-spherical-world-prototype-final-report.md` is PASS and pushed.
- Inspect engine modes, Viewport, EngineSession, World movement, events/actions, editor panels, current smoke tests, and compact spherical-world data.
- Decide the minimal Showcase Mode shell and how it hides editor panels.
- Decide delivery job data shape, job runtime state, route/target feedback model, and editor affordance plan.
- Decide how first-party controls will drive Phase 23 movement without external InputFlow.
- Create or update `docs/phase-24-delivery-gameplay-showcase.md` with design lock notes if needed.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
rg "Phase 24|Delivery Gameplay Showcase|Showcase Mode|delivery job|Phase 25|InputFlow" docs\abeto-messenger-development-plan.md docs\phase-23-compact-spherical-world-prototype-final-report.md docs\phase-24-delivery-gameplay-showcase-goal-mode-execution-guide.md
git diff --check
```

Expected commit:

```txt
docs: lock phase 24 delivery showcase plan
```

### Round 24.2: Delivery Job Schema And Data Contract

Goal:

- Add source-of-truth delivery job data and validation.

Work:

- Add job schema for ids, title, description, accept/source endpoint, target endpoint, status defaults, route hints, completion rules, and feedback text.
- Add endpoint/interactable references without Three or DOM ids.
- Add validation for duplicate jobs, missing endpoints, invalid region/entity references, invalid status defaults, impossible routes, and stale assets.
- Add data for one to two delivery jobs in the compact spherical world.
- Keep existing levels valid or provide backwards-compatible defaults.

Validation:

```powershell
npm run test -- schema delivery job validate-data
npm run validate-data
git diff --check
```

Expected commit:

```txt
feat: add delivery job schema
```

### Round 24.3: Delivery Runtime State Machine

Goal:

- Add deterministic delivery job runtime state independent of React and Three.

Work:

- Add first-party job runtime state and transitions for available, accepted, inProgress, readyToDeliver, completed, and blocked/failed where needed.
- Add pure functions or a semantic runtime service for accepting, progressing, delivering, resetting, and querying jobs.
- Add tests for valid transitions, invalid transitions, missing job, stale target, completed job, reset, and deterministic state snapshots.
- Do not mutate source job JSON during play.

Validation:

```powershell
npm run test -- delivery job state runtime
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add delivery job runtime state
```

### Round 24.4: Interaction Radius And Endpoint Solver

Goal:

- Add deterministic interaction detection for delivery endpoints and interactables.

Work:

- Add renderer-neutral interaction radius logic using world/spherical runtime positions.
- Support NPC/mailbox endpoints and existing interactable entities.
- Add tests for nearest endpoint, out-of-range endpoint, multiple candidates, stale entity, missing placement, flat fallback, and low-end/no-render contexts.
- Keep interaction solving out of React and Three.

Validation:

```powershell
npm run test -- interaction radius delivery endpoint
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add delivery interaction solver
```

### Round 24.5: First-Party Showcase Controller

Goal:

- Add minimal playable controls for Showcase Mode without external InputFlow.

Work:

- Add a small first-party controller seam that maps keyboard/pointer input or smoke commands to Phase 23 surface movement and interaction commands.
- Keep production input remapping and external InputFlow out of scope.
- Add tests for movement command translation, interaction command dispatch, disabled/edit mode behavior, focus loss, reset, and deterministic stepping.
- Ensure React shell only forwards input/commands and does not own movement state.

Validation:

```powershell
npm run test -- showcase controller movement interaction
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add showcase player controller
```

### Round 24.6: Showcase Mode Shell

Goal:

- Add user-facing Showcase Mode without editor panels.

Work:

- Add mode routing or shell state so Showcase Mode hides editor panels and shows only the playable viewport plus minimal HUD/status affordances.
- Preserve Editor Mode and existing editor workflows.
- Add component or smoke tests for switching into Showcase Mode, no editor panels, viewport focus, and returning/remaining compatible with Editor Mode.
- Keep full Runtime UI framework and LudoWeave out of scope.

Validation:

```powershell
npm run test -- showcase mode editor shell
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add showcase mode shell
```

### Round 24.7: Delivery Events Actions And Conditions

Goal:

- Connect delivery gameplay to typed events/actions/conditions.

Work:

- Add typed actions/conditions/triggers only as needed for job acceptance, progress, delivery, and completion feedback.
- Keep core gameplay out of `function.call` and arbitrary scripts.
- Add registry tests and event-system tests for accept, deliver, complete, invalid state, missing target, and event ordering.
- Preserve existing door/switch/timeline/camera/material/sound/subtitle behavior.

Validation:

```powershell
npm run test -- delivery action condition trigger event
npm run validate-data
git diff --check
```

Expected commit:

```txt
feat: add delivery event actions
```

### Round 24.8: Route Marker And Target Feedback Runtime

Goal:

- Add route and target feedback so the delivery job is readable in the compact spherical world.

Work:

- Add renderer-neutral route/target feedback state.
- Add Three runtime visuals for route markers, target indicators, or endpoint highlights under `src/runtime/three/**`.
- Add tests for marker visibility, active/completed state, missing target fallback, disposal, low-end behavior, and no forbidden imports.
- Use existing LOD/scatter/spherical placement infrastructure without duplicating semantics.

Validation:

```powershell
npm run test -- route target feedback ThreeRuntime
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
feat: add delivery route feedback
```

### Round 24.9: Completion Feedback And HUD Status

Goal:

- Make job state legible to the player without introducing a production Runtime UI framework.

Work:

- Add minimal HUD/status state for accepted job, target, completion, blocked state, and prompts.
- Add completion feedback text/visuals and route/target state changes.
- Keep HUD slow state in React or a renderer-neutral ViewModel; keep job rules in gameplay/runtime.
- Add tests for prompt visibility, status updates, completion feedback, empty jobs, and stale state.

Validation:

```powershell
npm run test -- delivery hud completion feedback
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add delivery completion feedback
```

### Round 24.10: Editor Delivery Job Affordances

Goal:

- Let Editor Mode inspect or edit delivery job data without becoming the gameplay runtime.

Work:

- Add editor panel/model/commands for viewing and small safe edits to job data if needed.
- Keep edits command-backed.
- Add tests for inspect, edit, validation error display, undo/redo where command-backed edits exist, and no Showcase state leakage into Editor Mode.
- Preserve existing panels and editor workflows.

Validation:

```powershell
npm run test -- delivery editor panel command
npm run validate-data
git diff --check
```

Expected commit:

```txt
feat: add delivery job editor affordances
```

### Round 24.11: Complete Job Data And Integrated Gameplay Gate

Goal:

- Integrate one to two complete jobs with data, runtime, feedback, editor, and route/target behavior.

Work:

- Add final job data, endpoints, route hints, feedback, and event/action links.
- Run integrated unit tests for a complete accept -> move -> deliver -> complete flow.
- Verify job state resets on reload and completed jobs remain deterministic.
- Update docs if actual file locations or commands differ from earlier rounds.

Validation:

```powershell
npm run test -- delivery showcase job flow
npm run validate-data
npm run report-assets
git diff --check
```

Expected commit:

```txt
test: integrate delivery job flow
```

### Round 24.12: Showcase Smoke And Perf Gate

Goal:

- Add browser smoke and local perf evidence for a successful delivery showcase flow.

Work:

- Add Playwright smoke that opens Showcase Mode, moves, accepts a job, reaches target, delivers, completes the job, and verifies feedback.
- Add smoke coverage that Editor Mode can still inspect/edit job data.
- Add deterministic local budgets for draw calls, triangle estimates, instance counts, job diagnostics, and low-end profile where practical.
- Keep generated smoke artifacts out of commits.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run test -- delivery showcase smoke perf low-end
git diff --check
```

Expected commit:

```txt
test: add delivery showcase smoke gate
```

### Round 24.13: Buffer Fix Round 1

Goal:

- Fix Phase 24 defects found by validation, smoke, or architecture review.

Work:

- Triage failures by layer before editing.
- Keep fixes inside Phase 24 scope.
- Focus on job schema, state transitions, interaction radius, controller, Showcase shell, route/target feedback, editor affordances, smoke stability, and docs.
- Do not add Phase 25 multiplayer, Physics/Rapier, external InputFlow, Runtime UI framework, Audio runtime, external adapters, or broad gameplay systems.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: stabilize delivery showcase
```

### Round 24.14: Buffer Fix Round 2

Goal:

- Reserve a second buffer for remaining Phase 24 issues only.

Work:

- Use only if integrated checks still find Phase 24 blockers.
- Focus on browser timing, focus/input quirks, state reset, editor/showcase separation, low-end budgets, data validation, or smoke timing.
- Skip this round if no defects remain and record it as unused in the final report.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: close delivery validation gaps
```

### Round 24.15: Buffer Fix Round 3

Goal:

- Reserve the final buffer for integrated Phase 24 blockers.

Work:

- Use only if final integrated validation still finds Phase 24 issues.
- Keep fixes small and tied to reproducible validation failures.
- Do not use this round to start Phase 25 social layer or external integration.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: finalize delivery showcase stability
```

### Round 24.16: Final Validation And Handoff

Goal:

- Close Phase 24 with full validation, smoke, final docs, and Phase 25/Phase 26 routing guidance.

Work:

- Run full validation and smoke.
- Confirm all Phase 24 commits are pushed.
- Create `docs/phase-24-delivery-gameplay-showcase-final-report.md`.
- Update roadmap entry points so Phase 25 Multiplayer-lite Social Layer is the recommended next full-route goal and Phase 26 Vertical Slice RC Hardening remains the next core-route goal if multiplayer is skipped.
- The final report must include status, completed work, Showcase Mode evidence, player controller evidence, delivery job data/state, route/target feedback, editor affordances, smoke/perf evidence, validation, commits, pushed status, known limitations, and next-goal guidance.
- Confirm Phase 24 did not implement Phase 25 multiplayer, Physics/Rapier, external InputFlow, ViewRig, LudoWeave, Inscape, production Runtime UI framework, Audio runtime, external adapters, or broad gameplay framework scope.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
rg "Phase 24|Delivery Gameplay Showcase|Showcase Mode|delivery job|route|target|Phase 25|Phase 26" docs src data tests scripts
git diff --check
```

Expected commit:

```txt
docs: finalize phase 24 delivery showcase
```

## 9. PASS Criteria

Phase 24 is PASS only when all of these are true:

- Phase 23 final report is PASS and the executor confirmed it was pushed before Phase 24 implementation started.
- Showcase Mode runs without editor panels.
- A minimal first-party player controller works in the compact spherical world.
- Interaction radius logic can find nearby delivery endpoints/interactables deterministically.
- Delivery job schema and validation exist.
- One to two complete delivery jobs exist in data.
- At least one NPC or mailbox endpoint exists.
- Delivery job runtime state supports accepting, progressing, delivering, and completing a job.
- Route marker and delivery target feedback are visible or diagnostically observable.
- Completion feedback is visible or diagnostically observable.
- Editor Mode can inspect or edit job data where scoped, and those edits are command-backed when mutating source data.
- Browser smoke covers a successful job flow.
- Browser smoke or component tests prove Editor Mode still works with job data.
- Low-end/perf evidence is recorded with practical local budgets.
- No Three.js imports are introduced outside `src/runtime/three/**` and accepted thin editor glue.
- No Phase 25 multiplayer, WebSocket rooms, remote avatars, Physics/Rapier, external InputFlow, ViewRig, LudoWeave, Inscape, production Runtime UI framework, Audio runtime, external adapters, or broad gameplay framework is implemented.
- `Validate.cmd` passes.
- `Smoke.cmd` passes.
- `git diff --check` passes.
- Phase 24 final report exists.
- All Phase 24 commits are pushed to `origin/main` or the active remote branch requested by the user.
- Roadmap entry points identify Phase 25 as the next full-route phase and Phase 26 as the next core-route hardening phase if multiplayer is skipped.

## 10. Validation Matrix

| Area | Required validation |
| --- | --- |
| Delivery job schema | Unit/schema tests for ids, endpoints, statuses, completion rules, route hints, stale references, duplicate ids |
| Data validation | `npm run validate-data` passes committed jobs and fails invalid job/endpoint data |
| Job state runtime | Unit tests for accept/progress/deliver/complete/reset/invalid transitions/missing jobs |
| Interaction radius | Unit/runtime tests for nearest endpoint, out-of-range endpoint, multiple candidates, stale references |
| Player controller | Tests for command translation, disabled/edit mode behavior, focus/reset, deterministic movement |
| Showcase shell | Component/smoke tests for no editor panels, viewport focus, HUD/status, Editor Mode compatibility |
| Events/actions | Registry and event-system tests for typed delivery actions/conditions/triggers; existing actions remain valid |
| Route/target feedback | Tests for marker state, target state, fallback, disposal, low-end behavior, no forbidden imports |
| Completion/HUD feedback | Tests for prompts, status updates, completion feedback, empty and stale states |
| Editor affordances | Tests for inspect/edit, command-backed mutation, validation errors, undo/redo where scoped |
| Job flow | Integrated tests for accept -> move -> deliver -> complete |
| Smoke/perf | Playwright smoke for successful Showcase flow and editor job data check; deterministic local budgets |
| Boundary checks | `check-boundaries` proves Three.js stays inside runtime adapter boundaries |
| Full gate | `Validate.cmd`, `Smoke.cmd`, `git diff --check`, roadmap link checks |

## 11. Final Report Template

Create `docs/phase-24-delivery-gameplay-showcase-final-report.md` using this structure:

```markdown
# Phase 24 Delivery Gameplay Showcase Final Report

Date: <date>

## Status

PASS or BLOCKED.

## Completed

- ...

## Showcase Mode

- Shell:
- Editor-panel separation:
- Player controller:
- Interaction radius:
- HUD/status:
- Known limitations:

## Delivery Jobs

- Schema:
- Data:
- Endpoints:
- Runtime state:
- Completion rules:
- Event/action integration:

## Feedback

- Route markers:
- Target feedback:
- Completion feedback:
- Low-end behavior:

## Editor Affordances

- Job inspection:
- Job editing:
- Command-backed changes:
- Validation feedback:

## Perf And Smoke Evidence

- Successful job flow:
- Editor regression:
- Draw calls:
- Triangle estimates:
- Instance counts:
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

Full route: complete Phase 25 from docs/abeto-messenger-development-plan.md: Multiplayer-lite Social Layer. Start only after Phase 24 is PASS and pushed.

Core single-player route: if multiplayer-lite is intentionally skipped, complete Phase 26 from docs/abeto-messenger-development-plan.md: Vertical Slice RC Hardening. Record the Phase 25 skip decision before creating the Phase 26 guide.
```

## 12. Phase 25 And Phase 26 Handoff Notes

After Phase 24 passes, the project has a playable single-player vertical slice.

Full route:

- Phase 25 may add multiplayer-lite social layer after single-player Showcase is stable.
- Phase 25 should start with local remote-player simulation before WebSocket room work.
- Avatar, emote, stamp, and network message schemas must remain data-first and validated.

Core route:

- If multiplayer-lite is skipped, Phase 26 may start vertical-slice RC hardening.
- Record the skip explicitly in the Phase 26 guide/final report so future agents do not treat Phase 25 as accidentally forgotten.

For both routes:

- Keep Phase 24 delivery jobs and Showcase Mode stable.
- Do not let multiplayer, network state, Runtime UI, Audio, or external adapter experiments regress the single-player delivery flow.
