# Phase 25 Multiplayer-lite Social Layer Goal Mode Execution Guide

Date: 2026-06-22
Status: Guide for an executor running Phase 25 in goal mode.

Phase 25 starts after Phase 24 Delivery Gameplay Showcase is PASS and pushed. The accepted baseline is `c21cd57 docs: align phase 24 final report commit evidence` on `main` / `origin/main`.

The goal of this phase is to add a small shared-space prototype without weakening the single-player Delivery Showcase. Phase 25 adds a local remote-player simulator first, data-first avatar / emote / stamp / network message contracts, renderer-neutral social runtime state, remote avatar and 3D stamp feedback, and a small local WebSocket room prototype. The WebSocket work is a replaceable prototype, not a production multiplayer service.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 25 for Sinan: Multiplayer-lite Social Layer. Start only after Phase 24 is PASS and pushed; the accepted baseline is c21cd57 docs: align phase 24 final report commit evidence. Read AGENTS.md, docs/development-plan.md, docs/abeto-messenger-development-plan.md, docs/post-mvp-execution-workflow.md, docs/abeto-messenger-gap-closure-plan.md, docs/phase-24-delivery-gameplay-showcase-final-report.md, docs/phase-24-delivery-gameplay-showcase-goal-mode-execution-guide.md, docs/phase-23-compact-spherical-world-prototype-final-report.md, docs/phase-22-lod-instancing-and-vegetation-final-report.md, docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md, docs/strategy/adapter-boundary-policy.md, docs/rfcs/rfc-002-sinan-input-context.md, docs/rfcs/rfc-003-sinan-runtime-ui-viewmodel.md, docs/rfcs/rfc-004-sinan-camera-pose-shot-rig-boundary.md, docs/rfcs/rfc-006-sinan-physics-adapter-boundary.md, docs/rfcs/rfc-007-sinan-audio-system-boundary.md, docs/developer-guide.md, docs/Sinan_Scene_Director_研发方案与架构指南.md, .codex/project-ops-workflow.json, and .codex/project-git-workflow.json before editing. Implement Phase 25 only: add local remote-player simulation first, avatar/emote/stamp/network message schemas and data, renderer-neutral social state, remote avatar and 3D stamp feedback, invalid-message handling, room limits/rate limits, and a small local WebSocket room prototype. Preserve Phase 24 Showcase and delivery smoke. Keep data/**/*.json as the source of truth. Keep Three.js avatar/stamp visuals under src/runtime/three/**. Keep WebSocket/browser/server transport details behind a replaceable adapter or dev-smoke boundary. Do not add production matchmaking, auth, persistence, remote deployment, text chat, voice chat, MMO-scale networking, authoritative server gameplay, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape adapters, production Runtime UI framework, Audio runtime, or broad gameplay framework work. Every round must run Debug self-check, architecture self-check, validation, commit, and push before proceeding.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `docs/development-plan.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/abeto-messenger-gap-closure-plan.md`
- `docs/phase-24-delivery-gameplay-showcase-final-report.md`
- `docs/phase-24-delivery-gameplay-showcase-goal-mode-execution-guide.md`
- `docs/phase-23-compact-spherical-world-prototype-final-report.md`
- `docs/phase-22-lod-instancing-and-vegetation-final-report.md`
- `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md`
- `docs/strategy/adapter-boundary-policy.md`
- `docs/rfcs/rfc-002-sinan-input-context.md`
- `docs/rfcs/rfc-003-sinan-runtime-ui-viewmodel.md`
- `docs/rfcs/rfc-004-sinan-camera-pose-shot-rig-boundary.md`
- `docs/rfcs/rfc-006-sinan-physics-adapter-boundary.md`
- `docs/rfcs/rfc-007-sinan-audio-system-boundary.md`
- `docs/developer-guide.md`
- `docs/Sinan_Scene_Director_研发方案与架构指南.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Inspect these implementation areas before changing them:

- `data/**/*.json`
- `src/schemas/**`
- `src/data/ReferenceResolver.ts`
- `src/game/delivery/**`
- `src/game/interaction/**`
- `src/game/showcase/**`
- `src/world/**`
- `src/engine/EngineMode.ts`
- `src/engine/EngineSession.ts`
- `src/events/**`
- `src/runtime/RuntimeTypes.ts`
- `src/runtime/WebRuntime.ts`
- `src/runtime/three/**`
- `src/editor/EditorApp.tsx`
- `src/editor/Viewport.tsx`
- `tests/smoke/editor.spec.ts`
- `scripts/validate-data.ts`
- `scripts/report-assets.ts`
- `scripts/check-boundaries.ts`

Current known context:

- Phase 24 is PASS and provides Showcase Mode, first-party movement, interaction radius, delivery job runtime state, route/target feedback, completion HUD, editor job affordances, and browser smoke for a successful delivery flow.
- Phase 25 must preserve that single-player showcase as the baseline. Social features are additive and must not regress delivery job flow, editor job inspection, or low-end route feedback.
- The project currently has no production network layer. Phase 25 must establish Sinan-owned schemas, message validation, deterministic local simulation, and diagnostics before adding any WebSocket transport.
- If a WebSocket server helper needs a package, keep it dev/prototype scoped, isolate it behind adapter or smoke tooling boundaries, document the dependency impact, and keep semantic layers free of backend imports.

## 2. What This Phase Must Complete

Phase 25 must complete:

- A documented Phase 25 design lock for multiplayer-lite social scope.
- Data-first avatar, emote, stamp, and network message schemas.
- Source data for a small set of avatar/emote/stamp definitions.
- Reference validation for avatar/emote/stamp ids and network message fixtures.
- A renderer-neutral social runtime state model for remote players, poses, emotes, stamps, stale state, disconnects, room limits, and message rate limits.
- A deterministic local remote-player simulator that can drive ten remote avatars without network transport.
- Remote avatar rendering in the compact spherical world.
- 3D emote/stamp feedback that is visible or diagnostically observable.
- Message validation that rejects invalid join, pose, emote, stamp, snapshot, and disconnect messages without corrupting runtime state.
- A small local WebSocket room prototype for join, pose, emote/stamp, snapshot, and disconnect messages.
- Browser smoke or equivalent local smoke that covers the local simulator and the WebSocket prototype.
- Perf/budget evidence for ten simulated remote avatars and stamp feedback.
- A Phase 25 final report and roadmap routing to Phase 26.

## 3. What This Phase Must Not Do

Do not:

- Build production matchmaking, account login, persistence, deployment, moderation, NAT traversal, reconnect recovery, encryption, or authoritative game-server behavior.
- Add text chat, voice chat, friend lists, parties, trading, economy, inventory, quest expansion, or MMO-scale room semantics.
- Replace the local delivery showcase with a network-first path.
- Let invalid network messages mutate source data or crash runtime state.
- Add Physics/Rapier, rigid bodies, collision solver, or physics-backed character control.
- Add external InputFlow, ViewRig, LudoWeave, Inscape, production Runtime UI framework, Audio runtime, or unrelated external adapters.
- Use WebSocket APIs from `src/game`, `src/events`, `src/world`, `src/schemas`, `src/data`, or `src/runtime/three`.
- Store transport handles, socket ids, backend objects, DOM ids, or Three objects in `data/**/*.json`.
- Commit generated Playwright output, local screenshots, server logs, perf scratch files, or temporary reports unless explicitly named as stable source fixtures.
- Stage unrelated untracked strategy, architecture, external-project, or user files.

## 4. Architecture Boundaries

Data and schema:

- `data/**/*.json` remains the source of truth for avatar, emote, stamp, level, delivery, event, timeline, camera, LOD, scatter, and asset semantics.
- Avatar/emote/stamp ids must be stable public ids, not transport ids or renderer ids.
- Network messages must be Zod-backed and validated before they affect runtime state.
- Message schemas should model join, pose, emote, stamp, snapshot, disconnect, invalid/unknown type, room limit, stale snapshot, and rate-limit states.

Gameplay/runtime:

- Social semantics should live under a first-party renderer-neutral layer such as `src/game/social/**`, `src/network/**`, or an equivalent local pattern chosen after inspecting the repo.
- Local remote-player simulation comes before WebSocket transport.
- Social runtime state is derived from source data and messages; it must not overwrite source data during play.
- Existing delivery job runtime must remain deterministic and independent of network state.

Network/adapter:

- Transport details belong behind a replaceable adapter or dev-smoke boundary, for example `src/network/adapters/websocket/**` or `scripts/**` when the server is test-only.
- Semantic layers may depend on Sinan-owned message contracts and adapter interfaces, not concrete WebSocket backend implementation.
- If a server helper package is added, document why it is dev/prototype scoped, update the lockfile, and keep it out of the production browser bundle where practical.
- Missing WebSocket support, unsupported browser features, server failure, invalid payloads, rate limits, and disconnects must produce diagnostics or safe fallback state.

UI/editor:

- React may own slow social HUD/status text, diagnostics, and editor inspection affordances.
- React must not own per-frame movement, remote pose simulation, message validation, room state, or renderer accounting.
- Editor Mode must still inspect/edit delivery job data and existing data domains.

Three runtime:

- `src/runtime/three/**` owns remote avatar placeholder meshes, stamp/emote visuals, helper materials, renderer diagnostics, object transforms, and disposal.
- Three-specific objects, materials, renderer counters, and derived transforms must not leak into source data, schemas, events, director semantics, or social message contracts.
- Remote avatar/stamp visuals must have low-end behavior and disposal tests.

Testing and smoke:

- Unit tests should cover schemas, data validation, message validation, social state, simulator, rate limiting, stale/disconnect handling, adapter fallback, renderer-neutral diagnostics, Three visuals, and editor/showcase regression.
- Smoke should cover ten simulated remotes, at least one emote/stamp visual, invalid-message rejection, and preserved Phase 24 delivery flow.

## 5. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Confirm Phase 24 final report is PASS and pushed before implementation starts.
3. Inspect current status, dirty files, and implementation files before editing.
4. Define the smallest coherent checkpoint.
5. Implement the checkpoint.
6. Run targeted tests first.
7. Run relevant validation.
8. Run browser smoke when Showcase Mode, social visuals, WebSocket behavior, runtime rendering, UI, diagnostics, perf counters, or pixels changed.
9. Run Debug self-check.
10. Run architecture self-check.
11. Inspect status and diff.
12. Stage only Phase 25-relevant files.
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
- If validation passes but commit fails, do not proceed.
- If commit succeeds but push fails, do not proceed.
- If generated artifacts appear, keep them out of commits unless explicitly named as source fixtures.
- If Phase 26 hardening, production networking, auth/persistence, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape, production Runtime UI, Audio runtime, or unrelated external adapter work appears in the diff, stop and remove it from Phase 25 commit scope unless the user explicitly changes the phase.

Reusable self-checks for every round:

Debug self-check:

- Can the current change be explained by the smallest relevant fixture or user workflow?
- Can failures be localized to schema, data validation, social state, simulator, message validation, transport adapter, Three bridge, React shell, smoke harness, tooling, CLI, or UI?
- Are success, failure, empty, stale, invalid, rate-limited, room-full, disconnected, low-end, fallback, disposal, and generated-output states covered where relevant?
- If UI changed, was a repeatable smoke or component verification added?
- If state changed, are export/import, validate, migration, report-assets, boundary check, runtime reset, and play/edit/showcase boundaries covered?

Architecture self-check:

- Does `data/**/*.json` remain the source of truth for avatar, emote, stamp, social, delivery, world, region, camera, entity, LOD, scatter, and asset semantics?
- Did host/editor/UI code avoid duplicating social state, message validation, delivery state, movement, interaction, event/action, projection, camera, validation, runtime, or renderer semantics?
- Are schemas, adapter interfaces, diagnostics/audit, and runtime state still separated?
- Did the phase avoid production networking, auth, persistence, text/voice chat, Phase 26 hardening, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape, production Runtime UI framework, Audio runtime, and unrelated engine-module scope?
- Are unrelated files, generated outputs, and user changes left alone?
- Does Three.js remain inside `src/runtime/three/**` and accepted thin editor glue?
- Are WebSocket/browser/server details kept out of data, schemas, events, game semantics, and Three runtime visuals?

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

Commit and push with explicit Phase 25 paths:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "feat: add social message schema" -Paths src\schemas,src\data,src\game,src\network,src\runtime,src\editor,data,tests,scripts,docs\phase-25-multiplayer-lite-social-layer-goal-mode-execution-guide.md,docs\phase-25-multiplayer-lite-social-layer-final-report.md,docs\phase-25-multiplayer-lite-social-layer.md,docs\developer-guide.md,docs\development-plan.md,docs\abeto-messenger-development-plan.md,docs\post-mvp-execution-workflow.md,package.json,package-lock.json
```

Adjust `-Paths` per round so only touched, phase-relevant files are staged. Do not use broad staging commands such as `git add .`.

## 7. Round Budget

Total: 16 rounds.

- Main implementation: rounds 25.1 through 25.12.
- Buffer fixes: rounds 25.13 through 25.15.
- Final validation and handoff: round 25.16.

The roadmap's 5-6 round estimate is the high-level planning estimate. This guide splits Phase 25 into smaller commit-and-push checkpoints because the phase touches schemas, local simulation, social runtime state, Three visuals, network message contracts, optional adapter/package boundaries, smoke/perf, docs, and final handoff.

## 8. Round Plan

### Round 25.1: Baseline Audit And Social Design Lock

Goal:

- Confirm the Phase 24 baseline and lock the Phase 25 multiplayer-lite design.

Work:

- Confirm `docs/phase-24-delivery-gameplay-showcase-final-report.md` is PASS and pushed.
- Inspect social/network gaps, Showcase Mode, delivery smoke, runtime diagnostics, Three route feedback, and editor panels.
- Decide the minimal data shape for avatar/emote/stamp definitions and network messages.
- Decide local simulator first, WebSocket adapter second.
- Create `docs/phase-25-multiplayer-lite-social-layer.md` with design lock notes if needed.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
rg "Phase 25|Multiplayer-lite|remote-player|avatar|emote|stamp|WebSocket|Phase 26" docs\abeto-messenger-development-plan.md docs\phase-24-delivery-gameplay-showcase-final-report.md docs\phase-25-multiplayer-lite-social-layer-goal-mode-execution-guide.md
git diff --check
```

Expected commit:

```txt
docs: lock phase 25 social layer plan
```

### Round 25.2: Avatar Emote Stamp Schema And Data Contract

Goal:

- Add source-of-truth social data contracts.

Work:

- Add avatar, emote, stamp, and social preset schemas.
- Add data fixtures for a small avatar/emote/stamp set.
- Add reference validation for duplicate ids, stale asset references, invalid colors/labels, invalid lifetimes, and invalid low-end flags.
- Keep data renderer-neutral and transport-neutral.

Validation:

```powershell
npm run test -- avatar emote stamp schema validate-data
npm run validate-data
git diff --check
```

Expected commit:

```txt
feat: add social avatar schema
```

### Round 25.3: Network Message Schema And Validation

Goal:

- Add validated room/message contracts before transport.

Work:

- Add join, pose, emote, stamp, snapshot, disconnect, error, and server-time message schemas.
- Add room size, rate limit, stale snapshot, invalid payload, and unknown message diagnostics contracts.
- Add tests proving invalid messages cannot mutate runtime state.
- Do not add WebSocket transport yet.

Validation:

```powershell
npm run test -- social network message schema
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add social message schema
```

### Round 25.4: Social Runtime State

Goal:

- Add deterministic renderer-neutral social runtime state.

Work:

- Add remote player state, pose snapshots, emote/stamp event queues, stale/disconnect state, room limit handling, and rate-limit tracking.
- Add pure tests for join, pose update, emote/stamp apply, disconnect, stale timeout, duplicate player, invalid transition, and reset.
- Keep delivery job runtime independent from social state.

Validation:

```powershell
npm run test -- social runtime state
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add social runtime state
```

### Round 25.5: Local Remote-player Simulator

Goal:

- Drive ten remote avatars without network transport.

Work:

- Add deterministic local simulator inputs for up to ten remote players.
- Map simulator poses to the Phase 23 spherical world placement/movement model.
- Add emote/stamp schedules and stale/disconnect fixtures.
- Add tests for deterministic replay, ten-player budget input, low-end profile, and invalid simulator fixtures.

Validation:

```powershell
npm run test -- social simulator remote players
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add remote player simulator
```

### Round 25.6: EngineSession And Runtime Bridge

Goal:

- Expose social state to runtime without putting semantics in React or Three.

Work:

- Add a renderer-neutral runtime social state contract.
- Wire simulator/social state through `EngineSession` and `WebRuntime`.
- Add diagnostics for remote count, active stamps, stale remotes, room status, and invalid-message count.
- Preserve Showcase and delivery job behavior.

Validation:

```powershell
npm run test -- EngineSession social runtime
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
feat: bridge social runtime state
```

### Round 25.7: Remote Avatar Three Runtime

Goal:

- Render remote avatars in the compact spherical world.

Work:

- Add Three remote avatar placeholder visuals under `src/runtime/three/**`.
- Support stable ids, pose updates, low-end profile, diagnostics, and disposal.
- Keep avatar visuals renderer-specific and source data renderer-neutral.
- Add tests for pose update, ten remotes, stale/disconnect visibility, low-end behavior, disposal, and no forbidden imports.

Validation:

```powershell
npm run test -- remote avatar ThreeRuntime
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
feat: render remote avatars
```

### Round 25.8: Emote Stamp Visual Feedback

Goal:

- Render 3D social stamp/emote feedback.

Work:

- Add renderer-neutral stamp event state and Three stamp/emote visuals.
- Support lifetime, stacking/fade or replacement behavior, low-end suppression where needed, diagnostics, and disposal.
- Add tests for visible stamp, expired stamp, unknown emote fallback, low-end behavior, and disposal.

Validation:

```powershell
npm run test -- emote stamp feedback ThreeRuntime
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
feat: add social stamp feedback
```

### Round 25.9: Showcase Social HUD And Editor Affordances

Goal:

- Make social state legible without adding a production Runtime UI framework.

Work:

- Add minimal slow-state HUD/status for remote count, room state, active stamp, and invalid-message diagnostics.
- Add editor inspection for social data where useful; mutations must be command-backed if supported.
- Preserve Phase 24 delivery HUD and editor job panel.

Validation:

```powershell
npm run test -- social hud editor affordance
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add social showcase hud
```

### Round 25.10: WebSocket Room Adapter Prototype

Goal:

- Add a small local WebSocket room prototype behind adapter/test boundaries.

Work:

- Add a small room adapter/client contract for join, pose, emote/stamp, snapshot, disconnect, invalid message, room full, and rate-limited messages.
- Add local WebSocket server helper only if needed for smoke; keep it dev/prototype scoped.
- If a dependency is required, add it in this round only, update lockfile, record the package impact, and keep it out of semantic layers.
- Add unit/integration tests for adapter fallback and invalid payload handling.

Validation:

```powershell
npm run test -- websocket room social adapter
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add social websocket room prototype
```

### Round 25.11: Integrated Social Flow Gate

Goal:

- Integrate simulator, runtime, visuals, HUD, and WebSocket adapter without regressing delivery.

Work:

- Add integrated tests for simulator -> runtime -> Three diagnostics -> HUD.
- Add integrated tests for WebSocket join/pose/emote/snapshot/disconnect where the local server helper is available.
- Confirm invalid network messages do not break delivery runtime state or editor state.
- Update docs if actual file locations or commands differ.

Validation:

```powershell
npm run test -- social multiplayer-lite flow delivery showcase
npm run validate-data
npm run report-assets
git diff --check
```

Expected commit:

```txt
test: integrate multiplayer-lite social flow
```

### Round 25.12: Social Smoke And Perf Gate

Goal:

- Add browser smoke and local perf evidence for multiplayer-lite social behavior.

Work:

- Add Playwright smoke for Showcase Mode with ten simulated remotes.
- Verify at least one emote/stamp visual is visible or diagnostically observable.
- Verify invalid-message handling and room/rate diagnostics.
- Verify Phase 24 delivery showcase smoke remains green.
- Add deterministic local budgets for draw calls, triangles, remote count, stamp count, and low-end profile where practical.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run test -- social smoke perf low-end
git diff --check
```

Expected commit:

```txt
test: add multiplayer-lite social smoke gate
```

### Round 25.13: Buffer Fix Round 1

Goal:

- Fix Phase 25 defects found by validation, smoke, or architecture review.

Work:

- Triage failures by layer before editing.
- Keep fixes inside Phase 25 scope.
- Focus on schema, validation, simulator determinism, room limits, rate limits, Three disposal, smoke timing, and delivery regression.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: stabilize multiplayer-lite social layer
```

### Round 25.14: Buffer Fix Round 2

Goal:

- Reserve a second buffer for remaining Phase 25 issues only.

Work:

- Use only if integrated checks still find Phase 25 blockers.
- Focus on browser timing, local server lifecycle, invalid-message handling, low-end budgets, data validation, or smoke timing.
- Skip this round if no defects remain and record it as unused in the final report.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: close social validation gaps
```

### Round 25.15: Buffer Fix Round 3

Goal:

- Reserve the final buffer for integrated Phase 25 blockers.

Work:

- Use only if final integrated validation still finds Phase 25 issues.
- Keep fixes small and tied to reproducible validation failures.
- Do not use this round to start Phase 26 hardening.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: finalize social showcase stability
```

### Round 25.16: Final Validation And Handoff

Goal:

- Close Phase 25 with full validation, smoke, final docs, and Phase 26 routing guidance.

Work:

- Run full validation and smoke.
- Confirm all Phase 25 commits are pushed.
- Create `docs/phase-25-multiplayer-lite-social-layer-final-report.md`.
- Update roadmap entry points so Phase 26 Vertical Slice RC Hardening is the next goal.
- The final report must include status, completed work, schemas/data, simulator, remote avatar visuals, emote/stamp feedback, WebSocket prototype evidence, invalid-message handling, perf/smoke evidence, validation, commits, pushed status, known limitations, and next-goal guidance.
- Confirm Phase 25 did not implement production networking, auth, persistence, text/voice chat, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape, production Runtime UI framework, Audio runtime, or unrelated external adapters.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
rg "Phase 25|Multiplayer-lite|remote|avatar|emote|stamp|WebSocket|Phase 26" docs src data tests scripts
git diff --check
```

Expected commit:

```txt
docs: finalize phase 25 multiplayer-lite social layer
```

## 9. PASS Criteria

Phase 25 is PASS only when all of these are true:

- Phase 24 final report is PASS and the executor confirmed it was pushed before Phase 25 implementation started.
- Avatar, emote, stamp, and network message schemas exist and are validated.
- Source data exists for a small avatar/emote/stamp set.
- Local remote-player simulator supports ten remote avatars deterministically.
- Social runtime state handles join, pose, emote/stamp, snapshot, disconnect, stale, room-full, rate-limited, and invalid-message states.
- Remote avatars are visible or diagnostically observable in Showcase Mode.
- Emoji/stamps render in the 3D world or have deterministic visual diagnostics.
- A small local WebSocket room prototype covers join, pose, emote/stamp, snapshot, and disconnect messages.
- Invalid messages do not corrupt runtime or source data.
- Room size and message rate are limited.
- Phase 24 delivery showcase smoke remains green.
- Low-end/perf evidence is recorded with practical local budgets.
- No Three.js imports are introduced outside `src/runtime/three/**` and accepted thin editor glue.
- WebSocket/browser/server details remain behind adapter or smoke tooling boundaries.
- No production networking, auth, persistence, text chat, voice chat, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape, production Runtime UI framework, Audio runtime, or unrelated external adapter scope is implemented.
- `Validate.cmd` passes.
- `Smoke.cmd` passes.
- `git diff --check` passes.
- Phase 25 final report exists.
- All Phase 25 commits are pushed to `origin/main` or the active remote branch requested by the user.
- Roadmap entry points identify Phase 26 as the next vertical-slice hardening phase.

## 10. Validation Matrix

| Area | Required validation |
| --- | --- |
| Avatar/emote/stamp schema | Unit/schema tests for ids, labels, colors, lifetimes, stale references, duplicate ids |
| Network messages | Schema tests for join, pose, emote, stamp, snapshot, disconnect, unknown/invalid messages |
| Data validation | `npm run validate-data` passes committed social data and fails invalid references |
| Social runtime state | Unit tests for join/pose/emote/stamp/snapshot/disconnect/stale/rate limit/room full/reset |
| Local simulator | Deterministic replay, ten remotes, low-end profile, invalid fixture handling |
| Engine/runtime bridge | EngineSession/WebRuntime tests for social state and diagnostics without Three leakage |
| Remote avatars | Three tests for pose update, ten remotes, stale/disconnect, low-end behavior, disposal |
| Emote/stamp feedback | Tests for visible stamp, expired stamp, unknown fallback, low-end behavior, disposal |
| HUD/editor | Tests for slow-state social HUD and editor inspection without delivery regression |
| WebSocket prototype | Adapter or smoke tests for join/pose/emote/snapshot/disconnect/invalid/rate limited messages |
| Integrated flow | Simulator -> runtime -> Three diagnostics -> HUD; WebSocket path where available |
| Smoke/perf | Playwright smoke for Showcase with remotes/stamps and preserved delivery flow; local budgets |
| Boundary checks | `check-boundaries` proves Three.js and transport details stay inside approved boundaries |
| Full gate | `Validate.cmd`, `Smoke.cmd`, `git diff --check`, roadmap link checks |

## 11. Final Report Template

Create `docs/phase-25-multiplayer-lite-social-layer-final-report.md` using this structure:

```markdown
# Phase 25 Multiplayer-lite Social Layer Final Report

Date: <date>

## Status

PASS or BLOCKED.

## Completed

- ...

## Social Data And Schemas

- Avatar schema:
- Emote schema:
- Stamp schema:
- Network message schema:
- Data validation:

## Local Simulator

- Remote players:
- Determinism:
- Stale/disconnect behavior:
- Low-end behavior:

## Runtime And Feedback

- Social runtime state:
- Remote avatar rendering:
- Emote/stamp feedback:
- HUD/editor affordances:
- Delivery showcase preservation:

## WebSocket Prototype

- Scope:
- Messages:
- Room limits:
- Rate limits:
- Invalid-message handling:
- Fallback/diagnostics:
- Known limitations:

## Perf And Smoke Evidence

- Ten remote avatars:
- Emote/stamp visibility:
- Delivery regression:
- Draw calls:
- Triangle estimates:
- Instance/remote counts:
- Low-end profile:
- Browser/server limitations:

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

Complete Phase 26 from docs/abeto-messenger-development-plan.md: Vertical Slice RC Hardening. Start only after Phase 25 is PASS and pushed. Preserve Showcase Mode, delivery smoke, social simulator/WebSocket smoke, and low-end budgets while preparing release documentation and reproducible validation.
```

## 12. Phase 26 Handoff Notes

After Phase 25 passes, the project has a playable single-player delivery showcase plus a multiplayer-lite social prototype.

Phase 26 should harden the vertical slice:

- Preserve Phase 24 delivery flow and Phase 25 social flow.
- Lock low-end/mobile budgets, smoke coverage, release validation, and demo docs.
- Keep production backend, auth, persistence, text/voice chat, and unrelated external adapters out of RC hardening unless a new scoped guide explicitly approves them.
