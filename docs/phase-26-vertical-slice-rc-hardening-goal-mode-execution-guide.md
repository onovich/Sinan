# Phase 26 Vertical Slice RC Hardening Goal Mode Execution Guide

Date: 2026-06-22
Status: Guide for an executor running Phase 26 in goal mode.

Phase 26 starts after Phase 25 Multiplayer-lite Social Layer is PASS and pushed. The accepted planner baseline is `9dc1f29 docs: repair phase 25 final report evidence` on `main` / `origin/main`.

The goal of this phase is to make the current Messenger-like vertical slice reproducible, measurable, and demo-ready. Phase 26 hardens validation, smoke, low-end/mobile evidence, perf/budget reporting, release documentation, and final checklist coverage. It must preserve the Phase 24 delivery showcase and Phase 25 multiplayer-lite social layer instead of adding new product scope.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 26 for Sinan: Vertical Slice RC Hardening. Start only after Phase 25 is PASS and pushed; the accepted planner baseline is 9dc1f29 docs: repair phase 25 final report evidence. Read AGENTS.md, README.md, docs/development-plan.md, docs/abeto-messenger-development-plan.md, docs/post-mvp-execution-workflow.md, docs/developer-guide.md, docs/release-checklist.md, docs/phase-25-multiplayer-lite-social-layer-final-report.md, docs/phase-25-multiplayer-lite-social-layer-goal-mode-execution-guide.md, docs/phase-24-delivery-gameplay-showcase-final-report.md, docs/phase-24-delivery-gameplay-showcase-goal-mode-execution-guide.md, docs/phase-23-compact-spherical-world-prototype-final-report.md, docs/phase-22-lod-instancing-and-vegetation-final-report.md, docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md, docs/strategy/adapter-boundary-policy.md, docs/rfcs/rfc-001-sinan-asset-boundary.md, docs/rfcs/rfc-002-sinan-input-context.md, docs/rfcs/rfc-003-sinan-runtime-ui-viewmodel.md, docs/rfcs/rfc-004-sinan-camera-pose-shot-rig-boundary.md, docs/rfcs/rfc-006-sinan-physics-adapter-boundary.md, docs/rfcs/rfc-007-sinan-audio-system-boundary.md, .codex/project-ops-workflow.json, and .codex/project-git-workflow.json before editing. Implement Phase 26 only: lock reproducible release validation, add or consolidate low-end/mobile profile coverage, add perf smoke and budget reports to release checks, update README/developer guide/asset guidance/release checklist/demo docs, run fresh checkout validation where practical, and produce a Phase 26 final report. Preserve Showcase Mode, delivery job smoke, multiplayer-lite social simulator/WebSocket smoke, low-end budgets, data-first source-of-truth boundaries, and Three.js isolation. Do not implement production backend, auth, persistence, text chat, voice chat, new gameplay systems, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape adapters, production Runtime UI framework, Audio runtime, unrelated external adapters, broad engine refactors, or new product features. Every round must run Debug self-check, architecture self-check, validation, commit, and push before proceeding.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `README.md`
- `docs/development-plan.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/developer-guide.md`
- `docs/release-checklist.md`
- `docs/phase-25-multiplayer-lite-social-layer-final-report.md`
- `docs/phase-25-multiplayer-lite-social-layer-goal-mode-execution-guide.md`
- `docs/phase-24-delivery-gameplay-showcase-final-report.md`
- `docs/phase-24-delivery-gameplay-showcase-goal-mode-execution-guide.md`
- `docs/phase-23-compact-spherical-world-prototype-final-report.md`
- `docs/phase-22-lod-instancing-and-vegetation-final-report.md`
- `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md`
- `docs/strategy/adapter-boundary-policy.md`
- `docs/rfcs/rfc-001-sinan-asset-boundary.md`
- `docs/rfcs/rfc-002-sinan-input-context.md`
- `docs/rfcs/rfc-003-sinan-runtime-ui-viewmodel.md`
- `docs/rfcs/rfc-004-sinan-camera-pose-shot-rig-boundary.md`
- `docs/rfcs/rfc-006-sinan-physics-adapter-boundary.md`
- `docs/rfcs/rfc-007-sinan-audio-system-boundary.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Inspect these implementation and validation areas before changing them:

- `package.json`
- `scripts/**`
- `tests/smoke/**`
- `tests/quality/**`
- `src/runtime/three/**`
- `src/game/showcase/**`
- `src/game/social/**`
- `src/network/**`
- `src/engine/**`
- `src/world/**`
- `src/runtime/**`
- `src/editor/**`
- `data/**/*.json`
- `README.md`
- `docs/developer-guide.md`
- `docs/release-checklist.md`

Current known context:

- Phase 24 is PASS and provides Showcase Mode, delivery job data/state, route/target feedback, completion HUD, editor job affordances, and browser smoke for a successful delivery flow.
- Phase 25 is PASS and provides local remote-player simulation, data-first avatar/emote/stamp/network message contracts, renderer-neutral social state, remote avatar/stamp diagnostics, local WebSocket prototype evidence, and social smoke coverage.
- Current release validation already runs format, typecheck, lint, build, Vitest, boundary checks, data validation, asset reporting, migration checks, and Playwright smoke through project wrappers.
- Phase 26 should harden release reproducibility and documentation. It is not a feature expansion phase.

## 2. What This Phase Must Complete

Phase 26 must complete:

- A documented Phase 26 RC hardening lock.
- A release validation profile that makes full validation, smoke, asset report, perf/budget evidence, and migration checks easy to run and cite.
- Mobile/narrow viewport and low-end profile validation for the vertical slice.
- Perf smoke or release budget reporting that covers the delivery showcase, multiplayer-lite social layer, LOD/scatter/spherical world, shader/postprocess low-end baseline, asset budgets, and local browser limitations.
- Release docs that explain how to run, validate, and demo the current vertical slice from a clean checkout.
- README updates for current status, vertical-slice demo flow, validation commands, and docs map.
- Developer-guide updates for vertical-slice validation, asset/budget guidance, low-end/mobile profile expectations, and smoke/perf triage.
- Release-checklist updates for Phase 26 RC criteria.
- Fresh checkout validation where practical. If a full clean clone is impractical in the current environment, document the attempted commands, limitation, and nearest reproducible substitute.
- A Phase 26 final report with validation evidence, commits, push status, known limitations, and next-route guidance.

## 3. What This Phase Must Not Do

Do not:

- Add production backend, matchmaking, auth, account login, persistence, deployment, moderation, NAT traversal, reconnect recovery, encryption, or authoritative game-server behavior.
- Add text chat, voice chat, friend lists, parties, trading, economy, inventory expansion, quest expansion, or MMO-scale room semantics.
- Add new delivery jobs, new regions, new game loops, new shader features, new postprocess effects, new runtime UI framework, or new audio runtime as release-hardening work.
- Replace the local delivery showcase or local social simulator with a network-first path.
- Add Physics/Rapier, rigid bodies, collision solver, or physics-backed character control.
- Add external InputFlow, ViewRig, LudoWeave, Inscape, production Runtime UI framework, Audio runtime, or unrelated external adapters.
- Move Three.js, WebSocket, browser, DOM, or local server details into renderer-neutral layers.
- Treat generated screenshots, Playwright traces, local logs, temporary perf dumps, or ad hoc reports as source files unless the guide explicitly asks for stable committed fixtures.
- Stage unrelated untracked strategy, architecture, external-project, or user files.

## 4. Architecture Boundaries

Data and schema:

- `data/**/*.json` remains the source of truth for worlds, regions, delivery jobs, social avatars/emotes/stamps, assets, prefabs, events, timelines, camera shots, render styles, materials, LOD, scatter, and other game semantics.
- Release validation may read source data and emit reports; it must not mutate source data unless running an explicit migration command.
- Budget definitions must be expressed through existing schema/data/manifest policy or a small first-party validation contract. Do not hide budgets in Playwright-only assertions when they need release visibility.

Gameplay/runtime:

- Delivery showcase and social runtime behavior must remain renderer-neutral where they already are.
- Phase 26 may add diagnostics, validation hooks, or smoke affordances only when they keep semantics in the owning runtime/game layer.
- React can display slow release/demo status, but per-frame state and budget measurement must stay in runtime/test/diagnostic layers.

Three runtime:

- Three.js, renderer counters, draw-call/triangle estimates, shader compile evidence, material/postprocess behavior, avatar/stamp visuals, LOD/scatter visuals, and disposal stay under `src/runtime/three/**` or smoke-only fixtures.
- Three-specific objects, materials, renderer counters, and derived transforms must not leak into source data, schemas, events, director semantics, or social message contracts.

Network/adapter:

- Phase 25 WebSocket work remains a local replaceable prototype.
- WebSocket/browser/server details must stay behind adapter or smoke tooling boundaries.
- Phase 26 can validate the prototype and document its limits; it must not turn it into a production multiplayer service.

Documentation and release:

- README, developer guide, release checklist, and any new vertical-slice demo guide must match actual commands and repository behavior.
- If adding a dedicated perf command such as `npm run perf:smoke`, keep it local, deterministic, dependency-light, and documented.
- If no real mobile hardware is available, say so explicitly and cite the local Chromium/narrow-viewport/low-end evidence instead of implying device certification.

## 5. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Confirm Phase 25 final report is PASS and pushed before Phase 26 implementation starts.
3. Inspect current status, dirty files, and implementation files before editing.
4. Define the smallest coherent checkpoint.
5. Implement the checkpoint.
6. Run targeted tests first.
7. Run relevant validation.
8. Run browser smoke when Showcase Mode, social visuals, WebSocket behavior, runtime rendering, UI, diagnostics, perf counters, release commands, or docs-visible demo behavior changed.
9. Run Debug self-check.
10. Run architecture self-check.
11. Inspect status and diff.
12. Stage only Phase 26-relevant files.
13. Commit and push before starting the next round.
14. Report commit hash, push result, validation result, and buffer usage.

Each round summary must include:

- Round objective
- Completed work
- Debug self-check
- Architecture self-check
- Validation commands and results
- Commit hash and push result
- Next round objective
- Whether buffer capacity was consumed

Progression rules:

- If validation fails, do not commit, do not push, and do not proceed.
- If validation passes but commit fails, do not proceed.
- If commit succeeds but push fails, do not proceed.
- If generated artifacts appear, keep them out of commits unless explicitly named as source fixtures.
- If production backend/auth/persistence/text/voice chat, new gameplay, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape, production Runtime UI, Audio runtime, or unrelated external adapter work appears in the diff, stop and remove it from Phase 26 commit scope unless the user explicitly changes the phase.

Reusable self-checks for every round:

Debug self-check:

- Can the current change be explained by the smallest relevant fixture, command, or user demo workflow?
- Can failures be localized to docs, release command, package script, validation wrapper, data validation, asset report, smoke harness, perf budget reporter, shader baseline, delivery flow, social flow, runtime diagnostics, browser timing, tooling, CLI, or UI?
- Are success, failure, empty, stale, low-end, narrow/mobile, unsupported-browser, missing-dev-server, missing-asset, invalid-data, and generated-output states covered where relevant?
- If UI or smoke changed, was a repeatable Playwright or equivalent verification added?
- If validation commands changed, are wrapper, direct command, clean checkout, migration, report-assets, and docs boundaries covered?

Architecture self-check:

- Does `data/**/*.json` remain the source of truth for vertical-slice semantics?
- Did host/editor/UI code avoid duplicating release, runtime, social, delivery, shader, LOD, world, event/action, camera, validation, or renderer semantics?
- Are release checks, diagnostics/audit, runtime state, and docs still separated?
- Did the phase avoid product feature expansion, production networking, auth, persistence, text/voice chat, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape, production Runtime UI framework, Audio runtime, and unrelated adapter scope?
- Are unrelated files, generated outputs, and user changes left alone?
- Does Three.js remain inside `src/runtime/three/**` and accepted smoke/editor glue?
- Are WebSocket/browser/server details kept out of data, schemas, events, director/game semantics, and Three runtime visuals?

## 6. Commit And Push Workflow

Use the repository wrappers.

Status:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
```

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

Smoke:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
```

Commit and push with explicit Phase 26 paths:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "docs: harden vertical slice rc guide" -Paths docs\phase-26-vertical-slice-rc-hardening-goal-mode-execution-guide.md,docs\phase-26-vertical-slice-rc-hardening-final-report.md,README.md,docs\developer-guide.md,docs\release-checklist.md,docs\development-plan.md,docs\abeto-messenger-development-plan.md,docs\post-mvp-execution-workflow.md,scripts,tests,package.json,package-lock.json
```

Adjust `-Paths` per round so only touched, phase-relevant files are staged. Do not use broad staging commands such as `git add .`.

## 7. Round Budget

Total: 10 rounds.

- Main implementation and documentation hardening: rounds 26.1 through 26.6.
- Buffer fixes: rounds 26.7 through 26.8.
- Integrated RC gate: round 26.9.
- Final validation and handoff: round 26.10.

The roadmap's 3-round estimate is the high-level planning estimate. This goal-mode guide splits Phase 26 into smaller commit-and-push checkpoints because the phase touches release validation, low-end/mobile evidence, perf/budget reporting, smoke coverage, README/developer/release docs, fresh checkout verification, and final handoff.

## 8. Round Plan

### Round 26.1: Baseline Audit And RC Hardening Lock

Goal:

- Confirm Phase 25 PASS baseline and lock the Phase 26 hardening scope.

Work:

- Confirm `docs/phase-25-multiplayer-lite-social-layer-final-report.md` is PASS and pushed.
- Inspect current validation wrappers, package scripts, smoke tests, budget tests, asset report, README, developer guide, and release checklist.
- Create `docs/phase-26-vertical-slice-rc-hardening.md` with RC scope, evidence inventory, current gaps, and hardening decisions if useful.
- Identify whether a dedicated `perf:smoke` command is needed or whether existing tests can be consolidated into a release budget reporter.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
rg "Phase 26|Vertical Slice RC|low-end|mobile|perf|budget|Smoke.cmd|Validate.cmd" README.md docs package.json scripts tests
git diff --check
```

Expected commit:

```txt
docs: lock phase 26 rc hardening plan
```

### Round 26.2: Release Validation Profile

Goal:

- Make the release validation profile explicit and reproducible.

Work:

- Document and, if needed, add a small first-party release validation command or script entry that ties together full validation, smoke, asset report, migration check, and budget evidence.
- Keep the repository wrappers as the preferred command path.
- Ensure direct command equivalents remain accurate for developers without Codex wrappers.
- Add tests for any new script logic.

Validation:

```powershell
npm run typecheck
npm run test -- release validation
npm run validate-data
npm run report-assets
git diff --check
```

Expected commit:

```txt
chore: document release validation profile
```

### Round 26.3: Perf Smoke And Budget Report Gate

Goal:

- Add or consolidate deterministic vertical-slice perf/budget reporting.

Work:

- Add a stable budget report or perf smoke path that summarizes existing budgets for shader/postprocess low-end baseline, LOD/scatter, spherical world, delivery showcase, multiplayer-lite social remotes/stamps, and asset report status.
- Prefer a dependency-free script or Vitest quality gate if a dedicated command is needed.
- If adding `npm run perf:smoke`, ensure it is documented and included in the release checklist.
- Keep local browser and hardware limitations explicit.

Validation:

```powershell
npm run test -- perf budget low-end social delivery spherical shader
npm run report-assets
git diff --check
```

If `perf:smoke` is added:

```powershell
npm run perf:smoke
```

Expected commit:

```txt
test: add vertical slice budget gate
```

### Round 26.4: Mobile And Low-end Profile Coverage

Goal:

- Ensure mobile/narrow viewport and low-end profile behavior is covered and documented.

Work:

- Audit Playwright smoke for narrow viewport, `styleQuality=low-end`, Showcase Mode, delivery flow, social remotes/stamps, shader low-end baseline, and runtime diagnostics.
- Add missing smoke assertions or tests only where the current coverage does not prove the release claim.
- Keep mobile claims local and honest: Chromium narrow viewport and low-end profile are not device certification.
- Document unsupported mobile/device limitations.

Validation:

```powershell
npm run test -- low-end mobile narrow social delivery shader
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
test: harden low-end vertical slice smoke
```

### Round 26.5: README Developer Guide And Asset Guidance

Goal:

- Update release-facing docs for the current vertical slice.

Work:

- Update `README.md` current status, quick start, validation, Showcase/demo flow, and docs map.
- Update `docs/developer-guide.md` with vertical-slice validation, budget/perf smoke, low-end/mobile evidence, social/delivery demo flow, and asset-report guidance.
- Keep asset guidance tied to `data/assets.manifest.json`, `report-assets`, and current budgets.
- Avoid promising production multiplayer, mobile hardware certification, or release packaging that does not exist.

Validation:

```powershell
rg "Vertical Slice|Phase 26|Showcase|delivery|social|low-end|mobile|perf|report-assets" README.md docs\developer-guide.md
git diff --check
```

Expected commit:

```txt
docs: update vertical slice developer docs
```

### Round 26.6: Release Checklist And Fresh Checkout Evidence

Goal:

- Make the release checklist match the Phase 26 vertical slice and capture fresh checkout evidence.

Work:

- Update `docs/release-checklist.md` from the Phase 14-focused checklist to the current Phase 26 vertical slice RC checklist.
- Add checklist items for Phase 24 delivery smoke, Phase 25 social smoke, low-end/mobile profile, perf/budget report, asset report, migration check, and docs evidence.
- Run fresh checkout validation where practical.
- If full fresh checkout is impractical, record the exact limitation and nearest substitute in docs or the final report.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
docs: update vertical slice release checklist
```

### Round 26.7: Buffer Fix Round 1

Goal:

- Fix Phase 26 defects found by validation, smoke, docs review, or architecture review.

Work:

- Triage failures by layer before editing.
- Keep fixes inside Phase 26 scope.
- Focus on release command accuracy, smoke stability, budget thresholds, low-end diagnostics, docs consistency, and generated-output hygiene.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: stabilize vertical slice rc gate
```

### Round 26.8: Buffer Fix Round 2

Goal:

- Reserve a second buffer for remaining RC blockers only.

Work:

- Use only if integrated checks still find Phase 26 blockers.
- Focus on browser timing, release script determinism, docs mismatch, budget report stability, or fresh-checkout evidence gaps.
- Skip this round if no defects remain and record it as unused in the final report.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: close rc hardening gaps
```

### Round 26.9: Integrated Vertical Slice RC Gate

Goal:

- Prove the release candidate as one integrated local gate.

Work:

- Run full validation, smoke, asset report, migration check, and perf/budget evidence.
- Confirm delivery showcase, social simulator/WebSocket smoke, shader low-end baseline, LOD/scatter, spherical world, and narrow/mobile profile claims are still covered.
- Confirm generated files, smoke traces, screenshots, logs, and temp reports are not staged.
- Update docs if actual commands or evidence differ.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run report-assets
git diff --check
```

If `perf:smoke` exists:

```powershell
npm run perf:smoke
```

Expected commit:

```txt
test: verify vertical slice rc gate
```

### Round 26.10: Final Validation And Handoff

Goal:

- Close Phase 26 with full validation, smoke, final docs, and next-route guidance.

Work:

- Run full validation and smoke.
- Confirm all Phase 26 commits are pushed.
- Create `docs/phase-26-vertical-slice-rc-hardening-final-report.md`.
- Update roadmap entry points with Phase 26 PASS and the recommended next route.
- The final report must include status, completed work, release validation profile, smoke/perf/budget evidence, low-end/mobile evidence, docs updates, fresh checkout evidence or limitation, validation, commits, pushed status, known limitations, and next-goal guidance.
- Confirm Phase 26 did not implement production backend, auth, persistence, text/voice chat, new gameplay, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape, production Runtime UI framework, Audio runtime, or unrelated external adapters.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
rg "Phase 26|Vertical Slice RC|Showcase|delivery|social|low-end|mobile|perf|budget|fresh checkout" README.md docs package.json scripts tests
git diff --check
```

If `perf:smoke` exists:

```powershell
npm run perf:smoke
```

Expected commit:

```txt
docs: finalize phase 26 vertical slice rc
```

## 9. PASS Criteria

Phase 26 is PASS only when all of these are true:

- Phase 25 final report is PASS and the executor confirmed it was pushed before Phase 26 implementation started.
- Full validation through `Validate.cmd` passes.
- Browser smoke through `Smoke.cmd` passes.
- Asset report passes and release docs explain the current asset budget status.
- Perf smoke or a documented budget report passes and covers current vertical-slice risks.
- Low-end/mobile or narrow-viewport evidence is recorded, with limitations clearly stated when no real mobile device test exists.
- Delivery showcase smoke remains green.
- Multiplayer-lite social simulator/WebSocket smoke remains green.
- Shader/postprocess low-end baseline remains green.
- LOD/scatter/spherical world budget evidence remains green or is clearly covered by existing tests.
- README explains setup, validation, and demo flow for the current vertical slice.
- Developer guide explains vertical-slice validation, asset/budget guidance, low-end/mobile evidence, and smoke/perf triage.
- Release checklist is updated for Phase 26 RC hardening.
- Fresh checkout validation was run where practical; otherwise the limitation and nearest substitute are recorded.
- No Three.js imports are introduced outside `src/runtime/three/**` and accepted thin editor/smoke glue.
- WebSocket/browser/server details remain behind adapter or smoke tooling boundaries.
- No production networking, auth, persistence, text chat, voice chat, new gameplay systems, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape, production Runtime UI framework, Audio runtime, or unrelated external adapter scope is implemented.
- `git diff --check` passes.
- Phase 26 final report exists.
- All Phase 26 commits are pushed to `origin/main` or the active remote branch requested by the user.

## 10. Validation Matrix

| Area | Required validation |
| --- | --- |
| Full validation | `Validate.cmd` passes format, typecheck, lint, build, tests, boundaries, data validation, asset report, and migration check |
| Browser smoke | `Smoke.cmd` passes current Playwright suite |
| Delivery showcase | Smoke or tests prove accept/deliver/complete flow and editor job inspection still work |
| Social layer | Smoke or tests prove ten remotes, stamp diagnostics, invalid-message handling, and WebSocket prototype evidence stay covered |
| Shader/postprocess | Existing shader quality gate and low-end Chromium baseline stay green |
| LOD/scatter/spherical world | Existing perf/diagnostic tests stay green and are included in release evidence |
| Asset budget | `npm run report-assets` passes and release docs summarize output and limitations |
| Perf/budget report | Dedicated perf smoke or consolidated budget report passes and cites local limits |
| Mobile/low-end | Narrow viewport and `styleQuality=low-end` evidence exists; real-device gaps are explicit |
| Fresh checkout | `npm ci`, validation, and smoke from a clean checkout where practical, or documented limitation plus substitute |
| Docs | README, developer guide, release checklist, roadmap entry points, and final report match actual commands |
| Boundary checks | `check-boundaries` proves Three.js, dynamic code, and adapter boundaries remain intact |
| Git gate | Explicit path staging, pushed commits, clean tracked status, unrelated untracked files left alone |

## 11. Final Report Template

Create `docs/phase-26-vertical-slice-rc-hardening-final-report.md` using this structure:

```markdown
# Phase 26 Vertical Slice RC Hardening Final Report

Date: <date>

## Status

PASS or BLOCKED.

## Completed

- ...

## Release Validation Profile

- Preferred wrapper commands:
- Direct command equivalents:
- Perf/budget command or report:
- Asset report:
- Migration check:

## Smoke And Perf Evidence

- Delivery showcase:
- Multiplayer-lite social layer:
- Shader/postprocess low-end baseline:
- LOD/scatter/spherical world:
- Mobile/narrow viewport:
- Low-end profile:
- Budget report:
- Browser/server limitations:

## Documentation Updates

- README:
- Developer guide:
- Release checklist:
- Additional demo or release docs:

## Fresh Checkout Evidence

- Commands run:
- Result:
- Limitations or substitute evidence:

## Validation

- Validate.cmd:
- Smoke.cmd:
- perf/budget command:
- Targeted tests:
- Data validation:
- Asset report:
- Boundary checks:
- git diff --check:

## Commits And Push

- `<hash>` <message> pushed to `<remote>/<branch>`

## Buffer

Consumed or not consumed. Explain why.

## Known Limitations

- ...

## Remaining Blockers

None, or list blockers.

## Recommended Next Goal

Record the next route only after Phase 26 is PASS and pushed. Recommended default: hold the vertical slice as a release-candidate baseline and create a separate scoped guide before any production backend, auth, persistence, text/voice chat, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape, production Runtime UI, Audio runtime, or unrelated external adapter work starts.
```

## 12. Post-Phase 26 Handoff Notes

After Phase 26 passes, the project should have a release-candidate vertical slice with:

- Single-player delivery showcase preserved.
- Multiplayer-lite local social prototype preserved.
- Low-end/mobile or narrow-viewport evidence recorded honestly.
- Perf/budget evidence tied to release checks.
- README, developer guide, asset guidance, and release checklist aligned with actual commands.
- Final validation and smoke evidence pushed.

The next project move should be a separately scoped planning decision. Do not treat Phase 26 as blanket approval for production networking, auth, persistence, text/voice chat, Physics/Rapier, external adapter integration, Runtime UI framework, Audio runtime, or broad engine expansion.
