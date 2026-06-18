# Phase 15 Abeto Scope Lock Goal Mode Execution Guide

Date: 2026-06-18
Status: Guide for an executor running Phase 15 in goal mode.

Phase 15 is a planning and handoff phase. It must lock the Abeto Messenger-like vertical-slice scope before implementation work starts in Phase 16.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 15 for Sinan: Abeto Scope Lock. Read AGENTS.md, docs/abeto-messenger-development-plan.md, docs/abeto-messenger-gap-closure-plan.md, docs/post-mvp-development-plan.md, docs/post-mvp-execution-workflow.md, docs/development-plan.md, and the architecture guide referenced in AGENTS.md. Confirm current Phase 14/release-candidate status, preserve unrelated worktree changes, create or update clean UTF-8 planning docs for the Abeto Messenger-like vertical slice, lock the Phase 16-22 scope and budgets, update project entry points, run documentation validation, commit and push each completed round, and report commit hashes and validation results. Do not implement runtime, UI, shader, gameplay, multiplayer, or asset compression code in Phase 15.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/abeto-messenger-gap-closure-plan.md`
- `docs/post-mvp-development-plan.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/development-plan.md`
- `docs/release-checklist.md`
- The architecture guide referenced in `AGENTS.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Also inspect:

- `git status --short --branch`
- `git log --oneline --decorate --max-count=20`
- `git diff --stat`
- `git ls-files --others --exclude-standard`

Current known context:

- Phase 8-13 have functional validation evidence.
- Phase 14 was finalized and pushed in commit `104a404`; `docs/phase-14-release-candidate-finalization.md` records the release-candidate evidence.
- `docs/abeto-messenger-gap-closure-plan.md` exists as source input but appears to contain damaged Chinese text encoding.
- There may be unrelated untracked files and UI/UX work in the worktree. Do not stage them unless they are explicitly part of Phase 15.

## 2. What This Phase Must Complete

Phase 15 must:

- Confirm whether Phase 14 is cleanly accepted, partially accepted, or blocked by current worktree state.
- Preserve the original gap plan while creating clean readable roadmap and handoff docs.
- Lock the Abeto Messenger-like vertical-slice scope.
- Lock explicit non-goals, especially avoiding a massive open world, generic engine work, and early multiplayer complexity.
- Lock performance budgets for desktop and mobile.
- Lock Phase 16-22 names, goals, estimated rounds, and phase gates.
- Define the initial schema and system inventory expected by Phase 16-22.
- Update main documentation entry points so the next executor knows what to read.
- Prepare a short Phase 16 handoff prompt.

## 3. What This Phase Must Not Do

Do not:

- Implement render style, shader, material, outline, LOD, instancing, world projection, gameplay, or multiplayer code.
- Rewrite unrelated editor UI/UX changes.
- Stage unrelated untracked files, screenshots, PDFs, temporary files, or generated outputs.
- Treat the garbled source gap document as disposable. Preserve it and create clean derived docs.
- Move to Phase 16 before Phase 15 docs validate, commit, and push.
- Claim Phase 14 is accepted unless the release checklist and clean working tree criteria are satisfied or the user explicitly waives them.

## 4. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read the Phase 15 scope in this guide.
2. Inspect relevant files before editing.
3. Identify the smallest coherent checkpoint for the round.
4. Make only Phase 15 documentation or workflow edits.
5. Run the required validation for the round.
6. Run Debug self-check.
7. Run architecture self-check.
8. Inspect `git status --short --branch` and `git diff --stat`.
9. Stage only Phase 15 files.
10. Commit and push after validation passes.
11. Report commit hash, push result, validation result, and whether a buffer round was consumed.

## 5. Commit And Push Gate

Prefer the repository git workflow wrappers when available.

Minimum manual fallback:

```powershell
git status --short --branch
git diff --stat
git add docs/abeto-messenger-development-plan.md docs/phase-15-abeto-scope-lock-goal-mode-execution-guide.md docs/post-mvp-development-plan.md docs/post-mvp-execution-workflow.md docs/development-plan.md
git commit -m "docs: lock abeto messenger scope"
git push
git status --short --branch
```

Do not use broad staging commands such as `git add .`.

A round is not complete unless:

- Relevant validation passes.
- The commit succeeds.
- Push succeeds.
- The round summary includes the commit hash and remote branch.

If validation, commit, or push fails, do not proceed to the next round.

## 6. Round Budget

Total: 4 rounds.

- Main work: rounds 15.1 and 15.2.
- Buffer fixes: round 15.3.
- Final validation and handoff: round 15.4.

This is larger than a simple documentation pass because the current source gap document has encoding issues and the roadmap must be synchronized across multiple entry points.

### Round 15.1: Baseline, Encoding, And Scope Brief

Goal:

- Confirm current Phase 14 status and create the clean Abeto scope brief if it does not already exist.

Work:

