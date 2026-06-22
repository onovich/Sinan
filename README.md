# Sinan Engine

Sinan Engine is an AI-native, data-first Web 3D game engine and editor built with Vite, React, TypeScript, Three.js, Zod, Vitest, and Playwright.

The project is intentionally not a Unity or Godot clone. Its engine semantics live in JSON, schemas, validators, registries, adapters, and tests so humans and AI agents can edit, validate, migrate, and run game projects through Git-friendly files.

The original Scene Director scope is now treated as a first-party Director System inside the engine: events, conditions, actions, timelines, camera shots, animation cues, and cinematic flow run together with runtime, renderer, assets, input, UI, and editor systems.

## Current Status

The current route is Phase 26.5 RC Release Packaging And Baseline Tagging. The local release-candidate slice includes the Phase 24 Showcase delivery flow, Phase 25 multiplayer-lite social simulator/WebSocket prototype evidence, shader/postprocess low-end baseline, LOD/scatter/spherical world budgets, asset reporting, and reproducible validation gates. Phase 26.5 packages that internal RC with release notes, a demo script, validation evidence, tag policy, and the annotated tag `vertical-slice-rc-2026-06-22`.

The editor opens the `level_01` vertical slice with spherical placement, LOD/scatter diagnostics, a switch/gate timeline, camera shot, subtitle/audio feedback, delivery job affordances, local social remotes/stamps, and save/reload authoring workflows.

## Quick Start

Install dependencies from a clean checkout.

```powershell
npm ci
```

Start the local editor dev server, then open `http://127.0.0.1:5174/`.

```powershell
npm run dev -- --port 5174 --strictPort
```

Regenerate the lightweight development GLB/audio assets if the public assets are missing or intentionally refreshed.

```powershell
npm run generate:dev-assets
```

## Validation

Run the full configured validation through the Codex ops wrapper when available.

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
```

Equivalent direct commands are listed below for ordinary local development.

```powershell
npm run format:check
npm run typecheck
npm run lint
npm run build
npm run test
npm run check-boundaries
npm run validate-data
npm run report-assets
npm run perf:smoke
npm run migrate-data -- --check
npm run test:smoke
git diff --check
```

## Vertical Slice Demo Flow

Start the editor, switch to `Showcase`, accept and complete the `Hill Mail Run` delivery job, and inspect social HUD diagnostics for ten simulated remotes and active stamps. Use `http://127.0.0.1:5174/?runtimeDiagnostics=1` for runtime counters and `http://127.0.0.1:5174/?runtimeDiagnostics=1&styleQuality=low-end` for low-end LOD/scatter diagnostics.

Current mobile evidence is local Chromium only: the smoke suite covers a 390x844 narrow editor viewport and a 360x640 low-end shader baseline. It is not real mobile hardware certification.

## Project Map

- `data/**/*.json` is the source of truth for assets, prefabs, levels, events, timelines, camera shots, render styles, delivery jobs, and social catalogs.
- `data/social/**/*.json` is the source of truth for local multiplayer-lite avatars, emotes, stamps, and presets.
- `src/runtime/three/**` owns Three.js, GLB loading, runtime object resources, picking, animation, transform controls, shader/postprocess Three bindings, delivery route visuals, social visuals, LOD/scatter rendering, and renderer counters.
- `src/game/delivery/**`, `src/game/showcase/**`, and `src/game/social/**` own renderer-neutral vertical-slice gameplay state.
- `src/network/adapters/websocket/**` contains the local replaceable WebSocket prototype only; it is not production networking.
- `src/schemas/**`, `src/data/**`, `src/events/**`, and `src/director/**` stay renderer-neutral.
- `src/editor/**` owns React editor state, panels, command-backed mutations, dirty state, and save UX.
- `scripts/report-vertical-slice-budgets.ts` and `npm run perf:smoke` provide the Phase 26 budget evidence summary.

## Core Rules

Every JSON format needs a Zod schema, validation, and stable ids without spaces.

Actions and conditions must go through schemas plus registries. Do not add dynamic evaluation, raw script strings, or unregistered function dispatch.

Timeline scrub must not execute destructive or runtime-only side effects. Editor mutations must go through command objects for undo, redo, save, and tests.

Three.js must stay inside `src/runtime/three/**` and accepted thin editor/smoke glue. WebSocket/browser/server details must stay behind adapter or smoke tooling boundaries.

## More Docs

- `docs/developer-guide.md` - setup, validation, assets, actions, conditions, timelines, camera shots, and vertical-slice RC guidance.
- `docs/vertical-slice-rc-tag-policy.md` - Phase 26.5 internal RC tag policy, no-overwrite rule, and retagging policy.
- `docs/vertical-slice-rc-release-notes.md` - internal RC scope, validation summary, demo highlights, and limitations.
- `docs/vertical-slice-rc-demo-script.md` - local presenter script for the internal vertical-slice RC.
- `docs/vertical-slice-rc-validation-evidence-index.md` - command and document index for rerunning the RC gate.
- `docs/vertical-slice-release-validation-profile.md` - Phase 26 release validation, smoke, asset, perf/budget, and local mobile/low-end evidence profile.
- `docs/phase-26-vertical-slice-rc-hardening.md` - Phase 26 hardening scope, baseline evidence, gaps, and round map.
- `docs/release-checklist.md` - release checklist, updated during Phase 26 RC hardening.
- `docs/post-mvp-execution-workflow.md` - execution workflow, validation rhythm, and boundary checks.
- `docs/abeto-messenger-development-plan.md` - post-MVP vertical-slice roadmap.
- `docs/Sinan_Scene_Director_研发方案与架构指南.md` - primary product and architecture guide.
