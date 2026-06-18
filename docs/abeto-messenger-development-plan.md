# Abeto Messenger-like Development Plan

Date: 2026-06-18
Status: Post Phase 14 product roadmap for a Messenger-like vertical slice.

This plan incorporates `docs/abeto-messenger-gap-closure-plan.md` into the Sinan roadmap. The source gap document currently appears to have text encoding damage in the Chinese sections, so this file is the clean roadmap entry point for executors.

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

| Phase | Name | Goal | Estimated Rounds |
| --- | --- | --- | ---: |
| Phase 14 | Release Candidate Finalization | Clean working tree, verify fresh checkout workflow, and close the current platform release gate | 1-2 |
| Phase 15 | Abeto Scope Lock | Cleanly translate the gap plan into project scope, budgets, acceptance gates, and implementation entry points | 4 |
| Phase 16 | Stylized Runtime Foundation | Add render style schema, palette-toon materials, outline/highlight, fog/color grade, and low-end toggles | 4 |
| Phase 17 | Asset Budget And Compression | Add asset metadata, budget validation, asset reports, and compressed asset loading strategy | 4 |
| Phase 18 | LOD, Instancing, And Vegetation | Add LOD runtime/schema, InstancedMesh scatter, vegetation data, and perf smoke checks | 5 |
| Phase 19 | Compact Spherical World Prototype | Add cube-sphere projection, spherical placement/camera, player surface movement, and three readable regions | 6 |
| Phase 20 | Delivery Gameplay Showcase | Add Showcase Mode, player controller, delivery jobs, route/target feedback, and 1-2 complete jobs | 6 |
| Phase 21 | Multiplayer-lite Social Layer | Add local remote-player simulator, avatar/emote/stamp schema, and a small WebSocket room prototype | 5-6 |
| Phase 22 | Vertical Slice RC Hardening | Lock performance budgets, mobile profile, perf smoke, docs, and final vertical-slice release checklist | 3 |

Core route without multiplayer: Phase 14 through Phase 20 plus Phase 22, about 29-31 rounds.

Full route with multiplayer-lite: Phase 14 through Phase 22, about 34-37 rounds.

## Non-Negotiable Rules

1. `data/**/*.json` remains the source of truth for worlds, chunks, assets, palettes, render styles, delivery jobs, emotes, avatars, events, timelines, and camera shots.
2. Three.js, custom materials, shaders, instancing, GLTF/texture loaders, and render passes stay in `src/runtime/three/**`.
3. Renderer-neutral systems expose typed data and runtime adapter contracts, not Three.js objects.
4. New JSON DSL behavior must have Zod schemas, validators, tests, and clear editor or runtime boundaries.
5. No `eval`, script strings, `new Function`, or dynamic global dispatch.
6. Editor mutations remain command-backed.
7. Performance budgets are first-class acceptance criteria, not after-the-fact polish.

## Performance Budget

Initial vertical-slice targets:

| Metric | Desktop Target | Mobile Target |
| --- | ---: | ---: |
| Initial app and vendor JS gzip | <= 350 KB | <= 350 KB |
| Initial 3D assets | <= 8 MB compressed | <= 5 MB compressed |
| Total demo assets | <= 25 MB compressed | <= 15 MB compressed |
| Visible draw calls | <= 180 | <= 100 |
| Visible triangles | <= 250k | <= 100k |
| Dynamic characters | <= 10 players + 12 NPC | <= 6 players + 8 NPC |
| Texture memory | <= 128 MB | <= 64 MB |
| Frame rate | 60 fps target | 30 fps minimum |
| Pixel ratio | adaptive 1.0-2.0 | capped 1.0-1.5 |

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

Estimated rounds: 4.

Scope:

- Extend asset manifest metadata with category, material profile, triangle budget, texture budget, LOD group, compression status, and instancing hint.
- Add `AssetBudgetValidator` and `report-assets`.
- Add loader strategy for Draco or meshopt, plus KTX2/Basis texture support if practical.
- Document Blender/GLB/optimization workflow.

Acceptance:

- `npm run report-assets` reports model, texture, animation, compression, and budget status.
- Over-budget assets fail validation or produce explicit warnings according to policy.
- Compressed production assets can be loaded or the loader strategy is documented with tests around fallback.

## Phase 18: LOD, Instancing, And Vegetation

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

## Phase 19: Compact Spherical World Prototype

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

## Phase 20: Delivery Gameplay Showcase

Goal: produce a playable single-player Messenger-like vertical slice.

Estimated rounds: 6.

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

## Phase 21: Multiplayer-lite Social Layer

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

## Phase 22: Vertical Slice RC Hardening

Goal: make the Messenger-like slice reproducible, measurable, and demo-ready.

Estimated rounds: 3.

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

After Phase 15 is committed and pushed with a PASS final report, use `docs/phase-16-stylized-runtime-foundation-goal-mode-execution-guide.md` and this implementation goal:

```txt
Complete Phase 16 from docs/abeto-messenger-development-plan.md: Stylized Runtime Foundation.
```

Before starting Phase 16, re-read `AGENTS.md` and `docs/Sinan_Scene_Director_研发方案与架构指南.md` and keep Three.js work inside `src/runtime/three/**`.

The Phase 16 goal-mode guide uses a 16-round budget: 12 implementation rounds, 3 buffer rounds, and 1 final validation/handoff round.
