# Vertical Slice RC Validation Evidence Index

Date: 2026-06-22
Phase: 26.5 RC Release Packaging And Baseline Tagging

This index collects the repeatable evidence for the internal vertical-slice RC. It points to commands, reports, and docs that prove the local RC gate. It does not replace the commands themselves.

## Primary Gate

Run from `D:\LabProjects\Sinan`:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run perf:smoke
npm run report-assets
git diff --check
```

Expected current evidence:

- `Validate.cmd`: PASS for format, typecheck, lint, build, Vitest, boundary checks, data validation, asset report, perf smoke, and migration check.
- `Smoke.cmd`: PASS for 30/30 Playwright smoke tests.
- `npm run perf:smoke`: PASS for vertical-slice budget evidence.
- `npm run report-assets`: PASS, 8 assets, 24884 B used / 46080 B budget, 0 issues.
- `git diff --check`: PASS.

## Direct Commands

For checkouts without Codex wrappers, use the direct command list in `docs/vertical-slice-release-validation-profile.md`:

```powershell
npm ci
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

## Evidence Documents

- `docs/phase-26-vertical-slice-rc-hardening-final-report.md`: Phase 26 PASS report, validation, smoke, perf/budget, fresh-checkout evidence, known limitations, and push evidence.
- `docs/phase-26-vertical-slice-rc-gate.md`: integrated RC gate evidence, asset report, perf smoke, fresh-checkout LF profile, CRLF limitation, and boundary notes.
- `docs/vertical-slice-release-validation-profile.md`: wrapper and direct command validation profile.
- `docs/release-checklist.md`: RC checklist for fresh checkout, validation, demo, low-end/mobile, architecture, data/assets, docs, and git gates.
- `docs/vertical-slice-rc-release-notes.md`: internal RC scope, validation summary, demo highlights, and known limits.
- `docs/vertical-slice-rc-demo-script.md`: local presenter script and pre-demo gate.
- `docs/vertical-slice-rc-tag-policy.md`: internal tag, no-overwrite behavior, conflict handling, and retagging policy.

## Smoke Coverage Pointers

- Delivery showcase flow: `tests/smoke/editor.spec.ts`.
- Multiplayer-lite social diagnostics: `tests/smoke/editor.spec.ts`.
- Shader material and postprocess browser checks: `tests/smoke/shader-material.spec.ts`.
- Narrow viewport editor containment: `tests/smoke/editor.spec.ts`.

## Budget And Asset Evidence

- Asset report command: `npm run report-assets`.
- Vertical-slice budget command: `npm run perf:smoke`.
- Budget reporter source: `scripts/report-vertical-slice-budgets.ts`.
- Asset source of truth: `data/assets.manifest.json`.

`npm run perf:smoke` summarizes evidence for:

- shader/postprocess low-end Chromium baseline;
- LOD/scatter low-end budget;
- spherical world readability and scatter budget;
- delivery showcase route feedback budget;
- multiplayer-lite social remote and stamp budget;
- asset budget PASS.

## Fresh Checkout Profile

Use the LF checkout profile for reproducible Windows validation:

```powershell
git -c core.autocrlf=false clone --depth 1 <repo-url> Sinan-RC
cd Sinan-RC
npm ci
```

Then run the direct command list above.

Known limitation: a default Windows checkout with `core.autocrlf=true` can convert tracked files to CRLF and fail `format:check`. Do not record a default CRLF checkout as PASS unless the command output proves it.

## Boundary Evidence

`npm run check-boundaries` verifies:

- Three.js imports stay out of renderer-neutral layers;
- dynamic-code execution patterns do not enter source/data/scripts/tests;
- release packaging does not promote local WebSocket/browser/server details into production semantics.

## Tag Evidence

Before tagging:

```powershell
git tag --list vertical-slice-rc-2026-06-22
git ls-remote --tags origin vertical-slice-rc-2026-06-22
```

After final validation and final commit push:

```powershell
git tag -a vertical-slice-rc-2026-06-22 -m "Sinan vertical slice internal RC baseline 2026-06-22"
git push origin vertical-slice-rc-2026-06-22
git tag --list vertical-slice-rc-2026-06-22
git ls-remote --tags origin vertical-slice-rc-2026-06-22
```

The final report must record the tag target commit and remote push evidence.
