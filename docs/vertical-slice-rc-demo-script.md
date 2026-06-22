# Vertical Slice RC Demo Script

Date: 2026-06-22
Phase: 26.5 RC Release Packaging And Baseline Tagging

This script is for a local internal demo of the Sinan vertical-slice RC. It assumes a clean or current checkout, local Node.js/npm, and the repository dependencies installed. It does not describe a public hosted deployment.

## Prep

Use an LF checkout profile when validating from a new clone on Windows:

```powershell
git -c core.autocrlf=false clone --depth 1 <repo-url> Sinan-RC
cd Sinan-RC
npm ci
```

For the current worktree:

```powershell
npm ci
```

If local generated development assets are missing:

```powershell
npm run generate:dev-assets
```

## Pre-demo Gate

Run the wrapper gate when the Codex workflow scripts are available:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run perf:smoke
git diff --check
```

Expected result:

- `Validate.cmd`: PASS.
- `Smoke.cmd`: PASS, 30/30 Playwright tests.
- `npm run perf:smoke`: PASS.
- `git diff --check`: PASS.

## Start

Start the local editor:

```powershell
npm run dev -- --port 5174 --strictPort
```

Open:

```text
http://127.0.0.1:5174/?runtimeDiagnostics=1
```

Wait for the editor to reach runtime-ready state.

## Demo Beats

1. Show the editor shell with the asset-backed `level_01` vertical slice.
2. Point out that data under `data/**/*.json` remains the source of truth for levels, events, timelines, camera shots, delivery jobs, and social catalogs.
3. Switch from edit mode to `Showcase`.
4. Show the HUD with `Hill Mail Run`.
5. Accept the delivery job.
6. Move through the compact spherical world route toward the target.
7. Show route and target feedback while the delivery is active.
8. Complete the delivery.
9. Confirm the completion HUD update.
10. Point out ten local simulated social remotes and active stamp diagnostics.
11. Return to edit mode.
12. Inspect delivery job data through the editor to show that authoring remains data-backed.

## Low-end Pass

Open:

```text
http://127.0.0.1:5174/?runtimeDiagnostics=1&styleQuality=low-end
```

Show:

- runtime diagnostics remain visible;
- LOD/scatter diagnostics are readable;
- the local low-end profile is a Chromium validation mode, not device certification.

## Evidence To Cite

- Release validation profile: `docs/vertical-slice-release-validation-profile.md`
- RC gate evidence: `docs/phase-26-vertical-slice-rc-gate.md`
- Release notes: `docs/vertical-slice-rc-release-notes.md`
- Tag policy: `docs/vertical-slice-rc-tag-policy.md`
- Phase 26 final report: `docs/phase-26-vertical-slice-rc-hardening-final-report.md`

## Say Clearly

- This is an internal local RC baseline.
- Delivery, social, low-end, mobile/narrow viewport, shader, LOD/scatter, spherical world, asset, and budget claims are backed by local validation and smoke evidence.
- Mobile evidence is local Chromium only.
- Multiplayer is a local multiplayer-lite simulation plus a replaceable WebSocket prototype, not production networking.
- This demo does not include production backend, auth, persistence, hosted deployment, text chat, voice chat, Physics/Rapier, external adapters, production Runtime UI, Audio runtime, or new gameplay.

## If Something Fails

- If the browser is blank or the editor is not runtime-ready, rerun `npm run build` and `npm run test:smoke`.
- If assets are missing, run `npm run generate:dev-assets`, then `npm run validate-data` and `npm run report-assets`.
- If smoke fails after local editing, inspect whether data files were modified by the dev save path and restore only unintended generated/test residue.
- If `format:check` fails in a default Windows clone, retry from an LF checkout profile rather than claiming the default CRLF checkout passed.
