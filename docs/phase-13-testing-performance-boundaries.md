# Phase 13 Testing, Performance, And Boundaries Notes

This document tracks Phase 13 hardening work after the Phase 12 authoring/data-safety checkpoint.

## Browser Smoke Scope

- The editor smoke now covers the original load/render/mode/timeline/runtime path plus a save/reload workflow across all core authoring domains.
- The save/reload smoke edits:
  - Level data through the `Interactable.prompt` component form and top-level Save command.
  - Event data through the Event Inspector draft, Apply command, and Save Event command.
  - Timeline data through property keyframe add and Save Timeline.
  - Camera shot data through keyframe add and Save Shot.
- The test reloads the editor after saving and verifies the persisted UI state for the level prompt, event name, timeline key count, and camera shot key count.
- The test captures original raw JSON file text and restores it in `finally`, so local smoke runs do not leave formatted or semantic data diffs behind.

## Automated Boundary Checks

- `npm run check-boundaries` runs `scripts/check-boundaries.ts`.
- The script fails on forbidden Three.js imports or Three namespace references in renderer-neutral source layers: `src/game`, `src/events`, `src/director`, `src/world`, `src/schemas`, `src/data`, and `src/migrations`.
- The script also fails on dynamic-code execution patterns in `src`, `data`, `scripts`, and `tests`, including dynamic evaluation, function construction from strings, and window property dispatch.
- `check-boundaries` is wired into both ops validation and git validation before data validation.

## Current Validation Coverage

- `Validate.cmd` runs format, typecheck, lint, build, unit tests, data validation, and migration check.
- `Smoke.cmd` runs Playwright browser smoke on the desktop and narrow viewport paths.
- Automated architecture checks cover forbidden Three imports and dynamic-code execution patterns.

## Bundle Hygiene

- `Viewport` loads the Three runtime through a dynamic import so the editor shell can stay out of the Three.js vendor chunk.
- Vite manual chunks separate `react-vendor`, `three-vendor`, and `three-runtime` from the main editor bundle.
- Current production build output is approximately:
  - `index`: 190 kB minified / 50 kB gzip.
  - `react-vendor`: 192 kB minified / 60 kB gzip.
  - `three-runtime`: 11 kB minified / 4 kB gzip.
  - `three-vendor`: 631 kB minified / 164 kB gzip.
- The Vite chunk warning limit is set to 700 kB because the remaining large chunk is the isolated Three.js/GLTF runtime dependency, not editor application growth. If `three-vendor` grows past this threshold, revisit runtime imports or defer heavier optional Three examples.

## Remaining Phase 13 Work

- Add runtime lifecycle/disposal regression tests and no-console-error smoke where practical.
