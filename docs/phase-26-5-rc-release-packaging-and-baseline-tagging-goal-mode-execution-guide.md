# Phase 26.5 RC Release Packaging And Baseline Tagging Goal Mode Execution Guide

Date: 2026-06-22
Status: Guide for an executor running Phase 26.5 in goal mode.

Phase 26.5 starts after Phase 26 Vertical Slice RC Hardening is PASS and pushed. The accepted baseline is `95b290e docs: finalize phase 26 vertical slice rc` on `main` / `origin/main`.

The goal of this phase is to package the current local vertical-slice release candidate into a stable internal baseline: release notes, demo script, validation evidence index, tag policy, tag creation, and final release handoff. This phase must not add product features. It exists to make the Phase 26 RC easy to cite, demo, revalidate, and branch from.

Planner decision already made:

- Proceed with RC release packaging before opening the next product feature line.
- Treat this as an internal RC baseline, not a public production launch.
- Use `vertical-slice-rc-2026-06-22` as the default annotated git tag name unless that tag already exists. If it exists, do not overwrite it; stop and report a naming conflict.
- After this packaging phase is accepted, the next product direction should be decided separately. The likely candidates are mobile/input experience or content expansion.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 26.5 for Sinan: RC Release Packaging And Baseline Tagging. Start only after Phase 26 is PASS and pushed; the accepted baseline is 95b290e docs: finalize phase 26 vertical slice rc. Read AGENTS.md, README.md, docs/development-plan.md, docs/abeto-messenger-development-plan.md, docs/post-mvp-execution-workflow.md, docs/developer-guide.md, docs/release-checklist.md, docs/phase-26-vertical-slice-rc-hardening-final-report.md, docs/phase-26-vertical-slice-rc-hardening-goal-mode-execution-guide.md, docs/vertical-slice-release-validation-profile.md, docs/phase-26-vertical-slice-rc-gate.md, .codex/project-ops-workflow.json, and .codex/project-git-workflow.json before editing. Implement Phase 26.5 only: add release notes, demo script, validation evidence index, tag policy documentation, final baseline report, and an annotated internal RC tag named vertical-slice-rc-2026-06-22 after final validation passes. If that tag already exists locally or remotely, do not overwrite it; report a blocker. Preserve Phase 24 delivery showcase smoke, Phase 25 social smoke, Phase 26 validation profile, perf:smoke, data-first source-of-truth boundaries, and Three.js isolation. Do not implement production backend, auth, persistence, deployment automation beyond local release documentation, text chat, voice chat, new gameplay, mobile input implementation, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape adapters, production Runtime UI framework, Audio runtime, or broad engine expansion. Every round must run Debug self-check, architecture self-check, validation, commit, and push before proceeding.
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
- `docs/phase-26-vertical-slice-rc-hardening-final-report.md`
- `docs/phase-26-vertical-slice-rc-hardening-goal-mode-execution-guide.md`
- `docs/phase-26-vertical-slice-rc-hardening.md`
- `docs/vertical-slice-release-validation-profile.md`
- `docs/phase-26-vertical-slice-rc-gate.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Inspect these areas before changing them:

- `README.md`
- `docs/developer-guide.md`
- `docs/release-checklist.md`
- `docs/phase-26-vertical-slice-rc-hardening-final-report.md`
- `docs/vertical-slice-release-validation-profile.md`
- `docs/phase-26-vertical-slice-rc-gate.md`
- `package.json`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Current known context:

- Phase 26 is PASS and established the local vertical-slice RC baseline.
- Current validation includes `Validate.cmd`, `Smoke.cmd`, `npm run perf:smoke`, `npm run report-assets`, data validation, migration check, boundary checks, and `git diff --check`.
- The RC is local/internal evidence. It is not real mobile hardware certification, production multiplayer, public hosted deployment, or production backend readiness.

## 2. What This Phase Must Complete

Phase 26.5 must complete:

- A release notes document for the internal vertical-slice RC.
- A compact demo script that explains how to show the RC locally.
- A validation evidence index that links commands, reports, and expected PASS evidence.
- A tag policy document that records the internal RC tag name, tag creation command, no-overwrite policy, and retagging policy.
- An annotated git tag named `vertical-slice-rc-2026-06-22`, created only after final validation passes and only if it does not already exist locally or remotely.
- A Phase 26.5 final report that records validation, tag evidence, pushed commits, pushed tag, known limitations, and next decision guidance.
- Roadmap entry-point updates showing that Phase 26.5 is the active packaging guide and then, at final handoff, that the internal RC baseline is packaged.

## 3. What This Phase Must Not Do

Do not:

- Add product features, new gameplay, new regions, new jobs, new social interactions, or new content.
- Implement mobile touch controls, gamepad controls, virtual joystick, or real-device certification.
- Implement production backend, matchmaking, auth, accounts, persistence, deployment automation, moderation, reconnect recovery, encryption, text chat, voice chat, friend list, parties, economy, trading, or MMO-scale rooms.
- Add Physics/Rapier, Runtime UI framework, Audio runtime, external InputFlow/ViewRig/LudoWeave/Inscape adapters, or unrelated external adapters.
- Change source data semantics, schemas, runtime behavior, renderer behavior, smoke behavior, validation thresholds, or package dependencies unless a packaging doc/test requires a tiny correction.
- Overwrite, move, or delete an existing git tag.
- Stage unrelated untracked strategy, architecture, external-project, or user files.

## 4. Architecture And Release Boundaries

Release packaging:

- Release docs may reference existing validation commands and evidence; they must not invent certification claims.
- Internal tag and release notes must point at the final validated commit.
- If a tag conflict exists, stop and report it rather than force-pushing, deleting, or recreating tags.

Validation:

- `Validate.cmd`, `Smoke.cmd`, `npm run perf:smoke`, `npm run report-assets`, and `git diff --check` remain the release gate.
- If full fresh-checkout validation is repeated, use the LF checkout profile documented by Phase 26. Do not imply default Windows CRLF checkout is passing when it is not.

Data/runtime:

- `data/**/*.json` remains the source of truth for vertical-slice semantics.
- Three.js stays inside `src/runtime/three/**` and accepted thin editor/smoke glue.
- WebSocket/browser/server details stay behind the Phase 25 adapter or smoke tooling boundaries.

Public claims:

- This phase can call the artifact an internal local RC baseline.
- This phase must not call it a public production release, real mobile certification, production multiplayer, hosted service, or commercial launch.

## 5. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Confirm Phase 26 final report is PASS and pushed.
3. Inspect current status, dirty files, tags, and relevant docs before editing.
4. Define the smallest coherent checkpoint.
5. Implement the checkpoint.
6. Run targeted checks first.
7. Run relevant validation.
8. Run smoke when release docs, demo script, validation profile, tag policy, or release claims depend on browser behavior.
9. Run Debug self-check.
10. Run architecture self-check.
11. Inspect status and diff.
12. Stage only Phase 26.5-relevant files.
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
- If commit succeeds but push fails, do not proceed.
- If tag creation or tag push fails, do not proceed to final PASS.
- If the target tag exists locally or remotely, do not overwrite it; report BLOCKED with exact tag evidence.
- If product feature work appears in the diff, remove it from Phase 26.5 scope.

Reusable self-checks for every round:

Debug self-check:

- Can the current change be explained by the smallest release workflow or demo workflow?
- Can failures be localized to docs, release notes, demo script, validation profile, tag policy, tag command, wrapper validation, smoke harness, perf report, git state, or user-facing release claims?
- Are success, failure, missing tag, existing tag, stale commit, dirty tree, CRLF checkout limitation, and generated-output states covered where relevant?
- If release claims changed, is the exact evidence cited?
- If a tag changed, was the no-overwrite rule followed?

Architecture self-check:

- Does `data/**/*.json` remain the source of truth for vertical-slice semantics?
- Did the phase avoid duplicating runtime, social, delivery, shader, LOD, world, event/action, camera, validation, or renderer semantics in release docs?
- Did the phase avoid production networking, auth, persistence, deployment, text/voice chat, new gameplay, mobile input implementation, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape, Runtime UI, Audio runtime, and broad engine expansion?
- Are unrelated files, generated outputs, and user changes left alone?
- Does Three.js remain inside `src/runtime/three/**` and accepted thin editor/smoke glue?

## 6. Commit Push And Tag Workflow

Use the repository wrappers for commits.

Status:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
```

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run perf:smoke
git diff --check
```

Commit and push with explicit Phase 26.5 paths:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "docs: package vertical slice rc baseline" -Paths docs\phase-26-5-rc-release-packaging-and-baseline-tagging-goal-mode-execution-guide.md,docs\phase-26-5-rc-release-packaging-and-baseline-tagging-final-report.md,docs\vertical-slice-rc-release-notes.md,docs\vertical-slice-rc-demo-script.md,docs\vertical-slice-rc-validation-evidence-index.md,docs\vertical-slice-rc-tag-policy.md,docs\development-plan.md,docs\post-mvp-execution-workflow.md,docs\abeto-messenger-development-plan.md,README.md,docs\developer-guide.md,docs\release-checklist.md
```

Adjust `-Paths` per round so only touched, phase-relevant files are staged. Do not use broad staging commands such as `git add .`.

Tag rules:

```powershell
git tag --list vertical-slice-rc-2026-06-22
git ls-remote --tags origin vertical-slice-rc-2026-06-22
git tag -a vertical-slice-rc-2026-06-22 -m "Sinan vertical slice internal RC baseline 2026-06-22"
git push origin vertical-slice-rc-2026-06-22
```

Run the first two commands before creating the tag. If either command shows an existing tag, stop and report BLOCKED.

## 7. Round Budget

Total: 6 rounds.

- Main packaging and documentation: rounds 26.5.1 through 26.5.3.
- Buffer fix: round 26.5.4.
- Tag and integrated release gate: round 26.5.5.
- Final validation and handoff: round 26.5.6.

This phase is intentionally narrow. It should not turn into a product implementation phase.

## 8. Round Plan

### Round 26.5.1: Release Scope And Tag Policy

Goal:

- Lock the RC packaging scope and internal tag policy.

Work:

- Confirm Phase 26 PASS baseline at `95b290e`.
- Inspect local and remote tag state for `vertical-slice-rc-2026-06-22`.
- Create `docs/vertical-slice-rc-tag-policy.md`.
- Record no-overwrite, no-force-push, retagging, and conflict behavior.
- Update roadmap entry points to mark Phase 26.5 as the active packaging guide.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
git tag --list vertical-slice-rc-2026-06-22
git ls-remote --tags origin vertical-slice-rc-2026-06-22
rg "Phase 26.5|vertical-slice-rc-2026-06-22|tag policy|no-overwrite" docs
git diff --check
```

Expected commit:

```txt
docs: lock vertical slice rc tag policy
```

### Round 26.5.2: Release Notes And Demo Script

Goal:

- Add user-facing internal RC release notes and a local demo script.

Work:

- Create `docs/vertical-slice-rc-release-notes.md`.
- Create `docs/vertical-slice-rc-demo-script.md`.
- Cover setup, validation, demo URL, Showcase delivery flow, social smoke evidence, low-end/mobile limitations, and known non-scope.
- Keep claims aligned with Phase 26 evidence.

Validation:

```powershell
rg "delivery|social|low-end|mobile|perf:smoke|Validate.cmd|Smoke.cmd|not production" docs\vertical-slice-rc-release-notes.md docs\vertical-slice-rc-demo-script.md
git diff --check
```

Expected commit:

```txt
docs: add vertical slice rc release notes
```

### Round 26.5.3: Validation Evidence Index

Goal:

- Make release evidence easy to find and rerun.

Work:

- Create `docs/vertical-slice-rc-validation-evidence-index.md`.
- Link Phase 26 final report, RC gate, release validation profile, asset report command, perf:smoke, smoke specs, release checklist, and known CRLF limitation.
- Update README/developer guide/release checklist only if they need a link to the new evidence index.

Validation:

```powershell
npm run perf:smoke
rg "Validate.cmd|Smoke.cmd|perf:smoke|report-assets|git diff --check|CRLF|LF checkout" docs\vertical-slice-rc-validation-evidence-index.md README.md docs\developer-guide.md docs\release-checklist.md
git diff --check
```

Expected commit:

```txt
docs: index vertical slice rc validation evidence
```

### Round 26.5.4: Buffer Fix Round

Goal:

- Fix packaging, docs, or validation evidence issues found by review.

Work:

- Use only for Phase 26.5 blockers.
- Focus on inconsistent docs, missing command evidence, stale baseline hashes, tag-policy ambiguity, or release-claim mismatch.
- Skip this round if no defects remain and record it as unused in the final report.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
git diff --check
```

Expected commit:

```txt
fix: stabilize vertical slice rc packaging
```

### Round 26.5.5: Integrated Release Gate And Tag

Goal:

- Run the integrated release gate and create the internal RC tag.

Work:

- Run full validation, smoke, perf:smoke, and whitespace checks.
- Confirm tracked worktree is clean after validation.
- Re-check local and remote tag absence.
- Create annotated tag `vertical-slice-rc-2026-06-22` on the final validated commit.
- Push the tag to `origin`.
- Record tag hash and push evidence.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run perf:smoke
git diff --check
git status --short --branch
git tag --list vertical-slice-rc-2026-06-22
git ls-remote --tags origin vertical-slice-rc-2026-06-22
```

Expected commit:

```txt
docs: verify vertical slice rc release gate
```

Tag:

```txt
vertical-slice-rc-2026-06-22
```

### Round 26.5.6: Final Validation And Handoff

Goal:

- Close Phase 26.5 with final docs, validation, tag evidence, and next decision guidance.

Work:

- Create `docs/phase-26-5-rc-release-packaging-and-baseline-tagging-final-report.md`.
- Update roadmap entry points with Phase 26.5 PASS and next decision guidance.
- Confirm all Phase 26.5 commits and the tag are pushed.
- Record that the next product line is not automatic and should be selected separately.
- Recommended next decision after this phase: mobile/input experience vs content expansion.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run perf:smoke
rg "Phase 26.5|vertical-slice-rc-2026-06-22|release notes|demo script|validation evidence|mobile/input|content expansion" docs README.md
git diff --check
git status --short --branch
git ls-remote --tags origin vertical-slice-rc-2026-06-22
```

Expected commit:

```txt
docs: finalize vertical slice rc packaging
```

## 9. PASS Criteria

Phase 26.5 is PASS only when all of these are true:

- Phase 26 final report is PASS and pushed.
- Release notes exist and accurately describe the internal RC.
- Demo script exists and accurately describes the local demo flow.
- Validation evidence index exists and links the command/report evidence needed to rerun the RC gate.
- Tag policy exists and records the no-overwrite rule.
- `Validate.cmd` passes.
- `Smoke.cmd` passes.
- `npm run perf:smoke` passes.
- `git diff --check` passes.
- The annotated git tag `vertical-slice-rc-2026-06-22` exists locally and on `origin`.
- The tag points at the final validated Phase 26.5 commit.
- No production backend, auth, persistence, deployment automation, text/voice chat, new gameplay, mobile input implementation, Physics/Rapier, external adapters, Runtime UI, Audio runtime, or broad engine expansion is introduced.
- All Phase 26.5 commits and the tag are pushed.
- Tracked worktree is clean after final validation and push.
- Phase 26.5 final report exists.

## 10. Validation Matrix

| Area | Required validation |
| --- | --- |
| Release notes | Docs link to Phase 26 evidence and do not overclaim public production readiness |
| Demo script | Local demo flow is runnable and aligned with current README/developer guide |
| Evidence index | Links validation profile, RC gate, final report, release checklist, smoke, perf, asset report, and CRLF limitation |
| Tag policy | Documents exact tag, no-overwrite behavior, conflict handling, and pushed tag evidence |
| Full validation | `Validate.cmd` passes |
| Browser smoke | `Smoke.cmd` passes 30/30 |
| Budget report | `npm run perf:smoke` passes |
| Whitespace | `git diff --check` passes |
| Git state | Tracked status clean; unrelated untracked files left alone |
| Tag | Local and remote annotated tag exists and points at final validated commit |

## 11. Final Report Template

Create `docs/phase-26-5-rc-release-packaging-and-baseline-tagging-final-report.md` using this structure:

```markdown
# Phase 26.5 RC Release Packaging And Baseline Tagging Final Report

Date: <date>

## Status

PASS or BLOCKED.

## Completed

- ...

## Release Package

- Release notes:
- Demo script:
- Validation evidence index:
- Tag policy:

## Tag Evidence

- Tag:
- Local tag check:
- Remote tag check:
- Target commit:
- Push result:

## Validation

- Validate.cmd:
- Smoke.cmd:
- perf:smoke:
- report-assets:
- git diff --check:
- status:

## Commits And Push

- `<hash>` <message> pushed to `<remote>/<branch>`

## Buffer

Consumed or not consumed. Explain why.

## Known Limitations

- ...

## Remaining Blockers

None, or list blockers.

## Recommended Next Decision

Choose the next product line after this packaged RC baseline. Recommended candidates: mobile/input experience or content expansion. Production backend/auth/persistence/text/voice chat/Physics/Rapier/external adapters/Runtime UI/Audio/deployment require separate scoped guides.
```

## 12. Post-Phase 26.5 Handoff Notes

After Phase 26.5 passes, Sinan should have:

- A validated internal vertical-slice RC tag.
- Release notes and a demo script for the local RC.
- A validation evidence index for repeatable acceptance.
- Clear limits around local/mobile evidence and non-production multiplayer.

The next product phase should be chosen separately. The planner recommendation remains:

- If the next goal is stronger playability, choose mobile/input experience.
- If the next goal is a better demo, choose content expansion.
- If the next goal is production platform work, write a separate scoped guide before backend/auth/persistence/deployment work starts.
