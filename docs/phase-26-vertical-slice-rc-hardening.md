# Phase 26 Vertical Slice RC Hardening

Date: 2026-06-22

## Status

Round 26.1 baseline lock. Phase 26 starts from the accepted Phase 25 planner baseline `9dc1f29 docs: repair phase 25 final report evidence`; the active guide was added in `96b6038 docs: add phase 26 vertical slice rc guide`.

This phase hardens the current vertical slice as a local release-candidate baseline. It must preserve the Phase 24 delivery showcase and Phase 25 multiplayer-lite social layer, then make validation, smoke, low-end/mobile evidence, performance/budget reporting, release docs, and fresh-checkout evidence reproducible.

## Baseline Evidence Inventory

- Preferred full validation: `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`.
- Preferred browser smoke: `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd`.
- Current full validation scope from `.codex/project-ops-workflow.json`: format check, typecheck, lint, build, Vitest, boundary checks, data validation, asset report, and migration check.
- Current smoke scope: Playwright against the local Vite server on `http://127.0.0.1:5174/`.
- Phase 25 final evidence records `Validate.cmd` PASS with 97 Vitest files / 421 tests, `Smoke.cmd` PASS with 30/30 Playwright tests, `npm run report-assets` PASS with 8 assets and 24884 B used / 46080 B budget, and `git diff --check c21cd57..HEAD` PASS.
- Delivery showcase coverage includes accepted/in-progress/ready/completed job states, route and target feedback, editor job inspection, and Showcase Mode smoke.
- Social coverage includes data-first avatar/emote/stamp catalogs, renderer-neutral social state, deterministic local remote-player simulation, ten remote avatars, stamp diagnostics, invalid-message handling, and a local replaceable WebSocket room prototype.
- Budget/perf coverage already exists for shader low-end Chromium smoke, LOD/scatter instancing, spherical placement plus scatter, delivery route feedback, and social remote/stamp budgets.

## Current Hardening Gaps

- README current status and docs map still describe an older post-MVP stage and do not present Phase 26 as the current vertical-slice RC baseline.
- `docs/release-checklist.md` is still Phase 14 oriented and does not cover delivery showcase, social smoke, low-end/mobile evidence, budget reporting, asset report, migration check, or fresh checkout as Phase 26 release criteria.
- There is no dedicated `perf:smoke` command or consolidated release budget report entry point. Budget evidence is present but scattered across Vitest, Playwright, and asset report output.
- Mobile evidence is local only: narrow viewport and `styleQuality=low-end` Chromium coverage. No real device certification is currently available.
- Fresh checkout evidence has not yet been re-run for Phase 26. If a clean clone is impractical, the final report must record the attempted command, limitation, and nearest reproducible substitute.

## Hardening Decisions

- Add a small first-party release validation profile before adding broader tooling. Wrapper commands remain the preferred path; direct npm equivalents stay documented for developers without Codex wrappers.
- Add or consolidate a deterministic vertical-slice budget report and expose it through a local command such as `npm run perf:smoke` if the implementation stays dependency-light and stable.
- Treat mobile claims as local narrow-viewport plus low-end profile evidence unless real hardware is explicitly tested later.
- Keep all release validation and reporting read-only with respect to `data/**/*.json`; migration stays behind `npm run migrate-data -- --check` unless a future phase explicitly approves data writes.
- Keep Three.js, renderer counters, draw-call/triangle estimates, shader evidence, avatar/stamp visuals, and disposal details inside `src/runtime/three/**` or smoke/test-only fixtures.
- Keep WebSocket/browser/server details behind the existing adapter and smoke tooling boundary. Phase 26 may validate and document the local prototype, but it must not promote it to production networking.

## Non-scope Guard

Phase 26 does not implement production backend, auth, persistence, text chat, voice chat, new gameplay systems, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape adapters, a production Runtime UI framework, Audio runtime, or unrelated external adapters.

## Round Map

- 26.1: Lock this baseline and evidence inventory.
- 26.2: Make the release validation profile explicit and reproducible.
- 26.3: Add or consolidate perf smoke and vertical-slice budget reporting.
- 26.4: Harden mobile/narrow viewport and low-end profile coverage.
- 26.5: Update README, developer guide, demo flow, and asset guidance.
- 26.6: Update the release checklist and capture fresh checkout evidence.
- 26.7-26.8: Use only for validation, smoke, docs, or architecture repair.
- 26.9: Run the integrated vertical-slice RC gate.
- 26.10: Final validation, final report, roadmap update, push, and planner handoff.
