# Phase 21.5 Engine Maturity And External Infrastructure Contract Gate Goal Mode Execution Guide

Date: 2026-06-21
Status: Guide for an executor running Phase 21.5 in goal mode.

Phase 21.5 starts after Phase 21 Shader Production Quality Gate is PASS and pushed. The current accepted baseline is `9fc69a2 docs: finalize phase 21 shader production quality gate` on `main` / `origin/main`. Its job is to convert the external infrastructure strategy and mature-engine gap analysis into actionable Sinan-owned contracts before Phase 22 LOD/Instancing, Phase 23 spherical world/input/camera/physics work, and Phase 24 runtime UI/gameplay work begin.

This phase is an architecture and planning gate. It must not implement runtime integrations, install external dependencies, replace loaders, migrate physics, add gameplay input, add Runtime UI, or start Inscape integration. It creates the Sinan-owned RFCs, POC briefs, adapter boundary rules, compatibility matrix, and evaluation templates that future phases will use.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 21.5 for Sinan: Engine Maturity And External Infrastructure Contract Gate. Start only after Phase 21 Shader Production Quality Gate is PASS and pushed. Read AGENTS.md, docs/development-plan.md, docs/abeto-messenger-development-plan.md, docs/strategy/external-infrastructure-cooperation-strategic-decision.md, docs/strategy/notice-technical-architecture-department-external-infrastructure-cooperation.md, docs/strategy/engine-maturity-gap-and-sourcing-strategy.md, docs/external-project-cooperation-evaluation.md, docs/external-infrastructure-partnership-assessment.md, docs/rfcs/rfc-001-sinan-asset-boundary.md, docs/rfcs/rfc-002-sinan-input-context.md, docs/rfcs/rfc-003-sinan-runtime-ui-viewmodel.md, docs/rfcs/rfc-004-sinan-camera-pose-shot-rig-boundary.md, the Phase 20 and Phase 21 final reports, docs/post-mvp-execution-workflow.md, docs/developer-guide.md, docs/Sinan_Scene_Director_研发方案与架构指南.md, .codex/project-ops-workflow.json, and .codex/project-git-workflow.json. Implement only the Phase 21.5 contract gate: update and accept RFC-001 through RFC-004 if needed; add RFC-005 Narrative/Inscape Bridge Boundary; add RFC-006 Physics Adapter Boundary; add RFC-007 Audio System Boundary; create partner POC brief templates; create mature dependency evaluation and compatibility matrix templates; define adapter directory and import-boundary policy for assets/input/camera/ui/physics/audio/narrative; update roadmap entry points and a final Phase 21.5 report. Do not add external dependencies, do not implement Indirection/InputFlow/ViewRig/LudoWeave/Inscape adapters, do not add runtime Physics/Input/UI/Audio systems, do not change Three runtime behavior, do not start Phase 22 LOD/Instancing, and do not stage unrelated current workspace changes. Every round must run Debug self-check, architecture self-check, validation, commit, and push before proceeding.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `docs/development-plan.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/strategy/external-infrastructure-cooperation-strategic-decision.md`
- `docs/strategy/notice-technical-architecture-department-external-infrastructure-cooperation.md`
- `docs/strategy/engine-maturity-gap-and-sourcing-strategy.md`
- `docs/external-project-cooperation-evaluation.md`
- `docs/external-infrastructure-partnership-assessment.md`
- `docs/rfcs/rfc-001-sinan-asset-boundary.md`
- `docs/rfcs/rfc-002-sinan-input-context.md`
- `docs/rfcs/rfc-003-sinan-runtime-ui-viewmodel.md`
- `docs/rfcs/rfc-004-sinan-camera-pose-shot-rig-boundary.md`
- `docs/phase-20-shader-globals-and-postprocessing-ramp-final-report.md`
- `docs/phase-21-shader-production-quality-gate-final-report.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/developer-guide.md`
- `docs/Sinan_Scene_Director_研发方案与架构指南.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Inspect these areas before changing them:

- `docs/rfcs/**`
- `docs/strategy/**`
- `docs/external-projects/**`
- `docs/abeto-messenger-development-plan.md`
- `docs/development-plan.md`
- `scripts/check-boundaries.ts`
- `src/engine/**`
- `src/world/**`
- `src/runtime/WebRuntime.ts`
- `src/runtime/three/**`
- `src/events/**`
- `src/director/**`
- `src/data/ReferenceResolver.ts`
- `src/schemas/**`

Current known context:

- Phase 18.5 established `EngineSession`, `EngineLoop`, minimal `World`, and `EditorSessionBridge`.
- Phase 19 proved production shader material, material timeline, material action, and Material Inspector MVP.
- Phase 20 is PASS and pushed. It completed shader globals, the second production material, lifecycle diagnostics, postprocessing runtime, and the public `cinematic.vignette` contract.
- Phase 21 is PASS and pushed. It completed shader compile coverage, compact visual regression fixtures, structured fallback diagnostics, HMR/precompile guidance, low-end Chromium baseline, and the integrated shader production quality guard.
- Sinan has approved the strategy: `Sinan owns contracts. Partners own specialized implementations. POCs prove value. Validation protects boundaries. Successful adapters become optional first-party integrations.`
- RFC-001 through RFC-004 already cover Indirection, InputFlow, LudoWeave, and ViewRig at draft level.
- Inscape, Physics, and Audio do not yet have dedicated Sinan-owned RFCs.
- Existing unrelated dirty or untracked files may be present. Do not stage unrelated external docs, generated artifacts, screenshots, package experiments, or user changes.

## 2. What This Phase Must Complete

Phase 21.5 must complete:

- Review and, if necessary, update RFC-001 through RFC-004 so their status, acceptance language, POC sequence, adapter ownership, fallback expectations, and validation requirements match the approved external infrastructure strategy.
- Add `docs/rfcs/rfc-005-sinan-narrative-inscape-bridge-boundary.md`.
- Add `docs/rfcs/rfc-006-sinan-physics-adapter-boundary.md`.
- Add `docs/rfcs/rfc-007-sinan-audio-system-boundary.md`.
- Add a Sinan-owned adapter boundary policy document that defines allowed adapter directories and dependency/import rules for:
  - `src/assets/adapters/**`
  - `src/input/adapters/**`
  - `src/camera/adapters/**`
  - `src/ui/adapters/**`
  - `src/physics/adapters/**`
  - `src/audio/adapters/**`
  - `src/narrative/adapters/**`
- Add partner POC brief templates for Indirection, InputFlow, ViewRig, LudoWeave, and Inscape.
- Add mature dependency evaluation template for Physics, Audio, Multiplayer-lite, CRDT collaboration, and asset-format/toolchain candidates.
- Add a compatibility matrix template for future official adapters.
- Add a boundary-check planning note describing how `scripts/check-boundaries.ts` should eventually enforce external dependency isolation when adapter directories are introduced.
- Update roadmap entry points so Phase 21.5 is visible between Phase 21 and Phase 22.
- Create `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md` with validation, docs changed, final decisions, remaining open questions, and Phase 22 handoff.

## 3. What This Phase Must Not Do

Do not:

- Install Indirection, InputFlow, ViewRig, LudoWeave, Inscape, Rapier, howler.js, Colyseus, Yjs, Babylon.js, or any other external runtime dependency.
- Implement `src/assets/**`, `src/input/**`, `src/camera/**`, `src/ui/**`, `src/physics/**`, `src/audio/**`, or `src/narrative/**` runtime systems beyond documentation and boundary planning.
- Add placeholder source directories only to satisfy future architecture diagrams.
- Replace `ThreeAssetLoader`, `WebRuntime`, `ThreeRuntime`, `CameraShotPlayer`, `DirectorCameraSystem`, `ActionSystem`, `TimelinePlayer`, or editor command/save/undo flows.
- Add real Indirection/InputFlow/ViewRig/LudoWeave/Inscape adapters.
- Add Physics runtime, Audio runtime, player controller, gameplay camera, Runtime UI, narrative importer, LOD, instancing, vegetation, spherical world, delivery jobs, or multiplayer.
- Change existing data schemas unless a documentation-only RFC explicitly records a future schema proposal. If code/schema changes look necessary, defer them to the implementation phase.
- Add broad runtime boundary checks that fail current code without an agreed migration path.
- Use external project documents as execution authority. All accepted decisions must be written into Sinan-owned docs.
- Stage unrelated untracked files, external project docs, generated outputs, screenshots, or user changes.

## 4. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Inspect current files before editing.
3. Define the smallest coherent documentation checkpoint.
4. Write or update the checkpoint.
5. Run documentation-focused validation.
6. Run broader project validation only when docs reference commands, scripts, or source boundaries that need proof.
7. Run Debug self-check.
8. Run architecture self-check.
9. Inspect `git status --short --branch` and `git diff --stat`.
10. Stage only Phase 21.5-relevant files.
11. Commit and push before starting the next round.
12. Report commit hash, push result, validation result, and buffer usage.

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
- If the guide references a missing Phase 20 or Phase 21 final report, stop and confirm that the previous phases are actually PASS before starting Phase 21.5 work.
- If validation is blocked by unrelated dirty files, isolate the blocker, report it clearly, and do not stage unrelated fixes.
- If commit fails, do not proceed.
- If push fails, do not proceed.
- If any proposed RFC appears to require runtime implementation, split the runtime work into a future phase and keep this phase at contract level.
- If generated artifacts appear, keep them out of commits unless explicitly named as source documentation.

## 5. Commit And Push Workflow

Use the repository wrappers.

Status:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
```

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

Commit and push with explicit Phase 21.5 paths:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "docs: add phase 21.5 contract gate rfcs" -Paths docs\rfcs,docs\strategy,docs\phase-21-5-engine-maturity-external-infrastructure-contract-gate-goal-mode-execution-guide.md,docs\abeto-messenger-development-plan.md,docs\development-plan.md
```

Do not use broad staging commands such as `git add .`.

## 6. Round Budget

Total: 6 rounds.

- Main documentation and architecture rounds: rounds 21.5.1 through 21.5.4.
- Buffer fixes: round 21.5.5.
- Final validation and handoff: round 21.5.6.

This is shorter than a 16-round implementation phase because Phase 21.5 is a contract gate. If the executor discovers that the phase requires actual runtime implementation, external dependency installation, or broad source refactoring, stop and report the scope expansion instead of silently consuming Phase 22-24 work.

### Round 21.5.1: Baseline Audit And Contract Gate Scope Lock

Goal:

- Confirm the post-Phase 21 baseline and lock Phase 21.5 as a contract-only architecture gate.

Work:

- Confirm Phase 20 and Phase 21 final reports are PASS and pushed.
- Inspect current docs, RFCs, strategy docs, boundary checker, and roadmap entry points.
- Create or update `docs/strategy/engine-maturity-gap-and-sourcing-strategy.md` only if it needs to reflect post-Phase 21 reality.
- Create a short Phase 21.5 scope lock note inside the goal guide or a dedicated phase doc if needed.
- Decide exact names and scope for RFC-005, RFC-006, RFC-007.
- Do not edit runtime source.

Validation:

```powershell
git diff --check -- docs
rg "Phase 21.5|Engine Maturity|External Infrastructure|RFC-005|RFC-006|RFC-007" docs
```

Debug self-check:

- Can Phase 21.5 be explained as the smallest gate needed before Phase 22-24 start depending on assets, input, camera, UI, physics, audio, and narrative?
- Can future failures be localized to missing contracts, missing POC briefs, missing compatibility matrix, missing adapter policy, or missing dependency evaluation?
- Are success, missing previous final report, stale strategy docs, incompatible RFC language, and unrelated dirty files handled?

Architecture self-check:

- Does this round preserve Sinan data/source-of-truth ownership?
- Does it avoid introducing implementation or dependencies?
- Does it keep external project documents as reference material, not execution authority?
- Are unrelated files and user changes left alone?

Expected commit:

```txt
docs: lock phase 21.5 contract gate scope
```

### Round 21.5.2: RFC-005 Narrative, RFC-006 Physics, And RFC-007 Audio

Goal:

- Add the missing Sinan-owned RFCs for Inscape/narrative, physics adapter boundary, and audio system boundary.

Work:

- Add `docs/rfcs/rfc-005-sinan-narrative-inscape-bridge-boundary.md`.
- Add `docs/rfcs/rfc-006-sinan-physics-adapter-boundary.md`.
- Add `docs/rfcs/rfc-007-sinan-audio-system-boundary.md`.
- Each RFC must include summary, background, goals, non-goals, source-of-truth, core concepts, adapter boundary, POC plan, validation criteria, rejected approaches, and open questions.
- RFC-005 must position Inscape as external narrative authoring pipeline and importer/Host Bridge partner, not Sinan engine core.
- RFC-006 must position mature physics libraries as adapter implementations, while Sinan owns collider schema, collision layers, triggers, world queries, gameplay policy, and fallback.
- RFC-007 must position Web Audio or mature audio libraries as adapter implementations, while Sinan owns AudioCue schema, mixer policy, timeline sync, browser unlock policy, diagnostics, and fallback.
- Review RFC-001 through RFC-004 for inconsistent status or language, but keep edits minimal.

Validation:

```powershell
git diff --check -- docs/rfcs
rg "Source Of Truth|POC Plan|验收|Non-goals|adapter|fallback" docs/rfcs/rfc-005-sinan-narrative-inscape-bridge-boundary.md docs/rfcs/rfc-006-sinan-physics-adapter-boundary.md docs/rfcs/rfc-007-sinan-audio-system-boundary.md
```

Debug self-check:

- Can each RFC explain the smallest future POC and its failure states?
- Can future integration failures be localized to schema, importer/dry-run, adapter, runtime bridge, diagnostics, or fallback?
- Are success, missing host schema, missing collider/audio asset, incompatible external version, missing backend, and fallback states covered or explicitly deferred?

Architecture self-check:

- Does each RFC preserve Sinan source-of-truth?
- Do mature or early external projects stay behind adapter/importer boundaries?
- Do RFCs avoid runtime implementation details that belong to later phases?
- Are capability schema, binding/mapping, usage/audit, and runtime state separated?

Expected commit:

```txt
docs: add narrative physics audio boundary rfcs
```

### Round 21.5.3: Adapter Boundary Policy And Evaluation Templates

Goal:

- Create reusable policies and templates for future partner POCs and mature dependency evaluations.

Work:

- Add `docs/strategy/adapter-boundary-policy.md` or equivalent.
- Define allowed future adapter subtrees and import rules for assets, input, camera, UI, physics, audio, and narrative.
- Add `docs/strategy/external-partner-poc-brief-template.md`.
- Add `docs/strategy/mature-dependency-evaluation-template.md`.
- Add `docs/strategy/adapter-compatibility-matrix-template.md`.
- Add a boundary-check planning section that explains how `scripts/check-boundaries.ts` should later enforce external dependency isolation without breaking current code.
- Do not add source adapter directories or dependency installs.

Validation:

```powershell
git diff --check -- docs/strategy
rg "src/assets/adapters|src/input/adapters|src/camera/adapters|src/ui/adapters|src/physics/adapters|src/audio/adapters|src/narrative/adapters" docs/strategy
rg "license|bundle|browser support|fallback|compatibility|contract tests|dry-run|smoke" docs/strategy
```

Debug self-check:

- Can a future executor use the templates without guessing what to validate?
- Can dependency evaluation failures be localized to license, bundle size, browser support, maintenance, API fit, adapter boundary, fallback, or validation?
- Are partner POC states such as not started, draft, running, failed, accepted, deprecated, and replaced represented?

Architecture self-check:

- Does the adapter policy keep external dependencies out of semantic core?
- Does the policy avoid prematurely creating implementation directories or hard dependencies?
- Do templates require Sinan-owned acceptance docs rather than external docs as authority?
- Are unrelated files and generated outputs left alone?

Expected commit:

```txt
docs: define adapter boundary and evaluation templates
```

### Round 21.5.4: Roadmap Integration And POC Sequencing

Goal:

- Make Phase 21.5 visible from project entry points and sequence future POCs without turning them into hard dependencies.

Work:

- Update `docs/abeto-messenger-development-plan.md` to include Phase 21.5 between Phase 21 and Phase 22.
- Update `docs/development-plan.md` to mention the Phase 21.5 guide and its role after Phase 21.
- Add or update a short POC sequencing document if the templates need concrete first uses:
  - Indirection manifest report POC before Phase 22 asset backend work.
  - InputFlow replay POC before Phase 23 gameplay input.
  - ViewRig pose solver spike before Phase 23 gameplay/spherical camera.
  - LudoWeave headless Prompt/Subtitle POC before Phase 24 Runtime UI.
  - Inscape dry-run importer after Runtime UI/gameplay foundations are clearer.
  - Physics adapter spike before character controller work.
  - AudioSystem facade before delivery gameplay sound/UI polish.
- Confirm Phase 22 remains the next implementation phase after Phase 21.5 PASS.

Validation:

```powershell
git diff --check -- docs
rg "Phase 21.5|Engine Maturity And External Infrastructure Contract Gate|phase-21-5-engine-maturity-external-infrastructure-contract-gate-goal-mode-execution-guide" docs/development-plan.md docs/abeto-messenger-development-plan.md
```

Debug self-check:

- Can a future executor find Phase 21.5 from the main roadmap without reading this conversation?
- Can future POC sequencing failures be localized to missing RFC, missing template, missing adapter policy, or missing final report?
- Are POCs explicitly not hard dependencies until accepted?

Architecture self-check:

- Does the roadmap keep Phase 20/21 shader quality work intact?
- Does Phase 21.5 avoid stealing Phase 22-24 implementation scope?
- Do roadmap updates preserve current accepted phase reports and historical notes?
- Are unrelated docs left alone?

Expected commit:

```txt
docs: route roadmap through phase 21.5 contract gate
```

### Round 21.5.5: Buffer Fix Round

Goal:

- Fix documentation, consistency, validation, or architecture review issues found in rounds 21.5.1 through 21.5.4.

Work:

- Run targeted checks for failing docs or inconsistent terminology.
- Fix only Phase 21.5 issues.
- Do not add new RFCs or implementation unless a prior Phase 21.5 artifact is incomplete.
- If no blockers remain, skip this round and record it as unused in the final report.

Validation:

```powershell
git diff --check
rg "hard dependency|source-of-truth|adapter|fallback|contract tests|compatibility matrix" docs/rfcs docs/strategy docs/development-plan.md docs/abeto-messenger-development-plan.md
```

Debug self-check:

- Is each fix tied to a reproducible inconsistency or validation failure?
- Can the issue be localized to a specific RFC, template, roadmap entry, or final report draft?
- Did the fix avoid widening the phase?

Architecture self-check:

- Did fixes preserve Sinan ownership of contracts?
- Did no external implementation become required?
- Are unrelated files untouched?

Expected commit:

```txt
fix: stabilize phase 21.5 contract gate docs
```

### Round 21.5.6: Final Validation And Handoff

Goal:

- Close Phase 21.5 with validation, final report, and a clear Phase 22 handoff.

Work:

- Run docs-focused validation and the project validation wrapper if docs reference source boundary behavior.
- Run `git diff --check`.
- Confirm all Phase 21.5 commits are pushed.
- Review `git status --short --branch` and make sure unrelated dirty files are not staged.
- Create `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md`.
- The final report must include status, completed docs, decisions, validation, commits, push status, known limitations, open questions, and Phase 22 recommended next goal.

Validation:

```powershell
git diff --check
rg "Phase 21.5|RFC-005|RFC-006|RFC-007|adapter boundary|compatibility matrix|mature dependency" docs
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

Debug self-check:

- Can every unresolved issue be localized and listed before reporting PASS?
- Do the final docs tell future executors what to do first for Indirection, InputFlow, ViewRig, LudoWeave, Inscape, Physics, and Audio?
- Are empty, stale, incompatible, unaccepted, missing-backend, and fallback states covered by RFCs or templates?
- Does the final report match actual validation results and commit hashes?

Architecture self-check:

- Does Sinan remain contract owner?
- Are mature libraries and early partners behind adapter/importer boundaries?
- Did this phase avoid runtime implementation, dependency installation, and Phase 22+ feature work?
- Are unrelated files, generated outputs, and user changes left alone?

Expected commit:

```txt
docs: finalize phase 21.5 contract gate
```

## 7. PASS Criteria

Phase 21.5 is PASS only when all of these are true:

- Phase 20 and Phase 21 final reports are PASS and pushed before Phase 21.5 starts.
- RFC-001 through RFC-004 have been reviewed and remain consistent with approved strategy.
- RFC-005 Narrative / Inscape Bridge Boundary exists.
- RFC-006 Physics Adapter Boundary exists.
- RFC-007 Audio System Boundary exists.
- Adapter boundary policy exists and covers assets, input, camera, UI, physics, audio, and narrative.
- Partner POC brief template exists.
- Mature dependency evaluation template exists.
- Adapter compatibility matrix template exists.
- Roadmap entry points link to the Phase 21.5 guide and place Phase 21.5 between Phase 21 and Phase 22.
- Phase 21.5 final report exists.
- `git diff --check` passes.
- Documentation references are internally consistent.
- `Validate.cmd` passes or any failure is clearly documented as unrelated pre-existing state and approved before PASS.
- All Phase 21.5 commits are pushed to `origin/main`.

## 8. Validation Matrix

| Area | Required validation |
| --- | --- |
| RFC consistency | `rg` checks for RFC ids, source-of-truth, adapter, fallback, POC, validation sections |
| Roadmap visibility | `rg` checks in `docs/development-plan.md` and `docs/abeto-messenger-development-plan.md` |
| Adapter policy | `rg` checks for all future adapter paths and dependency isolation rules |
| POC template | Manual review plus `rg` for goal, scope, non-scope, fixtures, validation, fallback, PASS/BLOCKED |
| Mature dependency template | Manual review plus `rg` for license, bundle, browser support, maintenance, adapter, fallback |
| Compatibility matrix | Manual review plus fields for version, adapter owner, status, validation, fallback, deprecation |
| Docs hygiene | `git diff --check` |
| Full gate | `Validate.cmd` if source-aware docs or boundary references changed |

## 9. Final Report Template

Create `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md` using this structure:

```markdown
# Phase 21.5 Engine Maturity And External Infrastructure Contract Gate Final Report

Date: <date>

## Status

PASS or BLOCKED.

## Completed

- ...

## RFC Decisions

- RFC-001:
- RFC-002:
- RFC-003:
- RFC-004:
- RFC-005:
- RFC-006:
- RFC-007:

## Adapter Boundary Policy

- ...

## Templates

- Partner POC brief:
- Mature dependency evaluation:
- Compatibility matrix:

## Roadmap Updates

- ...

## Validation

- git diff --check:
- rg/link checks:
- Validate.cmd:

## Commits And Push

- `<hash>` <message> pushed to `<remote>/<branch>`

## Buffer

Consumed or not consumed. Explain why.

## Known Limitations

- ...

## Open Questions

- ...

## Remaining Blockers

None, or list blockers.

## Recommended Next Goal

Complete Phase 22 from docs/abeto-messenger-development-plan.md: LOD, Instancing, And Vegetation. Start only after Phase 21.5 is PASS and pushed. Phase 22 may prepare Indirection manifest report POC work only if RFC-001 and the compatibility/fallback gates remain satisfied; it must not make Indirection a hard dependency before POC acceptance.
```

## 10. Phase 22 Handoff Notes

After Phase 21.5 passes, Phase 22 should remain focused on LOD, Instancing, And Vegetation. The new contract-gate documents should guide, not derail, Phase 22:

- Indirection may be evaluated first through manifest report / catalog dry-run, not runtime loader replacement.
- Asset ids, manifest, ReferenceResolver, budget, fallback, and reports remain Sinan-owned.
- LOD and instancing data must stay source-of-truth JSON with schema and validation.
- Three `InstancedMesh`, GLTF, texture, and compression details remain under `src/runtime/three/**`.
- No InputFlow/ViewRig/LudoWeave/Inscape/Physics/Audio runtime implementation should be pulled into Phase 22 unless the Phase 22 guide explicitly expands scope and preserves the new boundaries.
