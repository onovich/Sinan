# Phase 20 Shader Globals And Postprocessing Ramp Goal Mode Execution Guide

Date: 2026-06-20
Status: Guide for an executor running Phase 20 in goal mode.

Phase 20 starts after the accepted and pushed Phase 19 Shader Dissolve And Material Timeline work. Its job is to make shader behavior reusable beyond one dissolve material, harden material lifetime rules, and add the first controlled postprocessing runtime path without leaking Three.js, GLSL uniforms, or pass internals into data, timeline, action, editor, director, engine, or world contracts.

Phase 21.5 already has a future contract-gate guide, but it is not the active execution entry. Phase 21.5 may only start after Phase 20 and Phase 21 both have PASS final reports and pushed commits.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 20 for Sinan: Shader Globals And Postprocessing Ramp. Read AGENTS.md, docs/development-plan.md, docs/abeto-messenger-development-plan.md, docs/phase-19-shader-dissolve-material-timeline-final-report.md, docs/phase-19-shader-dissolve-material-timeline-goal-mode-execution-guide.md, docs/phase-18-shader-glsl-material-runtime-foundation-final-report.md, docs/phase-18-shader-glsl-material-runtime-foundation-goal-mode-execution-guide.md, docs/phase-18-5-engine-core-alignment-final-report.md, docs/phase-18-5-engine-core-alignment-goal-mode-execution-guide.md, docs/engine-positioning-architecture-adjustment-plan.md, docs/Web3D_Shader_GLSL_MVP_支持度评估与实施计划.md, docs/Web3D_Shader_研发方案与架构指南_GLSL_MVP.md, docs/post-mvp-execution-workflow.md, docs/developer-guide.md, the main architecture guide, .codex/project-ops-workflow.json, and .codex/project-git-workflow.json. Implement Phase 20 only: add a renderer-neutral ShaderGlobals contract; route time, delta time, viewport size, and optional camera/world/player signals from EngineLoop/WebRuntime into the runtime adapter; bind supported globals to existing and new shader materials without per-frame React state; add a second production material such as hologram, scanline, or highlight; make material sharing, cloning, reset, and disposal behavior explicit and tested; add the first postprocessing runtime under src/runtime/three/** using EffectComposer, RenderPass, and final output handling; add a small public postprocess parameter path only after material parameter handling is stable; clarify the boundary between Phase 16 ThreeEnvironmentStyle.colorGrade and real postprocessing; update tests, smoke, docs, and the Phase 20 final report. Keep data as source of truth. Keep raw uniforms out of data, timeline, action, and editor contracts. Keep Three.js and postprocessing passes inside src/runtime/three/** and accepted thin editor glue. Do not implement Phase 21 visual-regression/HMR/mobile-quality gates, Phase 21.5 external infrastructure contracts, Phase 22 LOD/instancing/vegetation, input, physics, Runtime UI, audio, narrative, multiplayer, shader graph, TSL, WGSL, arbitrary onBeforeCompile patching, or package identity migration. Every round must run Debug self-check, architecture self-check, validation, commit, and push before proceeding.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `docs/development-plan.md`
- `docs/abeto-messenger-development-plan.md`
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
- `src/runtime/three/materials/**`
- `src/runtime/three/**`
- `src/runtime/WebRuntime.ts`
- `src/runtime/RuntimeTypes.ts`
- `src/engine/EngineSession.ts`
- `src/engine/EngineLoop.ts`
- `src/editor/EditorSessionBridge.ts`
- `src/editor/Viewport.tsx`
- `src/shaders/**`
- `src/schemas/material.schema.ts`
- `src/schemas/timeline.schema.ts`
- `src/schemas/action.schema.ts`
- `src/data/ReferenceResolver.ts`
- `src/events/**`
- `src/director/**`
- `src/editor/panels/InspectorPanel.tsx`
- `src/editor/panels/MaterialInspector.tsx`
- `src/editor/panels/TimelinePanel.tsx`
- `src/editor/panels/EventInspector.tsx`
- `tests/smoke/**`
- `data/levels/**`
- `data/prefabs/**`
- `data/timelines/**`
- `data/events/**`

Current accepted baseline:

- Phase 18 is PASS and created renderer-neutral `MaterialDefinition`, `MaterialRegistry`, `MaterialRuntime`, public parameter validation, GLSL raw imports, Three `ShaderMaterial` factory/runtime/fallback support, renderable material slots, and Chromium shader compile smoke.
- Phase 18.5 is PASS and moved runtime orchestration behind `EngineSession`, `EngineLoop`, minimal `World`, and `EditorSessionBridge`.
- Phase 19 is PASS and added `story.gate-dissolve`, public parameters `progress`, `edgeWidth`, `edgeColor`, `baseColor`, and `noiseScale`, material timeline sampling, `material.setParameter`, Material Inspector MVP authoring, demo data integration, and smoke evidence for visible public parameter changes.
- Phase 19 final report says Phase 20 is the next goal. Confirm that report is committed and pushed before implementation.
- Current known limitations include one supported material slot, no shader globals, no second production material, no postprocessing pass, no shader graph, and no visual regression suite.
- Existing unrelated dirty or untracked files may be present. Do not stage external infrastructure docs, generated screenshots, temporary folders, package identity experiments, or unrelated user changes.

## 2. What This Phase Must Complete

Phase 20 must complete:

- A renderer-neutral `ShaderGlobals` contract for shared shader inputs such as elapsed time, delta time, viewport size, and optional camera/world/player signals.
- A single update source for shader globals from `EngineLoop` / `EngineSession` / `WebRuntime` into the runtime adapter, not React state and not repeated per component.
- Three runtime support for applying globals to existing shader materials and new shader materials that declare supported global uniforms.
- A second production material, such as hologram, scanline, or highlight, with separate GLSL sources under `src/shaders/**`, renderer-neutral material definition, Three factory/runtime support, fallback behavior, and browser compile smoke.
- Explicit material sharing, cloning, reset, and disposal behavior for static shared materials, independently animated story materials, and unsupported high-cardinality cases.
- Lifecycle diagnostics/tests using `renderer.info.memory` and `renderer.info.programs` or narrow test doubles where a browser renderer is not practical.
- The first postprocessing runtime under `src/runtime/three/**` using `EffectComposer`, `RenderPass`, and final output handling.
- Enable/disable behavior for the first postprocess pass, with tests proving disabled passes do not continue allocating or updating resources.
- A small public postprocess parameter path after material parameter handling is stable. Use public effect ids and public parameter names, not raw pass uniforms.
- Clear documentation for how Phase 16 `ThreeEnvironmentStyle.colorGrade` differs from real postprocessing and how to avoid double color-space or tone-mapping conversion.
- Smoke or browser coverage proving shader globals affect at least one material, the second material compiles, and the first postprocess pass can be enabled and disabled.
- Documentation and `docs/phase-20-shader-globals-and-postprocessing-ramp-final-report.md` with validation, smoke, commits, push status, limitations, and Phase 21 handoff.

## 3. What This Phase Must Not Do

Do not:

- Start Phase 21.5 or edit external infrastructure contracts as part of this phase.
- Add Phase 21 production-quality gate work such as broad visual regression infrastructure, shader HMR strategy, structured shader error telemetry, precompile policy, or mobile shader baseline beyond narrow evidence needed for Phase 20.
- Add Phase 22 LOD, instancing, vegetation, spherical world, gameplay input, physics migration, Runtime UI, audio, narrative importers, multiplayer, or delivery gameplay.
- Add shader graph authoring, visual material node editor, TSL, WGSL, transpilers, `RawShaderMaterial` as the default path, arbitrary `onBeforeCompile` patching, or GLSL source in JSON.
- Put raw uniforms such as `uTime`, `uDeltaTime`, `uViewportSize`, `uVignetteIntensity`, or pass-specific uniform names in data, timeline, event, editor UI, director, engine, world, or schema-facing contracts.
- Let React own per-frame shader globals, postprocess parameter animation, material lifetime, or renderer resource state.
- Put Three.js imports outside `src/runtime/three/**` and already accepted thin editor glue.
- Convert `renderStyle` into a shader material runtime or remove Phase 16 palette-toon, fog, outline, highlight, or color-grade behavior.
- Expose `EffectComposer`, `RenderPass`, `OutputPass`, or concrete Three pass names as Sinan data source-of-truth.
- Stage unrelated PDFs, temporary files, generated screenshots, external-project docs, RFCs, strategy notes, or user changes.

## 4. Architecture Boundaries

Data and schema:

- `data/**/*.json` remains the source of truth for material assignments, timeline tracks, actions, postprocess authoring values if added, and future demo effect configuration.
- Schemas define public authoring contracts only: material ids, public parameter names, public effect ids, and typed public parameter values.
- Raw uniforms, GLSL paths, Three classes, composer pass names, and render targets must not appear in JSON contracts.
- Validation must reject unknown material ids, unsupported slots, unknown public parameters, wrong value types, missing texture assets, unknown postprocess effect ids, unknown postprocess parameters, and raw-uniform-like names.

Runtime and renderer:

- `src/runtime/materials/**` stays renderer-neutral and owns shared contracts such as `MaterialDefinition`, public parameter metadata, and any renderer-neutral `ShaderGlobals` type.
- `src/runtime/three/materials/**` owns Three `ShaderMaterial`, uniforms, shader sources, fallback materials, global uniform binding, clone/share/dispose behavior, and compile diagnostics.
- `src/runtime/three/**` owns `EffectComposer`, `RenderPass`, `OutputPass`, custom passes, render targets, renderer info counters, and color-space correctness.
- `WebRuntime` / `RuntimeTypes` may expose narrow renderer-neutral shader globals and postprocess commands, but they must not expose Three types, pass classes, or raw uniforms.
- `EngineSession` and `EngineLoop` may route frame time, viewport size, and renderer-neutral runtime commands. They must not know GLSL internals, pass internals, or Three material details.

Director and events:

- Existing `material.parameter` and `material.setParameter` paths continue to use public material parameter names.
- If `postprocess.parameter` is added, it must follow the same registry/schema/validation/runtime-adapter pattern and use public effect ids and public parameter names.
- Director/event systems may dispatch parameter changes through runtime command paths. They must not import Three.js or reach into composer/pass instances.
- Timeline sampling remains deterministic. Critical story changes should stay explicit through timeline/action parameters rather than being inferred only from global time.

Editor:

- Material Inspector continues to show public material definitions and public parameters only.
- Any postprocess authoring surface added in Phase 20 should be minimal and command-backed. It should not duplicate runtime pass semantics or show raw uniform names.
- React editor state may display and edit slow authoring state. It must not drive per-frame shader globals.

Environment and postprocessing:

- Phase 16 `ThreeEnvironmentStyle.colorGrade` currently uses renderer exposure and DOM CSS filter for lightweight render style.
- Real postprocessing is a renderer runtime pipeline with `EffectComposer`, `RenderPass`, optional effect passes, and a single final output conversion.
- Phase 20 must document and test that CSS filter colorGrade and `OutputPass` / composer color conversion do not double-apply final color handling.

## 5. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Confirm Phase 19 final report is PASS and pushed before implementation starts.
3. Inspect current status, dirty files, and implementation files before editing.
4. Define the smallest coherent checkpoint.
5. Implement the checkpoint.
6. Run targeted tests first.
7. Run relevant validation.
8. Run browser smoke when shader compile, postprocessing, runtime rendering, editor-visible behavior, timeline preview, or visible pixels changed.
9. Run Debug self-check.
10. Run architecture self-check.
11. Inspect status and diff.
12. Stage only Phase 20 relevant files.
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
- If shader compile or smoke fails, localize whether the failure is GLSL source, global binding, material factory, material runtime, texture/color-space handling, postprocess composer setup, pass output, timeline sampling, action dispatch, engine session routing, editor UI, or Playwright timing before editing further.
- If generated artifacts appear, keep them out of commits unless explicitly named as source assets.
- If Phase 21.5 or external infrastructure work appears in the current diff, stop and remove it from the Phase 20 commit scope unless the user explicitly changes the phase.

Reusable self-checks for every round:

Debug self-check:

- Can the current change be explained by the smallest relevant fixture or user workflow?
- Can failures be localized to a specific layer such as schema, parser, runtime contract, Three material factory, shader source, global update path, composer/pass setup, renderer output, transport, payload, client, or UI?
- Are success, failure, empty, stale, disabled, disposed, and incompatible states covered where relevant?
- If UI changed, was a repeatable component or smoke verification added?
- If state changed, are export/import, validate, migration, reset, disposal, and renderer info boundaries covered?

Architecture self-check:

- Does `data/**/*.json` remain the source of truth for game and authoring semantics?
- Did host/editor/UI code avoid duplicating runtime, material registry, shader global, postprocess, parser, or validation semantics?
- Are public capability/schema contracts, binding/mapping, usage/audit, and runtime state still separated?
- Did the phase avoid Phase 21, Phase 21.5, Phase 22, and unrelated engine-module scope?
- Are unrelated files, generated outputs, and user changes left alone?
- Does Three.js remain inside `src/runtime/three/**` and accepted thin editor glue?
- Are raw uniforms kept out of data, timeline, action, editor, director, engine, world, schemas, and docs examples meant as authoring contracts?

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

Commit and push with explicit Phase 20 paths:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "feat: add shader globals contract" -Paths src\runtime\materials,src\runtime\RuntimeTypes.ts,src\runtime\WebRuntime.ts,src\engine,src\runtime\three,src\shaders,src\schemas,src\data,src\director,src\events,tests,docs\phase-20-shader-globals-and-postprocessing-ramp-goal-mode-execution-guide.md
```

Adjust `-Paths` per round so only touched, phase-relevant files are staged. Do not use broad staging commands such as `git add .`.

## 7. Round Budget

Total: 16 rounds.

- Main implementation: rounds 20.1 through 20.12.
- Buffer fixes: rounds 20.13 through 20.15.
- Final validation and handoff: round 20.16.

The roadmap's 6-round estimate is the high-level planning estimate. This goal-mode guide splits Phase 20 into smaller commit-and-push checkpoints because the phase touches renderer-neutral runtime contracts, EngineLoop/WebRuntime plumbing, shader sources, material lifecycle semantics, Three composer/postprocess output, timeline/schema validation, browser smoke, docs, and resource counters.

## 8. Round Plan

### Round 20.1: Baseline Audit And Phase 20 Design Lock

Goal:

- Confirm the Phase 19 baseline and lock the exact Phase 20 design before implementation.

Work:

- Inspect status, dirty files, recent commits, Phase 19 final report, material runtime contracts, Three material backend, `ThreeRuntime`, `EngineLoop`, `EngineSession`, shader smoke fixtures, `ThreeEnvironmentStyle`, schemas, data, and smoke tests.
- Create or update a short design note if useful, either in this guide's final report draft or a Phase 20 planning section, covering `ShaderGlobals`, second material id, global binding strategy, lifecycle policy, postprocess effect id, parameter path, smoke strategy, and explicit non-scope.
- Confirm that Phase 21.5 remains blocked until after Phase 21 PASS and pushed.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
rg "Phase 20|Shader Globals|postprocess|Phase 21.5" docs\development-plan.md docs\abeto-messenger-development-plan.md docs\phase-19-shader-dissolve-material-timeline-final-report.md
git diff --check
```

Expected commit:

```txt
docs: lock phase 20 shader globals plan
```

### Round 20.2: Renderer-Neutral ShaderGlobals Contract

Goal:

- Add renderer-neutral global shader state contracts without introducing Three or raw uniforms into semantic layers.

Work:

- Add `ShaderGlobals` types in a renderer-neutral location, likely `src/runtime/materials/**` or `src/runtime/RuntimeTypes.ts`.
- Include elapsed time, delta time, viewport size, and optional camera/world/player signals only where the current architecture can support them cleanly.
- Add unit tests for default values, clamping/sanitizing delta time, viewport sizing, object reuse expectations, and raw-uniform naming boundaries.
- Document that `ShaderGlobals` is a runtime input contract, not a data source-of-truth format.

Validation:

```powershell
npm run test -- ShaderGlobals RuntimeTypes
npm run typecheck
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
feat: add shader globals contract
```

### Round 20.3: EngineLoop And WebRuntime Global Plumbing

Goal:

- Route shader globals from the engine frame/update path into the runtime adapter.

Work:

- Extend `WebRuntime` / `RuntimeTypes` with a narrow renderer-neutral method or update payload for shader globals.
- Update `EngineSession` and `EngineLoop` integration so elapsed time and delta time have one authoritative source.
- Update `resize` plumbing so viewport globals stay correct when the canvas size changes.
- Add tests proving `EngineSession.step` and resize can update globals without React per-frame state and without exposing Three.

Validation:

```powershell
npm run test -- EngineLoop EngineSession RuntimeTypes WebRuntime
npm run typecheck
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
feat: route shader globals through engine session
```

### Round 20.4: Three Material Global Uniform Binding

Goal:

- Bind `ShaderGlobals` to Three shader materials that support global uniforms.

Work:

- Add Three-only global uniform mapping in `src/runtime/three/materials/**`.
- Update existing shader materials only where useful and safe, such as optional time/viewport uniforms for debug or story material behavior.
- Ensure materials that do not declare a global uniform skip that update without errors.
- Avoid per-frame allocation by reusing `THREE.Vector2`, `THREE.Vector3`, and `THREE.Color` objects where relevant.
- Add Three material runtime/factory tests for supported globals, missing globals, fallback materials, disposed materials, and object reuse expectations.

Validation:

```powershell
npm run test -- src\runtime\three\materials src\runtime\materials
npm run typecheck
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
feat: bind shader globals to three materials
```

### Round 20.5: Runtime Global Update Smoke

Goal:

- Prove the global update path reaches visible shader behavior in a browser.

Work:

- Extend or add a Playwright shader fixture that advances global time and/or viewport size deterministically.
- Prove at least one material receives globals and changes visible output or exposed runtime state in a deterministic way.
- Capture renderer program/memory counters where available for baseline evidence.
- Keep the fixture small; broad visual regression belongs to Phase 21.

Validation:

```powershell
npm run test -- shader
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
test: cover shader globals smoke
```

### Round 20.6: Second Production Material Definition And GLSL Sources

Goal:

- Add a second production material to prove the runtime is not hard-coded to dissolve.

Work:

- Choose a stable lowercase material id such as `story.hologram-scanline`, `story.scanline-highlight`, or another demo-appropriate id after inspecting current demo data.
- Add renderer-neutral `MaterialDefinition` with public parameters only.
- Add separate `.vert.glsl` and `.frag.glsl` files under `src/shaders/**`.
- Use `ShaderGlobals` where it improves the material, but keep critical story state controlled by public parameters.
- Add definition and shader source tests.

Validation:

```powershell
npm run test -- src\runtime\materials src\shaders
npm run typecheck
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
feat: add second production shader material
```

### Round 20.7: Three Factory And Runtime Support For Second Material

Goal:

- Make the second material create, apply, update, reset, fallback, and dispose through the existing material runtime path.

Work:

- Extend `ThreeMaterialFactory` and material creation helpers for the second material.
- Extend `ThreeMaterialRuntime` public-parameter-to-uniform mapping without exposing raw uniforms outside the Three backend.
- Add tests for valid parameters, invalid parameters, fallback material, set/reset/get parameter behavior, and missing/unsupported material paths.
- Keep `main` as the only supported slot unless a previous accepted doc says otherwise; multi-slot material assignment remains deferred.

Validation:

```powershell
npm run test -- src\runtime\three\materials src\runtime\materials
npm run typecheck
npm run validate-data
git diff --check
```

Expected commit:

```txt
feat: support second shader material runtime
```

### Round 20.8: Material Sharing, Cloning, Reset, And Disposal Policy

Goal:

- Make material lifetime behavior explicit and tested.

Work:

- Define when static equal-parameter materials may share, when story-animated materials must clone, and when high-cardinality variation should be deferred to instancing/attributes.
- Add or update runtime code so sharing/cloning choices are deliberate, observable, and safe.
- Add tests for repeated apply, reset, entity destruction, scene reload, original material restoration, fallback disposal, and shared texture ownership.
- Ensure dynamic materials are not created or cloned per frame.

Validation:

```powershell
npm run test -- ThreeMaterialRuntime ThreeMaterialFactory ThreeRuntime
npm run typecheck
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
test: harden shader material lifecycle
```

### Round 20.9: Resource Counter And Lifecycle Diagnostics

Goal:

- Add narrow diagnostics so Phase 20 can prove GPU/material resources do not grow linearly in the demo.

Work:

- Add tests or smoke fixture steps that repeatedly load/apply/dispose relevant material paths and observe `renderer.info.memory` and `renderer.info.programs` where available.
- Record accepted budget behavior for the current demo. The goal is no sustained linear growth, not zero counters after one frame.
- Keep diagnostics in test/smoke/runtime adapter layers. Do not expose renderer counters as gameplay data.

Validation:

```powershell
npm run test -- ThreeRuntime ThreeMaterialRuntime shader
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
test: add shader resource lifecycle diagnostics
```

### Round 20.10: Initial Three Postprocessing Runtime Boundary

Goal:

- Add the first postprocessing runtime inside the Three adapter boundary.

Work:

- Add a `ThreePostProcessRuntime` or equivalent under `src/runtime/three/**`.
- Wire `EffectComposer`, `RenderPass`, and final output handling behind `ThreeRuntime` without changing data source-of-truth.
- Keep `ThreeRuntime.render()` able to render with or without composer.
- Wire `resize()` and `dispose()` for composer, render targets, and passes.
- Add tests for initialization, render routing, resize, disable/no-composer path, and disposal.

Validation:

```powershell
npm run test -- ThreePostProcessRuntime ThreeRuntime
npm run typecheck
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
feat: add three postprocessing runtime boundary
```

### Round 20.11: First Pass Enable Disable And Color-Space Correctness

Goal:

- Add one small postprocess effect with correct enable/disable and final output behavior.

Work:

- Add a minimal first pass such as vignette, flash, scanline overlay, or another demo-safe effect.
- Ensure disabled passes do not continue allocating or updating resources.
- Ensure final tone mapping/color-space conversion happens once.
- Clarify and test interaction with `ThreeEnvironmentStyle.colorGrade`, renderer exposure, DOM CSS filter, and `OutputPass`.
- Add browser coverage if the pass affects pixels.

Validation:

```powershell
npm run test -- ThreePostProcessRuntime ThreeEnvironmentStyle ThreeRuntime
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
feat: add first controlled postprocess pass
```

### Round 20.12: Public Postprocess Parameter Path And Demo Integration

Goal:

- Add a small public postprocess parameter path and prove it through data/runtime/editor or smoke, depending on the smallest safe integration.

Work:

- Define public effect id and public parameter metadata. Reuse material parameter value types where sensible.
- Add schema/reference validation and runtime command routing if adding `postprocess.parameter` timeline data in this phase.
- Add a tiny demo or smoke path that enables/disables and changes one public postprocess parameter.
- Keep the editor surface minimal. Do not add a full postprocess editor.
- Update developer docs and authoring examples without exposing pass uniforms.

Validation:

```powershell
npm run test -- postprocess timeline schema ReferenceResolver DirectorSystem
npm run validate-data
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
feat: drive postprocess parameters through public contract
```

### Round 20.13: Buffer Fix Round 1

Goal:

- Fix only defects found in Phase 20 validation or smoke.

Work:

- Triage failures by layer before editing.
- Keep fixes inside Phase 20 scope.
- Do not add Phase 21 or Phase 21.5 scope.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: stabilize phase 20 shader globals
```

### Round 20.14: Buffer Fix Round 2

Goal:

- Fix remaining Phase 20 defects only if needed.

Work:

- Focus on runtime, shader, postprocess, validation, smoke, or docs defects found by integrated checks.
- Skip this round if no defects remain.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: stabilize phase 20 postprocessing
```

### Round 20.15: Buffer Fix Round 3

Goal:

- Reserve the last buffer for final integrated issues.

Work:

- Use only if integrated validation still finds Phase 20 blockers.
- Do not use this round for Phase 21 quality-gate expansion or Phase 21.5 external-contract work.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: close phase 20 validation gaps
```

### Round 20.16: Final Validation And Handoff

Goal:

- Close Phase 20 with full validation, smoke, final docs, and Phase 21 handoff.

Work:

- Run full validation and smoke.
- Confirm all Phase 20 commits are pushed.
- Create `docs/phase-20-shader-globals-and-postprocessing-ramp-final-report.md`.
- Update roadmap entry points so Phase 21 Shader Production Quality Gate is the next active implementation phase.
- Confirm Phase 21.5 remains blocked until after Phase 21 PASS and pushed.
- The final report must include status, completed work, validation, smoke, shader globals evidence, second material evidence, lifecycle/resource evidence, postprocessing evidence, commits, push status, known limitations, and Phase 21 recommended next goal.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
rg "Phase 20|Shader Globals|postprocess|Phase 21" docs src data tests
git diff --check
```

Expected commit:

```txt
docs: finalize phase 20 shader globals postprocessing
```

## 9. PASS Criteria

Phase 20 is PASS only when all of these are true:

- Phase 19 final report is PASS and the executor confirmed it was pushed before Phase 20 implementation started.
- A renderer-neutral `ShaderGlobals` contract exists and is tested.
- Shader globals have one update source through the engine/runtime path, not per-frame React state.
- Existing and new supported shader materials can receive shared globals without raw uniforms entering authoring contracts.
- A second production material exists with separate GLSL vertex/fragment sources, public parameters, renderer-neutral definition, Three factory/runtime support, fallback behavior, and browser compile coverage.
- Material sharing, cloning, reset, original-material restoration, and disposal behavior are explicit and tested.
- Repeated load/apply/dispose diagnostics show renderer memory/program counters remain within accepted demo budget and do not grow linearly.
- A Three-only postprocessing runtime exists under `src/runtime/three/**` with `EffectComposer`, `RenderPass`, final output handling, resize, render routing, disable path, and disposal.
- The first postprocess pass can be enabled, disabled, and validated.
- Color-space/tone-mapping handling is documented and tested enough to prevent double final output conversion with Phase 16 `ThreeEnvironmentStyle.colorGrade`.
- A small public postprocess parameter path exists if it can be added safely after material parameter handling is stable.
- Validation rejects unknown postprocess effect ids/parameters and raw-uniform-like public names if a postprocess data/timeline contract is added.
- `Validate.cmd` passes.
- `Smoke.cmd` passes.
- `git diff --check` passes.
- Phase 20 final report exists.
- All Phase 20 commits are pushed to `origin/main` or the active remote branch requested by the user.
- Roadmap entry points identify Phase 21 as the next implementation phase and keep Phase 21.5 gated until after Phase 21 PASS and pushed.

## 10. Validation Matrix

| Area | Required validation |
| --- | --- |
| Shader globals contract | Unit tests for defaults, elapsed/delta time, viewport size, optional signals, no raw-uniform authoring contract |
| Engine/runtime routing | `EngineLoop`, `EngineSession`, `WebRuntime`, and `ThreeRuntime` tests proving one update source and no React per-frame state |
| Global uniform binding | Three material runtime tests for supported uniforms, missing uniforms, fallback materials, disposed bindings, and object reuse |
| Second material definition | Unit tests for id, defaults, public parameter metadata, raw uniform rejection, and registry validation |
| Second material factory | Three factory/runtime tests for create, apply, set, reset, fallback, get, dispose, and invalid parameters |
| Browser shader compile | Chromium compile smoke for debug, dissolve, and the second production material |
| Visible global behavior | Browser fixture or smoke proving a global such as time or viewport reaches visible material behavior |
| Material lifecycle | Tests for share/clone/reset/dispose/original restoration and no per-frame material creation |
| Resource diagnostics | Browser or runtime tests observing `renderer.info.memory` and `renderer.info.programs` across repeated lifecycle cycles |
| Postprocess runtime | Tests for composer setup, render route, resize, enable/disable, no-composer path, and disposal |
| Color-space correctness | Tests/docs proving only one final tone-mapping/color-space output path with `OutputPass` and `ThreeEnvironmentStyle.colorGrade` |
| Postprocess parameter path | Schema/reference/runtime tests for public effect id, public parameter name, value typing, invalid effect/parameter, and raw uniform rejection |
| Editor/demo integration | Component and/or smoke tests if any editor or demo authoring surface changes |
| Full gate | `Validate.cmd`, `Smoke.cmd`, `git diff --check`, roadmap link checks |

## 11. Final Report Template

Create `docs/phase-20-shader-globals-and-postprocessing-ramp-final-report.md` using this structure:

```markdown
# Phase 20 Shader Globals And Postprocessing Ramp Final Report

Date: <date>

## Status

PASS or BLOCKED.

## Completed

- ...

## Shader Globals

- Contract:
- Update source:
- Runtime route:
- Supported globals:
- Allocation/lifecycle notes:

## Second Production Material

- Material id:
- Public parameters:
- GLSL sources:
- Global usage:
- Fallback behavior:

## Material Lifecycle

- Sharing policy:
- Cloning policy:
- Reset behavior:
- Disposal behavior:
- Resource counter evidence:

## Postprocessing

- Runtime boundary:
- Composer/pass setup:
- First pass:
- Enable/disable behavior:
- Color-space/tone-mapping handling:
- Public parameter path:

## Validation

- Validate.cmd:
- Smoke.cmd:
- Targeted tests:
- Shader compile:
- Postprocess smoke:
- Data validation:
- Asset report:
- Resource diagnostics:
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

Complete Phase 21 from docs/abeto-messenger-development-plan.md: Shader Production Quality Gate. Start only after Phase 20 is PASS and pushed. Do not start Phase 21.5 until Phase 21 is PASS and pushed.
```

## 12. Phase 21 Handoff Notes

After Phase 20 passes, Phase 21 may add shader visual regression, broader browser compile coverage for all production shader materials and postprocess passes, shader HMR/fallback/error diagnostics, precompile guidance, and mobile/low-end shader baseline documentation.

Phase 21 should build on Phase 20 evidence. It should not redesign shader globals, replace the material public parameter contract, or move postprocessing semantics out of the runtime adapter boundary.

Phase 21.5 remains a future external infrastructure contract gate. It must not run until Phase 21 Shader Production Quality Gate has a PASS final report and pushed commits.
