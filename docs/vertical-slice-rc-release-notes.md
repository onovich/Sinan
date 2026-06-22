# Vertical Slice RC Release Notes

Date: 2026-06-22
Phase: 26.5 RC Release Packaging And Baseline Tagging
Status: Internal local release-candidate package.

These notes describe the Sinan vertical-slice internal RC baseline. The package is intended for local demos, repeatable validation, and future branch points. It is not a public production launch, hosted deployment, production multiplayer certification, or real mobile hardware certification.

## Baseline

- Accepted Phase 26 baseline: `95b290e docs: finalize phase 26 vertical slice rc`.
- Packaging guide commit: `0ecbe12 docs: add phase 26.5 rc packaging guide`.
- Tag policy checkpoint: `d1963e5 docs: lock vertical slice rc tag policy`.
- Planned internal annotated tag: `vertical-slice-rc-2026-06-22`.

The final tag is created only after Phase 26.5 final validation passes and the final packaging commit is pushed.

## Included Slice

- Phase 24 delivery showcase: Showcase Mode, `Hill Mail Run`, route/target feedback, completion feedback, and editor job inspection smoke.
- Phase 25 multiplayer-lite social layer: ten local simulated remotes, avatar/emote/stamp data, social HUD diagnostics, invalid-message handling, and local WebSocket prototype evidence.
- Phase 26 RC hardening: `Validate.cmd`, `Smoke.cmd`, `npm run perf:smoke`, `npm run report-assets`, low-end/mobile Chromium evidence, release checklist, and fresh-checkout evidence.
- Runtime presentation: asset-backed `level_01`, palette-toon styling, shader/postprocess quality gate, LOD/scatter diagnostics, compact spherical world placement, and runtime diagnostics.

## Validation Summary

Preferred local gate:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run perf:smoke
git diff --check
```

Direct validation commands for a developer checkout are listed in `docs/vertical-slice-release-validation-profile.md`.

Current expected evidence:

- `Validate.cmd`: format, typecheck, lint, build, Vitest, boundary checks, data validation, asset report, perf smoke, and migration check.
- `Smoke.cmd`: Playwright smoke with delivery showcase, social diagnostics, shader/postprocess, editor workflows, and narrow viewport coverage.
- `npm run perf:smoke`: asset budget plus shader, LOD/scatter, spherical world, delivery showcase, and social budget evidence.
- `npm run report-assets`: 8 assets, 24884 B used / 46080 B budget, 0 issues at the Phase 26 baseline.

## Demo Highlights

1. Start the local editor and open `http://127.0.0.1:5174/?runtimeDiagnostics=1`.
2. Confirm the editor reaches runtime-ready state.
3. Switch to `Showcase`.
4. Accept and complete `Hill Mail Run`.
5. Confirm delivery HUD progress, route/target feedback, ten local social remotes, active stamp diagnostics, and runtime-ready status.
6. Return to edit mode and inspect delivery job data.
7. Reopen with `http://127.0.0.1:5174/?runtimeDiagnostics=1&styleQuality=low-end` to inspect low-end diagnostics.

## Known Limits

- Mobile evidence is local Chromium narrow viewport plus low-end profile evidence only, not real mobile hardware certification.
- Multiplayer remains local simulation plus a replaceable WebSocket prototype, not production networking.
- The RC has no production backend, auth, persistence, hosted deployment, moderation, reconnect recovery, text chat, voice chat, friend list, parties, economy, trading, or MMO-scale rooms.
- The RC does not include Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape adapters, production Runtime UI, Audio runtime, new gameplay, or broad engine expansion.
- Default Windows clones with CRLF conversion can fail `format:check`; use an LF checkout profile such as `git -c core.autocrlf=false clone ...` for reproducible validation.

## Use

Use this RC package to:

- cite a known local vertical-slice baseline;
- run the local demo consistently;
- re-run release validation and smoke gates;
- branch future work from an annotated internal tag after Phase 26.5 passes.

Do not use this package as approval to start production backend, auth, persistence, text/voice chat, mobile input implementation, Physics/Rapier, external adapters, production Runtime UI, Audio runtime, deployment, or unrelated engine expansion without a separate scoped guide.