- Inspect current git status, recent commits, and untracked files.
- Read the gap closure plan and identify usable technical content despite encoding damage.
- Ensure `docs/abeto-messenger-development-plan.md` exists and clearly states product target, non-goals, baseline, budgets, and phase summary.
- Add a short note that the original gap closure plan is source input but not the clean executor entry point.

Validation:

```powershell
git diff --check
rg "abeto-messenger-development-plan" docs
```

Debug self-check:

- Can the scope be explained without relying on the garbled source text?
- Are Phase 14 status and dirty worktree blockers explicitly recorded?
- Are unrelated untracked files left untouched?

Architecture self-check:

- Does the plan keep data as source of truth?
- Does the plan keep Three.js in `src/runtime/three/**`?
- Does the plan avoid pulling Phase 16 implementation into Phase 15?

### Round 15.2: Entry Point Sync And Phase 16 Handoff

Goal:

- Make the roadmap discoverable from existing planning docs and prepare the next implementation handoff.

Work:

- Update `docs/post-mvp-development-plan.md` with a concise pointer to the Abeto Messenger-like route after Phase 14.
- Update `docs/development-plan.md` with the same pointer under the post-MVP section.
- Add or update a short "Recommended next guide" section that points to this Phase 15 guide and identifies Phase 16 as the next implementation phase.
- Ensure the next executor knows to read the architecture guide and `AGENTS.md`.

Validation:

```powershell
git diff --check
rg "phase-15-abeto-scope-lock-goal-mode-execution-guide|abeto-messenger-development-plan" docs/development-plan.md docs/post-mvp-development-plan.md docs/post-mvp-execution-workflow.md docs/abeto-messenger-development-plan.md
```

Debug self-check:

- Can a new executor find the correct next document from the main docs?
- Are there conflicting Phase 15 meanings left unresolved?
- Is Phase 16 clearly not started yet?

Architecture self-check:

- Do docs preserve the current boundaries and validation requirements?
- Are optional multiplayer tasks still deferred until after the single-player Showcase path?
- Are unrelated UI/UX handoff files untouched?

### Round 15.3: Buffer Fix Round

Goal:

- Fix validation, link, scope, or handoff problems found in rounds 15.1-15.2.

Use this round only if needed.

Allowed fixes:

- Broken links.
- Missing required reading.
- Conflicting phase names.
- Missing budget or non-goal statements.
- Unclear Phase 14/Phase 16 transition.
- Documentation formatting or whitespace issues.

Validation:

```powershell
git diff --check
rg "Phase 16|Stylized Runtime Foundation|Abeto Scope Lock" docs
```

Debug self-check:

- What specific issue consumed the buffer?
- Is the issue fully fixed or only documented?
- Did the fix avoid scope creep?

Architecture self-check:

- Did the buffer avoid code changes?
- Did the buffer avoid staging unrelated files?
- Are future runtime/editor boundaries still explicit?

### Round 15.4: Final Validation And Handoff

Goal:

- Produce a final Phase 15 status report and ensure the next phase can start safely.

Work:

- Run final doc validation.
- Confirm expected docs link to each other.
- Confirm no unrelated files are staged.
- Write the final report using the template below.
- If Phase 14 is still not accepted, mark Phase 16 as blocked until the user accepts starting despite that status.

Validation:

```powershell
git diff --check
git status --short --branch
rg "abeto-messenger-development-plan|phase-15-abeto-scope-lock-goal-mode-execution-guide" docs
```

Optional docs-only structure check:

```powershell
npm run validate-data
```

Debug self-check:

- Can the final report show exactly what changed and why?
- Are validation failures absent or explicitly explained?
- Is the next Phase 16 prompt ready?

Architecture self-check:

- Does Phase 16 have a clean boundary and acceptance criteria?
- Are performance budgets part of the gate?
- Is no implementation scope smuggled into Phase 15?

## 7. PASS Criteria

Phase 15 passes only when:

- `docs/abeto-messenger-development-plan.md` is readable and current.
- This Phase 15 goal guide exists and has a clear round budget.
- Main entry docs point to the Abeto roadmap and Phase 15 guide.
- Phase 14 status is explicitly recorded as accepted, partially accepted, blocked, or waived.
- Phase 16 is defined as the next implementation phase.
- `git diff --check` passes.
- Relevant link checks pass.
- Phase-relevant files are committed and pushed.
- The final report includes validation results, commit hashes, push results, and any remaining blockers.

## 8. Final Report Template

Use this format:

```txt
Phase 15 Final Report

Status:
- PASS / BLOCKED

Phase 14 status:
- accepted / partial / blocked / waived

Completed:
- ...

Docs updated:
- ...

Validation:
- git diff --check: pass/fail
- link grep: pass/fail
- optional validate-data: pass/fail/not run

Commits and push:
- <hash> <message> pushed to <remote>/<branch>

Buffer:
- consumed / not consumed
- reason if consumed

Remaining blockers:
- ...

Recommended next goal:
Complete Phase 16 from docs/abeto-messenger-development-plan.md: Stylized Runtime Foundation.
```
