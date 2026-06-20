# Phase 21 Shader Production Quality Gate Goal Mode Execution Guide

Date: 2026-06-20
Status: Guide for an executor running Phase 21 in goal mode.

Phase 21 starts after the accepted and pushed Phase 20 Shader Globals And Postprocessing Ramp work. Its job is to turn the shader and postprocessing MVP into a reliable production-quality gate for future visual development and vertical-slice hardening.

Phase 21.5 already has a future external infrastructure contract-gate guide, but it is not the active execution entry. Phase 21.5 may only start after Phase 21 has a PASS final report and pushed commits.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 21 for Sinan: Shader Production Quality Gate. Read AGENTS.md, docs/development-plan.md, docs/abeto-messenger-development-plan.md, docs/phase-20-shader-globals-and-postprocessing-ramp-final-report.md, docs/phase-20-shader-globals-and-postprocessing-ramp-goal-mode-execution-guide.md, docs/phase-19-shader-dissolve-material-timeline-final-report.md, docs/phase-18-shader-glsl-material-runtime-foundation-final-report.md, docs/phase-18-5-engine-core-alignment-final-report.md, docs/engine-positioning-architecture-adjustment-plan.md, docs/Web3D_Shader_GLSL_MVP_支持度评估与实施计划.md, docs/Web3D_Shader_研发方案与架构指南_GLSL_MVP.md, docs/post-mvp-execution-workflow.md, docs/developer-guide.md, the main architecture guide, .codex/project-ops-workflow.json, and .codex/project-git-workflow.json. Implement Phase 21 only: expand browser compile coverage for all production shader materials and postprocess passes; add deterministic visual regression fixtures for demo-critical shader/material/postprocess paths; add structured shader error and fallback diagnostics that identify material id, shader stage, source path, browser/GPU context when available, and affected entity or slot when practical; document and harden the development HMR strategy so shader failures do not blank the editor; add precompile guidance for known production materials and passes; add a mobile or low-end shader performance baseline and documentation; update docs and the Phase 21 final report. Keep data as source of truth. Keep raw uniforms out of data, timeline, action, and editor contracts. Keep Three.js, shader compile details, postprocessing passes, and renderer counters inside src/runtime/three/** or test/smoke fixtures. Do not implement Phase 21.5 external infrastructure contracts, Phase 22 LOD/instancing/vegetation, input, physics, Runtime UI, audio, narrative, multiplayer, shader graph, TSL, WGSL, arbitrary onBeforeCompile patching, new gameplay scope, or package identity migration. Every round must run Debug self-check, architecture self-check, validation, commit, and push before proceeding.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `docs/development-plan.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/phase-20-shader-globals-and-postprocessing-ramp-final-report.md`
- `docs/phase-20-shader-globals-and-postprocessing-ramp-goal-mode-execution-guide.md`
- `docs/phase-20-shader-globals-and-postprocessing-ramp.md`
- `docs/phase-19-shader-dissolve-material-timeline-final-report.md`
- `docs/phase-19-shader-dissolve-material-timeline-goal-mode-execution-guide.md`
- `docs/phase-18-shader-glsl-material-runtime-foundation-final-report.md`
- `docs/phase-18-shader-glsl-material-runtime-foundation-goal-mode-execution-guide.md`
- `docs/phase-18-5-engine-core-alignment-final-report.md`
- `docs/phase-18-5-engine-core-alignment-goal-mode-execution-guide.md`
- `docs/engine-positioning-architecture-adjustment-plan.md`
- `docs/Web3D_Shader_GLSL_MVP_支持度评估与实施计划.md`
- `docs/Web3D_Shader_研发方案与架构指南_GLSL_MVP.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/developer-guide.md`
- `docs/Sinan_Scene_Director_研发方案与架构指南.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Inspect these implementation areas before changing them:

- `src/runtime/materials/**`
- `src/runtime/postprocess/**`
- `src/runtime/three/materials/**`
- `src/runtime/three/**`
- `src/runtime/WebRuntime.ts`
- `src/runtime/RuntimeTypes.ts`
- `src/engine/EngineSession.ts`
- `src/engine/EngineLoop.ts`
- `src/shaders/**`
- `src/schemas/material.schema.ts`
- `src/schemas/timeline.schema.ts`
- `src/schemas/action.schema.ts`
- `src/data/ReferenceResolver.ts`
- `src/editor/panels/MaterialInspector.tsx`
- `tests/smoke/shader-material.spec.ts`
- `tests/smoke/shaderCompileFixture.ts`
- `tests/smoke/editor.spec.ts`
- `data/levels/**`
- `data/prefabs/**`
- `data/timelines/**`
- `data/events/**`

Current accepted baseline:

- Phase 18 is PASS and created renderer-neutral material contracts, `.glsl?raw` import support, Three `ShaderMaterial` factory/runtime/fallback support, and Chromium shader compile smoke.
- Phase 18.5 is PASS and moved runtime orchestration behind `EngineSession`, `EngineLoop`, minimal `World`, and `EditorSessionBridge`.
- Phase 19 is PASS and added `story.gate-dissolve`, `material.parameter`, `material.setParameter`, Material Inspector MVP, and smoke evidence that public material parameters affect visible output.
- Phase 20 is PASS and added renderer-neutral `ShaderGlobals`, engine/runtime global routing, `story.hologram-scanline`, material lifecycle/resource diagnostics, `ThreePostProcessRuntime`, `cinematic.vignette`, and smoke evidence for shader globals, lifecycle counters, and vignette pixels.
- Phase 20 final report says Phase 21 is the next goal. Confirm that report is committed and pushed before implementation.
- Existing unrelated dirty or untracked files may be present. Do not stage external infrastructure docs, generated screenshots, temporary folders, package identity experiments, or unrelated user changes.

## 2. What This Phase Must Complete

Phase 21 must complete:

- Browser compile coverage for every production shader material and postprocess pass that exists after Phase 20.
- A deterministic shader/postprocess visual regression fixture strategy for demo-critical paths, including stable camera, geometry, viewport, time, globals, parameters, and tolerance rules.
- Visual regression coverage for at least the production dissolve material, production hologram/scanline material, and the first postprocess output path.
- Structured shader error and fallback diagnostics for material factory/runtime and postprocess paths where practical.
- Error messages that identify material id, shader stage, shader source path, Three/runtime context, browser/GPU context when available, and affected entity or slot when practical.
- Development HMR guidance for GLSL/material iteration that preserves a previous valid material or explicit fallback and avoids blanking the editor.
- Precompile guidance for known production materials and postprocess passes, preferably tied to `renderer.compileAsync(scene, camera)` or an equivalent documented runtime fixture.
- Mobile or low-end shader performance baseline documentation and smoke/perf evidence that can run locally without new external infrastructure.
- Documentation updates explaining the Phase 21 quality gate, how new production shaders must be added, where visual baselines live, and how failures should be triaged.
- `docs/phase-21-shader-production-quality-gate-final-report.md` with validation, smoke, visual regression evidence, diagnostics evidence, commits, push status, limitations, and Phase 21.5 handoff.

## 3. What This Phase Must Not Do

Do not:

- Start Phase 21.5 or edit external infrastructure contracts as part of this phase.
- Add Phase 22 LOD, instancing, vegetation, spherical world, gameplay input, physics migration, Runtime UI, audio, narrative importers, multiplayer, delivery gameplay, or external adapters.
- Add shader graph authoring, visual material node editor, TSL, WGSL, transpilers, `RawShaderMaterial` as the default path, arbitrary `onBeforeCompile` patching, or GLSL source in JSON.
- Redesign the Phase 18-20 public material parameter contract, shader globals contract, or postprocess public effect contract unless a bug fix is required for the quality gate.
- Put raw uniforms such as `uProgress`, `uElapsedSeconds`, `uVignetteIntensity`, or pass-specific names in data, timeline, action, editor UI, director, engine, world, or schema-facing contracts.
- Let React own per-frame shader state, shader global updates, postprocess animation, or renderer resource counters.
- Put Three.js imports outside `src/runtime/three/**` and already accepted thin editor glue.
- Turn visual regression into broad product screenshot testing. Phase 21 owns shader/postprocess quality fixtures only.
- Commit temporary Playwright output, generated screenshots, or local hardware reports unless the guide explicitly marks them as stable source baselines.
- Stage unrelated PDFs, temporary files, external-project docs, RFCs, strategy notes, or user changes.

## 4. Architecture Boundaries

Data and schema:

- `data/**/*.json` remains the source of truth for game and authoring semantics.
- Shader quality fixtures may use test-only data or helpers, but they must not turn raw uniforms, GLSL paths, Three classes, composer pass names, or renderer counters into gameplay data.
- Any new fixture baseline format must be explicit, small, reviewable, and deterministic.

Runtime and renderer:

- `src/runtime/materials/**` owns renderer-neutral material contracts and public shader global contracts.
- `src/runtime/postprocess/**` owns renderer-neutral public postprocess effect contracts.
- `src/runtime/three/materials/**` owns Three shader materials, uniform mapping, shader source imports, fallback materials, compile diagnostics, and material-level resource handling.
- `src/runtime/three/**` owns postprocessing passes, render targets, renderer info counters, compile/precompile interactions, and browser/GPU diagnostics.
- `WebRuntime` / `RuntimeTypes` may expose narrow renderer-neutral diagnostic or precompile commands only if required; they must not expose Three types or raw uniforms.

Testing and visual regression:

- Browser compile and visual fixtures should run through Playwright/Chromium or the existing smoke harness.
- Visual regression should use stable viewport size, camera, geometry, material parameters, shader globals, postprocess settings, and tolerances.
- If screenshot baselines are introduced, only intentional baseline assets should be committed. `test-results/**` and ad hoc screenshots remain generated output.

Editor and HMR:

- The editor may display structured shader errors or diagnostic summaries, but it must not own shader compile semantics.
- HMR guidance should describe how to preserve old material state or use fallback on failed shader replacement without requiring hidden GUI state.
- CI/smoke must fail on shader compile errors even if the runtime falls back visually.

## 5. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Confirm Phase 20 final report is PASS and pushed before implementation starts.
3. Inspect current status, dirty files, and implementation files before editing.
4. Define the smallest coherent checkpoint.
5. Implement the checkpoint.
6. Run targeted tests first.
7. Run relevant validation.
8. Run browser smoke when shader compile, visual fixture, postprocessing, editor-visible diagnostics, or pixels changed.
9. Run Debug self-check.
10. Run architecture self-check.
11. Inspect status and diff.
12. Stage only Phase 21 relevant files.
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
- Whether a buffer round was consumed

Progression rules:

- If validation fails, do not commit, do not push, and do not proceed.
- If validation is blocked by unrelated pre-existing dirty files, isolate the blocker, report it clearly, and do not stage unrelated fixes unless the user explicitly approves or the fix is required for the phase gate.
- If commit fails, do not proceed.
- If push fails, do not proceed.
- If shader compile, visual regression, or smoke fails, localize whether the failure is GLSL source, material definition, material factory, global binding, postprocess pass, renderer output, visual threshold, Playwright timing, browser/GPU environment, or fixture baseline before editing further.
- If generated artifacts appear, keep them out of commits unless explicitly named as source baselines.
- If Phase 21.5 or external infrastructure work appears in the current diff, stop and remove it from the Phase 21 commit scope unless the user explicitly changes the phase.

Reusable self-checks for every round:

Debug self-check:

- Can the current change be explained by the smallest relevant fixture or user workflow?
- Can failures be localized to a specific layer such as schema, parser, runtime contract, Three material factory, shader source, global update path, composer/pass setup, renderer output, visual baseline, tooling, CLI, browser, GPU, or UI?
- Are success, failure, empty, stale, disabled, disposed, incompatible, and fallback states covered where relevant?
- If UI changed, was a repeatable component or smoke verification added?
- If state changed, are export/import, validate, migration, reset, disposal, generated-output, and renderer info boundaries covered?

Architecture self-check:

- Does `data/**/*.json` remain the source of truth for game and authoring semantics?
- Did host/editor/UI code avoid duplicating runtime, material registry, shader global, postprocess, parser, compiler, visual regression, or validation semantics?
- Are public capability/schema contracts, binding/mapping, diagnostics/audit, and runtime state still separated?
- Did the phase avoid Phase 21.5, Phase 22, and unrelated engine-module scope?
- Are unrelated files, generated outputs, and user changes left alone?
- Does Three.js remain inside `src/runtime/three/**` and accepted thin editor glue?
- Are raw uniforms kept out of data, timeline, action, editor, director, engine, world, schemas, and authoring docs?

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

Commit and push with explicit Phase 21 paths:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "test: add shader visual regression gate" -Paths src\runtime\materials,src\runtime\postprocess,src\runtime\three,src\shaders,tests,docs\phase-21-shader-production-quality-gate-goal-mode-execution-guide.md,docs\phase-21-shader-production-quality-gate-final-report.md,docs\developer-guide.md,docs\development-plan.md,docs\abeto-messenger-development-plan.md,docs\post-mvp-execution-workflow.md
```

Adjust `-Paths` per round so only touched, phase-relevant files are staged. Do not use broad staging commands such as `git add .`.

## 7. Round Budget

Total: 16 rounds.

- Main implementation: rounds 21.1 through 21.12.
- Buffer fixes: rounds 21.13 through 21.15.
- Final validation and handoff: round 21.16.

The roadmap's 4-round estimate is the high-level planning estimate. This goal-mode guide splits Phase 21 into smaller commit-and-push checkpoints because the phase touches shader compile matrices, visual baselines, browser smoke, diagnostics/fallback behavior, HMR guidance, precompile guidance, low-end performance evidence, docs, and final handoff.

## 8. Round Plan

### Round 21.1: Baseline Audit And Quality Gate Design Lock

Goal:

- Confirm the Phase 20 baseline and lock the exact Phase 21 quality-gate design.

Work:

- Inspect status, dirty files, recent commits, Phase 20 final report, shader material registry, postprocess registry, Three material factory/runtime, `ThreePostProcessRuntime`, shader smoke fixtures, Playwright config, and current docs.
- Define the production shader/pass inventory after Phase 20.
- Decide visual regression fixture format, tolerance strategy, baseline storage policy, generated output policy, and low-end baseline strategy.
- Confirm Phase 21.5 remains blocked until after Phase 21 PASS and pushed.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
rg "Phase 21|Shader Production Quality Gate|visual regression|HMR|precompile|mobile" docs\abeto-messenger-development-plan.md docs\phase-20-shader-globals-and-postprocessing-ramp-final-report.md docs\Web3D_Shader_研发方案与架构指南_GLSL_MVP.md
git diff --check
```

Expected commit:

```txt
docs: lock phase 21 shader quality plan
```

### Round 21.2: Production Shader And Pass Compile Matrix

Goal:

- Ensure all production shader materials and postprocess passes are covered by browser compile smoke.

Work:

- Inventory production materials: `story.gate-dissolve`, `story.hologram-scanline`, and any existing debug/support materials that should remain smoke-covered.
- Inventory postprocess passes: `cinematic.vignette` and final output path.
- Extend smoke fixtures so compile failures identify material/pass id and source path.
- Keep broad visual comparison out of this round; focus on compile coverage.

Validation:

```powershell
npm run test -- shader ThreeMaterialFactory ThreePostProcessRuntime
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
test: cover production shader compile matrix
```

### Round 21.3: Visual Regression Harness

Goal:

- Add deterministic visual fixture infrastructure for shader and postprocess paths.

Work:

- Add a small harness that fixes camera, geometry, viewport, time, shader globals, material parameters, postprocess settings, and tolerance.
- Choose a baseline format that is reviewable and stable. Prefer targeted pixel regions or compact JSON baselines unless screenshot snapshots are clearly justified.
- Ensure generated output stays out of commits unless it is an intentional source baseline.
- Add tests for threshold pass/fail behavior with synthetic data.

Validation:

```powershell
npm run test -- visual shader smoke
npm run typecheck
git diff --check
```

Expected commit:

```txt
test: add shader visual regression harness
```

### Round 21.4: Material Visual Regression Fixtures

Goal:

- Add visual fixtures for production material paths that affect demo presentation.

Work:

- Add fixed fixtures for `story.gate-dissolve` across representative public parameter values.
- Add fixed fixtures for `story.hologram-scanline` with deterministic shader globals and parameters.
- Record stable baselines and tolerances.
- Ensure fixture failures report material id, parameter set, stage/fixture name, and observed deltas.

Validation:

```powershell
npm run test -- shader visual
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
test: add production material visual baselines
```

### Round 21.5: Postprocess Visual Regression Fixture

Goal:

- Add visual regression coverage for the Phase 20 postprocess output path.

Work:

- Add a fixed fixture for `cinematic.vignette` enabled and disabled states.
- Verify final output alpha/color behavior and edge/center pixel differences with tolerances.
- Ensure `OutputPass` and color-space behavior remain stable enough for future shader work.

Validation:

```powershell
npm run test -- postprocess visual ThreePostProcessRuntime
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
test: add postprocess visual baseline
```

### Round 21.6: Structured Shader Error Diagnostics Contract

Goal:

- Define structured diagnostics for shader/material/postprocess failures.

Work:

- Add or refine diagnostic types for material id, material name, shader stage, source path, Three version, browser/GPU context when available, compile log, fixture/test name, affected entity, and material slot.
- Keep diagnostics renderer/test-facing; do not make raw uniforms part of authoring data.
- Add unit tests for formatting, missing optional fields, and stable messages.

Validation:

```powershell
npm run test -- diagnostics ThreeMaterialFactory ThreeMaterialRuntime
npm run typecheck
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
feat: add structured shader diagnostics
```

### Round 21.7: Fallback Failure Fixtures

Goal:

- Prove shader and postprocess failures use explicit fallback/diagnostic behavior and still fail CI where appropriate.

Work:

- Add tests for invalid material ids, invalid public parameters, unsupported materials, GLSL compile failure fixtures if practical, and postprocess invalid parameter failures.
- Ensure runtime fallback is visible and structured, while compile/smoke tests still fail for real production shader failures.
- Ensure editor/runtime behavior does not silently swallow shader errors.

Validation:

```powershell
npm run test -- fallback diagnostics shader postprocess
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
test: cover shader fallback diagnostics
```

### Round 21.8: HMR And Development Shader Iteration Guidance

Goal:

- Document and, where practical, test the development-time shader iteration policy.

Work:

- Add HMR guidance for `.glsl` and material factory edits: create new material, copy public parameters, replace scene material, dispose old material, preserve timeline state, and fall back on failure.
- Add small helper tests if an existing runtime seam supports them without making Vite HMR brittle.
- Document how developers should triage shader compile errors during local work.

Validation:

```powershell
npm run test -- material runtime diagnostics
npm run typecheck
git diff --check
```

Expected commit:

```txt
docs: document shader hmr failure policy
```

### Round 21.9: Precompile Guidance For Known Production Shaders

Goal:

- Make shader precompile expectations explicit before future scenes depend on more effects.

Work:

- Add guidance for precompiling known production materials and postprocess paths with `renderer.compileAsync(scene, camera)` or the current project equivalent.
- If a narrow runtime/test helper is useful, add it without broad loading pipeline rewrites.
- Add docs for unsupported browsers or environments where async compile is unavailable.

Validation:

```powershell
npm run test -- shader compile precompile
npm run typecheck
git diff --check
```

Expected commit:

```txt
docs: add shader precompile guidance
```

### Round 21.10: Mobile And Low-End Shader Baseline

Goal:

- Record a mobile or low-end shader performance baseline before LOD/world/gameplay phases depend on shader behavior.

Work:

- Add a repeatable low-end Chromium smoke/profile fixture where possible, using existing quality profile, pixel ratio, viewport, renderer counters, and timing summaries.
- If real mobile hardware is not available, document that limitation clearly and provide the low-end desktop/Chromium baseline as the current gate.
- Record accepted budgets for shader/postprocess demo counters and visual fixture runtime.

Validation:

```powershell
npm run test -- low-end shader
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
test: add low-end shader baseline
```

### Round 21.11: Developer Docs And Quality Checklist

Goal:

- Make the shader quality gate usable by future executors.

Work:

- Update `docs/developer-guide.md` and relevant phase docs with the production shader checklist.
- Document required deliverables for new production shaders: GLSL, material definition, factory/runtime mapping, compile smoke, visual fixture, fallback diagnostics, precompile note, and low-end consideration.
- Update `docs/post-mvp-execution-workflow.md` if validation workflow or smoke expectations changed.

Validation:

```powershell
rg "visual regression|HMR|precompile|mobile|low-end|fallback diagnostics" docs\developer-guide.md docs\post-mvp-execution-workflow.md docs\abeto-messenger-development-plan.md
git diff --check
```

Expected commit:

```txt
docs: add shader production quality checklist
```

### Round 21.12: Integrated Quality Gate Smoke

Goal:

- Ensure compile, visual, fallback, diagnostics, precompile guidance, and low-end checks work together.

Work:

- Run targeted shader/postprocess suites.
- Run full smoke.
- Fix only Phase 21 defects.
- Update docs if the actual validation commands or fixture locations differ from earlier rounds.

Validation:

```powershell
npm run test -- shader postprocess visual diagnostics
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
test: integrate shader quality gate
```

### Round 21.13: Buffer Fix Round 1

Goal:

- Fix only defects found in Phase 21 validation or smoke.

Work:

- Triage failures by layer before editing.
- Keep fixes inside Phase 21 scope.
- Do not add Phase 21.5 or Phase 22 scope.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: stabilize shader quality gate
```

### Round 21.14: Buffer Fix Round 2

Goal:

- Fix remaining Phase 21 defects only if needed.

Work:

- Focus on visual baselines, browser smoke stability, diagnostics, docs, or low-end baseline defects found by integrated checks.
- Skip this round if no defects remain.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: stabilize shader visual baselines
```

### Round 21.15: Buffer Fix Round 3

Goal:

- Reserve the last buffer for final integrated issues.

Work:

- Use only if integrated validation still finds Phase 21 blockers.
- Do not use this round for Phase 21.5 external-contract work or Phase 22 implementation.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: close phase 21 validation gaps
```

### Round 21.16: Final Validation And Handoff

Goal:

- Close Phase 21 with full validation, smoke, final docs, and Phase 21.5 handoff.

Work:

- Run full validation and smoke.
- Confirm all Phase 21 commits are pushed.
- Create `docs/phase-21-shader-production-quality-gate-final-report.md`.
- Update roadmap entry points so Phase 21.5 Engine Maturity External Contract Gate is the next gate before Phase 22.
- Confirm Phase 21.5 is still a contract gate and not runtime implementation.
- The final report must include status, completed work, validation, smoke, compile coverage evidence, visual regression evidence, fallback/diagnostic evidence, HMR guidance, precompile guidance, low-end baseline, commits, push status, known limitations, and Phase 21.5 recommended next goal.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
rg "Phase 21|Shader Production Quality Gate|visual regression|HMR|precompile|low-end|Phase 21.5" docs src tests
git diff --check
```

Expected commit:

```txt
docs: finalize phase 21 shader production quality gate
```

## 9. PASS Criteria

Phase 21 is PASS only when all of these are true:

- Phase 20 final report is PASS and the executor confirmed it was pushed before Phase 21 implementation started.
- Browser compile coverage exists for every production shader material and postprocess pass after Phase 20.
- Visual regression fixtures exist for demo-critical shader/material/postprocess paths, including dissolve, hologram/scanline, and vignette/final output.
- Visual baselines are deterministic, reviewable, and have explicit tolerance rules.
- Shader/material/postprocess failures produce structured diagnostics and explicit fallback behavior.
- Diagnostics identify material id or effect id, shader stage where applicable, source path where applicable, runtime context, browser/GPU context when available, and affected entity or slot when practical.
- HMR/development shader iteration guidance is documented and does not allow shader failures to blank the editor silently.
- Precompile guidance for known production materials and postprocess passes is documented and tested or smoke-backed where practical.
- A mobile or low-end shader baseline is recorded, with limitations stated if real mobile hardware is unavailable.
- New production shader checklist is documented for future phases.
- No raw uniforms enter data, timeline, action, editor, director, engine, world, or schema-facing contracts.
- No Phase 21.5 external infrastructure work, Phase 22 LOD/instancing work, or unrelated gameplay systems are implemented.
- `Validate.cmd` passes.
- `Smoke.cmd` passes.
- `git diff --check` passes.
- Phase 21 final report exists.
- All Phase 21 commits are pushed to `origin/main` or the active remote branch requested by the user.
- Roadmap entry points identify Phase 21.5 as the next gate before Phase 22.

## 10. Validation Matrix

| Area | Required validation |
| --- | --- |
| Production shader inventory | Tests or docs listing every production material and postprocess pass covered by compile/visual gates |
| Browser compile | Chromium smoke for debug support material, `story.gate-dissolve`, `story.hologram-scanline`, and `cinematic.vignette`/output path |
| Visual harness | Tests for deterministic viewport/camera/time/globals/parameters and tolerance failure reporting |
| Material visual regression | Fixed fixtures for dissolve and hologram/scanline with stable baselines |
| Postprocess visual regression | Fixed fixture for vignette enabled/disabled and final output behavior |
| Diagnostics contract | Unit tests for structured diagnostic fields, missing optional fields, stable formatting, and no raw-authoring leakage |
| Fallback behavior | Unit and/or smoke tests for invalid material/effect paths, compile failure fixtures where practical, and visible fallback behavior |
| HMR guidance | Documentation and narrow tests if helper seams are added |
| Precompile guidance | Documentation and targeted tests/smoke for compile/precompile path where practical |
| Mobile/low-end baseline | Smoke or documented profile for low-end shader/postprocess behavior, counters, and limitations |
| Boundary checks | `check-boundaries` proves Three.js stays inside runtime adapter boundaries |
| Full gate | `Validate.cmd`, `Smoke.cmd`, `git diff --check`, roadmap link checks |

## 11. Final Report Template

Create `docs/phase-21-shader-production-quality-gate-final-report.md` using this structure:

```markdown
# Phase 21 Shader Production Quality Gate Final Report

Date: <date>

## Status

PASS or BLOCKED.

## Completed

- ...

## Compile Coverage

- Production materials:
- Postprocess passes:
- Browser fixture:

## Visual Regression

- Harness:
- Material fixtures:
- Postprocess fixtures:
- Baseline format:
- Tolerance policy:

## Diagnostics And Fallback

- Structured diagnostic fields:
- Fallback behavior:
- CI failure behavior:
- Editor/runtime reporting:

## HMR Guidance

- ...

## Precompile Guidance

- ...

## Mobile / Low-End Baseline

- Environment:
- Metrics:
- Budgets:
- Limitations:

## Validation

- Validate.cmd:
- Smoke.cmd:
- Targeted tests:
- Browser compile:
- Visual regression:
- Data validation:
- Asset report:
- git diff --check:
- Boundary checks:

## Commits And Push

- `<hash>` <message> pushed to `<remote>/<branch>`

## Buffer

Consumed or not consumed. Explain why.

## Known Limitations

- ...

## Remaining Blockers

None, or list blockers.

## Recommended Next Goal

Complete Phase 21.5 from docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-goal-mode-execution-guide.md: Engine Maturity External Contract Gate. Start only after Phase 21 is PASS and pushed. Phase 21.5 is a contract/documentation gate, not runtime implementation.
```

## 12. Phase 21.5 Handoff Notes

After Phase 21 passes, Phase 21.5 may run as the external infrastructure contract gate before Phase 22 LOD/Instancing/Vegetation starts.

Phase 21.5 must stay documentation/contract-focused: Sinan-owned RFC alignment, adapter boundary policy, POC briefs, mature dependency evaluation templates, and compatibility matrix. It must not implement LOD, input, physics, Runtime UI, audio, narrative importers, real external adapters, or runtime dependency integrations.

Phase 22 must remain blocked until Phase 21.5 has a PASS final report and pushed commits.
