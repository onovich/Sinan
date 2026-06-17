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

## Current Validation Coverage

- `Validate.cmd` runs format, typecheck, lint, build, unit tests, data validation, and migration check.
- `Smoke.cmd` runs Playwright browser smoke on the desktop and narrow viewport paths.
- Manual architecture checks still cover forbidden Three imports and dynamic-code execution patterns.

## Remaining Phase 13 Work

- Automate architecture boundary checks as a script and wire it into regular validation.
- Resolve or document the current Vite chunk-size warning.
- Add runtime lifecycle/disposal regression tests and no-console-error smoke where practical.
