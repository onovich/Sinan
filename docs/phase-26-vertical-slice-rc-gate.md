# Phase 26 Vertical Slice RC Gate Evidence

Date: 2026-06-22

## Status

Integrated RC gate evidence for Phase 26.

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
- `npm run report-assets`: PASS, 8 assets, 24884 B used / 46080 B budget, 0 issues.
- `npm run perf:smoke`: PASS.
- `git diff --check`: PASS.

## Budget Evidence

`npm run perf:smoke` records:

- shader/postprocess low-end Chromium baseline evidence,
- LOD/scatter low-end budget evidence,
- spherical world readability and scatter budget evidence,
- delivery showcase route feedback budget evidence,
- multiplayer-lite social remote and stamp budget evidence,
- asset budget PASS.

## Fresh Checkout Evidence

Fresh checkout validation was run from pushed commit `205cdcd docs: update vertical slice release checklist`.

- Default Windows checkout attempt: `npm ci`, build, Vitest, boundary checks, data validation, asset report, perf smoke, migration check, and Playwright smoke passed except `format:check`, which failed because the default clone converted many tracked files to CRLF. This is recorded as a Windows line-ending checkout limitation.
- LF checkout attempt with `git -c core.autocrlf=false clone --depth 1 file:///D:/LabProjects/Sinan <temp>`:
  - `npm ci`: PASS.
  - `npm run format:check`: PASS.
  - `npm run typecheck`: PASS.
  - `npm run lint`: PASS.
  - `npm run build`: PASS.
  - `npm run test`: PASS, 100 test files / 426 tests.
  - `npm run check-boundaries`: PASS.
  - `npm run validate-data`: PASS.
  - `npm run report-assets`: PASS, 8 assets, 24884 B used / 46080 B budget, 0 issues.
  - `npm run perf:smoke`: PASS.
  - `npm run migrate-data -- --check`: PASS, 16 files already current.
- Separate clean LF smoke clone from the same commit:
  - `npm ci`: PASS.
  - `npm run test:smoke`: PASS, 30/30 Playwright tests.
  - `git diff --check`: PASS.

An earlier reused temporary LF checkout produced a Playwright failure after local smoke write-back state contaminated the temp directory. A new LF clone from the same commit passed 30/30 smoke, so the accepted fresh-checkout evidence is the clean LF clone result above.

## Boundary Notes

- No production backend, auth, persistence, text chat, voice chat, production matchmaking, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape adapters, production Runtime UI framework, Audio runtime, or unrelated external adapter scope was added.
- Three.js remains inside `src/runtime/three/**` and smoke/editor glue.
- WebSocket work remains a local replaceable prototype behind `src/network/adapters/websocket/**` and smoke evidence.
- Mobile evidence remains local Chromium narrow viewport and `styleQuality=low-end` evidence, not real mobile hardware certification.
