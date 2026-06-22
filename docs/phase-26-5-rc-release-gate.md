# Phase 26.5 RC Release Gate Evidence

Date: 2026-06-22

## Status

Integrated release gate evidence for Phase 26.5 RC Release Packaging And Baseline Tagging.

The tag `vertical-slice-rc-2026-06-22` is intentionally not created in this checkpoint. It must point at the final validated Phase 26.5 commit, so the final tag operation happens after the final report and roadmap handoff commit passes validation and is pushed.

## Main Worktree Gate

- `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`: PASS.
  - `npm run format:check`: PASS.
  - `npm run typecheck`: PASS.
  - `npm run lint`: PASS.
  - `npm run build`: PASS.
  - `npm run test`: PASS, 100 test files / 426 tests.
  - `npm run check-boundaries`: PASS.
  - `npm run validate-data`: PASS.
  - `npm run report-assets`: PASS.
  - `npm run perf:smoke`: PASS.
  - `npm run migrate-data -- --check`: PASS, 16 files already current.
- `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd`: PASS, 30/30 Playwright tests.
- `npm run perf:smoke`: PASS.
- `git diff --check`: PASS.
- `git status --short --branch`: tracked worktree clean after validation; unrelated untracked planning/strategy files remain unstaged.

## Budget Evidence

`npm run perf:smoke` records:

- shader/postprocess low-end Chromium baseline evidence;
- LOD/scatter low-end budget evidence;
- spherical world readability and scatter budget evidence;
- delivery showcase route feedback budget evidence;
- multiplayer-lite social remote and stamp budget evidence;
- asset budget PASS: 8 assets, 24884 B used / 46080 B budget, 0 issues.

## Tag Readiness

Pre-tag no-overwrite checks:

```powershell
git tag --list vertical-slice-rc-2026-06-22
git ls-remote --tags origin vertical-slice-rc-2026-06-22
```

Result: both commands returned no tag. The name is available at this checkpoint.

Tag creation remains deferred until the final Phase 26.5 commit is validated and pushed.

## Boundary Notes

- No product features, new gameplay, production backend, auth, persistence, hosted deployment automation, text chat, voice chat, mobile input implementation, Physics/Rapier, external adapters, production Runtime UI, Audio runtime, or broad engine expansion was added.
- Release packaging docs cite existing validation and smoke evidence only.
- `data/**/*.json` remains the source of truth for vertical-slice semantics.
- Three.js remains inside `src/runtime/three/**` and accepted thin editor/smoke glue.
- WebSocket/browser/server details remain local prototype or smoke evidence, not production networking.
