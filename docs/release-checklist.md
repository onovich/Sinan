# Phase 26 Vertical Slice RC Checklist

Use this checklist before calling the current Sinan checkout demo-ready as a local vertical-slice release candidate.

## Current RC Scope

Status target: Phase 26 Vertical Slice RC Hardening.

The RC includes:

- Phase 24 Showcase Mode delivery flow.
- Phase 25 multiplayer-lite local social simulator, social HUD diagnostics, and local replaceable WebSocket prototype evidence.
- Shader/postprocess production quality gates and local low-end Chromium baseline.
- LOD/scatter/spherical world diagnostics and standard/low-end budget evidence.
- Asset report and vertical-slice budget report gates.
- README, developer guide, release validation profile, release checklist, and final report evidence.

The RC does not include production backend, auth, persistence, text chat, voice chat, production matchmaking, production WebSocket deployment, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape adapters, production Runtime UI framework, Audio runtime, or unrelated external adapters.

## Fresh Checkout

- [ ] Clone the repository or create an isolated local clone from the pushed commit.
- [ ] Confirm Node.js and npm are available.
- [ ] Install dependencies:

```powershell
npm ci
```

- [ ] If generated development assets are missing, regenerate them:

```powershell
npm run generate:dev-assets
```

- [ ] Run the direct validation profile when Codex wrappers are unavailable in the fresh checkout:

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

- [ ] Record the exact commit, commands, PASS/FAIL results, and any limitation in the Phase 26 final report.

## Required Local Validation

- [ ] Run the configured validation wrapper from the main worktree:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

- [ ] Run browser smoke from the main worktree:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
```

- [ ] Confirm `npm run report-assets` passes with zero issues.
- [ ] Confirm `npm run perf:smoke` passes and reports:
  - shader/postprocess low-end Chromium baseline evidence,
  - LOD/scatter low-end budget evidence,
  - spherical world readability and scatter budget evidence,
  - delivery showcase route feedback budget evidence,
  - multiplayer-lite social remote and stamp budget evidence,
  - asset budget PASS.
- [ ] Confirm `git diff --check` passes.

## Demo Workflow

- [ ] Start the local editor:

```powershell
npm run dev -- --port 5174 --strictPort
```

- [ ] Open `http://127.0.0.1:5174/?runtimeDiagnostics=1`.
- [ ] Confirm the editor reaches runtime-ready state.
- [ ] Switch to `Showcase`.
- [ ] Confirm the HUD shows `Hill Mail Run`, ten local social remotes, active stamp diagnostics, and runtime-ready status.
- [ ] Accept and complete the delivery job.
- [ ] Confirm delivery route/target feedback and completion HUD update.
- [ ] Return to edit mode and inspect delivery job data in the editor.
- [ ] Open `http://127.0.0.1:5174/?runtimeDiagnostics=1&styleQuality=low-end`.
- [ ] Confirm low-end LOD/scatter diagnostics remain readable.

## Mobile And Low-End Evidence

- [ ] Confirm the smoke suite includes the 390x844 narrow editor viewport.
- [ ] Confirm the shader smoke suite includes the 360x640 low-end Chromium baseline.
- [ ] Confirm release notes and final report state that this is local Chromium evidence only, not real mobile hardware certification.

## Architecture Gate

- [ ] `npm run check-boundaries` passes.
- [ ] No Three.js imports appear in renderer-neutral layers.
- [ ] Three runtime visuals, renderer counters, shader/postprocess bindings, delivery route visuals, social visuals, LOD/scatter visuals, and disposal stay inside `src/runtime/three/**` or smoke/test-only fixtures.
- [ ] `data/**/*.json` remains the source of truth for vertical-slice semantics.
- [ ] WebSocket/browser/server details remain behind adapter or smoke tooling boundaries.
- [ ] No dynamic-code execution patterns appear in project source, data, scripts, or tests.

## Data And Asset Gate

- [ ] `npm run validate-data` passes.
- [ ] `npm run report-assets` passes and reports zero critical issues.
- [ ] `npm run perf:smoke` passes.
- [ ] Asset report summary is recorded in the final report.
- [ ] Stable ids are used for entities, prefabs, assets, events, timelines, tracks, camera shots, delivery jobs, social avatars, emotes, stamps, and presets.
- [ ] `data/assets.manifest.json` references existing files under `public/`.

## Documentation Gate

- [ ] `README.md` explains setup, validation, current Phase 26 status, vertical-slice demo flow, architecture boundaries, and docs map.
- [ ] `docs/developer-guide.md` covers vertical-slice validation, asset/budget guidance, low-end/mobile evidence, social/delivery demo flow, and smoke/perf triage.
- [ ] `docs/vertical-slice-release-validation-profile.md` matches actual wrapper and direct commands.
- [ ] `docs/phase-26-vertical-slice-rc-hardening-final-report.md` records validation, smoke, perf/budget, fresh-checkout evidence, commits, push status, known limitations, and recommended next route.

## Git Gate

- [ ] Commit all Phase 26 release-candidate changes with explicit path staging.
- [ ] Push to `origin/main`.
- [ ] Confirm no unrelated or generated files are staged.
- [ ] Confirm tracked status is clean after the final push; unrelated untracked planning/strategy files may remain unstaged if they predate or sit outside Phase 26.
