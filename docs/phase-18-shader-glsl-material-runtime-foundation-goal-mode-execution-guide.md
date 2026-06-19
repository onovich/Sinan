# Phase 18 Shader GLSL Material Runtime Foundation Goal Mode Execution Guide

Date: 2026-06-20
Status: Guide for an executor running Phase 18 in goal mode.

Phase 18 starts after the accepted Phase 17 Asset Budget And Compression. Its job is to implement Shader MVP stage S0: a minimal, architecture-safe material runtime foundation that proves standard GLSL files can be imported, registered, applied, compiled in a real browser, and disposed without leaking Three.js or raw uniforms into data, director, event, schema, or editor semantics.

This phase must not implement the first story dissolve material, material timeline tracks, material actions, shader globals, postprocessing, LOD, instancing, spherical world, gameplay, or multiplayer work.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 18 for Sinan: Shader GLSL Material Runtime Foundation. Read AGENTS.md, docs/abeto-messenger-development-plan.md, docs/phase-17-asset-budget-compression-final-report.md, docs/phase-17-asset-budget-compression.md, docs/developer-guide.md, docs/phase-16-stylized-runtime-foundation-final-report.md, docs/Web3D_Shader_GLSL_MVP_支持度评估与实施计划.md, docs/Web3D_Shader_研发方案与架构指南_GLSL_MVP.md, docs/post-mvp-execution-workflow.md, and the main architecture guide. Implement Shader MVP S0 only: renderer-neutral MaterialDefinition/MaterialParameter/MaterialRegistry/MaterialRuntime contracts, .glsl?raw import support, a minimal src/shaders/** test shader, Three-only ShaderMaterial factory/runtime/fallback material under src/runtime/three/materials/**, renderable material slot schema, ReferenceResolver validation for material ids/slots/parameters/texture asset references, real Chromium shader compile tests with renderer.compileAsync, docs, final report, commits, and pushes. Keep renderStyle intact as the high-level built-in style path. Keep data as source of truth. Keep Three.js imports inside src/runtime/three/** and thin editor viewport glue only. Do not implement dissolve, material.parameter tracks, material.setParameter actions, shader globals, postprocessing, LOD, instancing, spherical world, gameplay, or multiplayer in this phase.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/phase-17-asset-budget-compression-final-report.md`
- `docs/phase-17-asset-budget-compression.md`
- `docs/phase-16-stylized-runtime-foundation-final-report.md`
- `docs/phase-16-stylized-runtime-foundation.md`
- `docs/developer-guide.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/Web3D_Shader_GLSL_MVP_支持度评估与实施计划.md`
- `docs/Web3D_Shader_研发方案与架构指南_GLSL_MVP.md`
- the main architecture guide referenced by `AGENTS.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Inspect these implementation areas before changing them:

- `package.json`
- `src/vite-env.d.ts`
- `src/schemas/component.schema.ts`
- `src/schemas/entity.schema.ts`
- `src/schemas/prefab.schema.ts`
- `src/schemas/level.schema.ts`
- `src/data/ReferenceResolver.ts`
- `src/data/validateProject.ts`
- `src/runtime/RuntimeTypes.ts`
- `src/runtime/WebRuntime.ts`
- `src/runtime/three/ThreeRuntime.ts`
- `src/runtime/three/ThreeMaterialRegistry.ts`
- `src/runtime/three/ThreeObjectResources.ts`
- `src/runtime/three/ThreeAssetLoader.ts`
- `tests/smoke/editor.spec.ts`
- `scripts/check-boundaries.ts`
- `scripts/validate-data.ts`
- `data/assets.manifest.json`
- `data/prefabs/**`
- `data/levels/**`

Current known context:

- Phase 17 is PASS in `docs/phase-17-asset-budget-compression-final-report.md`.
- Phase 17 added texture usage/colorSpace metadata policy, but there are currently no texture/image assets in `data/assets.manifest.json`.
- `renderStyle` and `ThreeMaterialRegistry` are Phase 16 built-in-style systems. Do not replace them with the shader runtime.
- The shader source planning docs may currently be untracked in Git. Round 18.1 must resolve this handoff risk: either include those docs in a phase-relevant docs commit or replace the roadmap references with tracked equivalents. Do not leave required reading untracked by the final handoff.
- Existing unrelated untracked files may include `docs/abeto_messenger_technology_research.pdf`, `docs/project-collaboration-brief.md`, and `tmp/`. Do not stage them unless the user explicitly asks.

## 2. What This Phase Must Complete

Phase 18 must complete:

- Renderer-neutral material contracts under `src/runtime/materials/**`.
- A public parameter model that separates material parameter names such as `progress` from internal uniform names such as `uProgress`.
- A material registry or equivalent lookup path for `materialId` and parameter definitions.
- `.glsl?raw` TypeScript declaration and `src/shaders/**` directory with a minimal test shader.
- Three-only material backend under `src/runtime/three/materials/**`.
- `THREE.ShaderMaterial` creation through a factory/runtime path, not scattered ad hoc object creation.
- Explicit fallback material creation for shader/material failures.
- A minimal renderable material slot schema while preserving existing `Renderable.renderStyle`.
- Reference validation for material ids, material slot names, parameter names, parameter value types, and texture asset references where applicable.
- A real browser shader compile test using Chromium and the actual Three renderer path, preferably `renderer.compileAsync(scene, camera)` when supported.
- Documentation for shader material authoring boundaries, S0 limitations, and Phase 19 handoff.
- Final Phase 18 report with validation, smoke, commits, push status, limitations, and next goal.

## 3. What This Phase Must Not Do

Do not:

- Implement the dissolve/open-gate story material. That is Phase 19.
- Add `material.parameter` timeline tracks. That is Phase 19.
- Add `material.setParameter` actions. That is Phase 19.
- Add Material Inspector MVP UI. That is Phase 19.
- Add shader globals such as `uTime`, `uDeltaTime`, viewport, or player position. That is Phase 20.
- Add hologram, scanline, or other second production material. That is Phase 20.
- Add `EffectComposer`, `ShaderPass`, `OutputPass`, or postprocessing parameter tracks. That is Phase 20.
- Add shader visual regression infrastructure beyond a minimal compile/preview fixture if needed for S0. Production visual regression is Phase 21.
- Add LOD, instancing, vegetation, spherical world, delivery gameplay, or multiplayer.
- Convert `renderStyle` into a shader system or remove Phase 16 palette-toon behavior.
- Put GLSL source in JSON, React components, or TypeScript template strings except for tiny test-only strings if a unit test explicitly needs them.
- Expose raw uniform names in data, timeline, event, or editor authoring contracts.
- Use `RawShaderMaterial`, custom shader DSL, Shader Graph, TSL, WGSL, transpilers, or `onBeforeCompile` patches.
- Import Three.js outside `src/runtime/three/**` and already accepted thin editor glue.
- Stage unrelated PDFs, temporary files, generated screenshots, or user changes.

## 4. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Inspect current files before editing.
3. Define the smallest coherent checkpoint.
4. Implement the checkpoint.
5. Run targeted tests first.
6. Run the relevant validation wrapper.
7. Run browser smoke when runtime, shader compile, or editor-visible behavior changed.
8. Run Debug self-check.
9. Run architecture self-check.
10. Inspect `git status --short --branch` and `git diff --stat`.
11. Stage only phase-relevant files.
12. Commit and push before starting the next round.
13. Report commit hash, push result, validation result, and buffer usage.

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
- If commit fails, do not proceed.
- If push fails, do not proceed.
- If smoke creates screenshots or reports, keep generated artifacts out of commits unless explicitly named as source files.
- If shader compile tests are flaky, stop and localize the failure before proceeding.

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

Smoke:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
```

Commit and push with explicit phase-relevant paths:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "feat: add phase 18 material runtime contracts" -Paths src\runtime\materials,src\runtime\materials\MaterialDefinition.test.ts,docs\phase-18-shader-glsl-material-runtime-foundation.md
```

Do not use broad staging commands such as `git add .`.

## 6. Round Budget

Total: 16 rounds.

- Main implementation: rounds 18.1 through 18.12.
- Buffer fixes: rounds 18.13 through 18.15.
- Final validation and handoff: round 18.16.

The roadmap's earlier 6-round estimate is a coarse planning estimate. This goal-mode guide splits Phase 18 into smaller commit-and-push checkpoints because material contracts, data validation, Three runtime integration, GLSL source imports, browser compile tests, and docs touch several layers.

### Round 18.1: Baseline Audit And S0 Design Lock

Goal:

- Confirm the Phase 17 baseline and lock the Phase 18 S0 implementation design.

Work:

- Inspect status, recent commits, existing render style runtime, asset metadata, ReferenceResolver, schemas, and smoke tests.
- Create `docs/phase-18-shader-glsl-material-runtime-foundation.md`.
- Resolve the shader-doc tracking risk: the two Web3D Shader docs must be tracked or replaced by tracked equivalents before the final handoff.
- Document file boundaries, material contract shape, test shader plan, fallback policy, compile-test strategy, and non-scope.
- Evaluate whether the `three` dependency should remain caret-pinned or become exact. Record the decision; do not change dependency policy without validation.
- Do not change runtime behavior yet.

Validation:

```powershell
git diff --check
rg "Phase 18|Shader GLSL|MaterialRuntime|ShaderMaterial" docs/phase-18-shader-glsl-material-runtime-foundation.md docs/abeto-messenger-development-plan.md
```

Debug self-check:

- Can the plan explain the smallest fixture that proves GLSL import, material registration, application, compile, and dispose?
- Are success, compile failure, missing material id, invalid parameter, missing texture, and fallback states listed?
- Are required shader planning docs tracked or explicitly queued for a phase-relevant commit?

Architecture self-check:

- Does the design keep data as source of truth?
- Does it keep Three material code inside `src/runtime/three/**`?
- Does it keep `renderStyle` intact and separate from `MaterialRuntime`?
- Does it avoid Phase 19+ scope?

### Round 18.2: Renderer-Neutral Material Contracts

Goal:

- Add material runtime contract types without Three.js dependencies.

Work:

- Add `src/runtime/materials/MaterialParameter.ts`.
- Add `src/runtime/materials/MaterialDefinition.ts`.
- Add `src/runtime/materials/MaterialRegistry.ts`.
- Add `src/runtime/materials/MaterialRuntime.ts`.
- Define supported S0 parameter value types such as number, boolean, color, vec2, vec3, and texture asset references.
- Add unit tests for parameter defaults, validation, registry lookup, duplicate ids, and public-name vs uniform-name separation.

Validation:

```powershell
npm run test -- src/runtime/materials
npm run typecheck
```

Debug self-check:

- Can invalid defaults and unsupported parameter types fail with actionable errors?
- Are public parameter names distinct from raw uniform names?
- Is texture parameter handling defined without requiring a full texture loader in this round?

Architecture self-check:

- Are there no Three imports in `src/runtime/materials/**`?
- Do contracts avoid editor/React state?
- Does this avoid timeline/action integration?

### Round 18.3: Material Definition Registry And Built-in Test Definition

Goal:

- Make material definitions discoverable and testable through a stable registry path.

Work:

- Add a default material registry factory or equivalent.
- Add a minimal test/debug material definition for S0, for example `debug.solid-color` or `debug.uv-gradient`.
- Keep production story materials out of this round.
- Add tests proving missing ids, duplicate ids, unknown parameters, and invalid texture parameter references are caught by registry helpers.

Validation:

```powershell
npm run test -- src/runtime/materials
npm run typecheck
```

Debug self-check:

- Can a test identify the material definition by id and enumerate public parameters?
- Are parameter defaults deterministic?
- Are failure messages useful to data validators and editor tooling?

Architecture self-check:

- Does the registry stay renderer-neutral?
- Does the test/debug material avoid becoming a story dissolve material?
- Are raw uniforms still hidden from data-facing APIs?

### Round 18.4: Renderable Material Slot Schema

Goal:

- Extend data schemas so renderables may reference material slots without replacing `renderStyle`.

Work:

- Extend the Renderable component schema to support optional `materials` slot mapping.
- Define a stable JSON shape such as slot name -> `materialId` plus public `parameters`.
- Preserve existing `Renderable.model` and `Renderable.renderStyle` behavior.
- Add schema tests for valid material slot references, invalid slot names, invalid material ids, and invalid parameter value shapes.
- Avoid changing demo data unless a minimal fixture is clearly needed for validation.

Validation:

```powershell
npm run test -- src/schemas
npm run validate-data
```

Debug self-check:

- Do existing prefabs and levels remain valid?
- Can invalid material slot data fail without breaking renderStyle-only entities?
- Are raw uniform names absent from schema examples?

Architecture self-check:

- Does schema code stay renderer-neutral?
- Does the data shape preserve `data/**/*.json` as source of truth?
- Does this avoid material timeline/action work?

### Round 18.5: ReferenceResolver Material Validation

Goal:

- Validate material references across prefabs and levels.

Work:

- Wire material registry definitions into project validation without importing Three.
- Validate `materialId`, public parameter names, public parameter value types, and texture asset references for renderable materials.
- Validate texture parameter asset ids against `data/assets.manifest.json` and require asset type `texture` or `image`.
- Add tests in `src/data/ReferenceResolver` or `validateProject` coverage.
- Keep formal demo data unchanged unless a valid fixture is needed.

Validation:

```powershell
npm run test -- src/data
npm run validate-data
```

Debug self-check:

- Are missing material, unknown parameter, wrong parameter type, and wrong texture asset type covered?
- Are errors path-specific enough for JSON authoring?
- Can current demo data pass unchanged?

Architecture self-check:

- Does validation use renderer-neutral registry definitions?
- Does data validation avoid constructing Three materials?
- Does this avoid editor UI and timeline scope?

### Round 18.6: GLSL Raw Import Foundation

Goal:

- Add the project-level GLSL import path for S0.

Work:

- Add or update `src/vite-env.d.ts` with `*.glsl?raw` declarations.
- Add `src/shaders/materials/debug/` or equivalent.
- Add minimal vertex and fragment GLSL files for the S0 test material.
- Keep GLSL in `.glsl` files, not TypeScript template strings.
- Add a TypeScript test or build check proving `?raw` imports are typed.

Validation:

```powershell
npm run typecheck
npm run build
```

Debug self-check:

- Does a clean typecheck understand `.glsl?raw` imports?
- Are shader files minimal and deterministic?
- If import aliases are used, are they already supported by the current Vite/TS config?

Architecture self-check:

- Are shader sources outside JSON and React components?
- Does this avoid custom include parsers or shader DSLs?
- Are shader files scoped to S0 test/debug material only?

### Round 18.7: Three Material Factory And Fallback Material

Goal:

- Add the Three-only factory that turns a material definition into a Three material.

Work:

- Add `src/runtime/three/materials/ThreeMaterialFactory.ts`.
- Add `src/runtime/three/materials/createFallbackMaterial.ts`.
- Add a factory for the S0 test/debug shader material using `THREE.ShaderMaterial`.
- Map public parameters to internal uniforms inside the Three backend only.
- Add unit tests with Three material objects where deterministic.

Validation:

```powershell
npm run test -- src/runtime/three
npm run typecheck
npm run check-boundaries
```

Debug self-check:

- Can factory failures produce a fallback material and structured error data?
- Are public parameter values mapped to the intended uniforms?
- Are material dispose semantics understood?

Architecture self-check:

- Are all Three imports inside `src/runtime/three/**`?
- Does the factory consume renderer-neutral definitions instead of duplicating schema semantics?
- Does it avoid postprocessing and shader globals?

### Round 18.8: ThreeMaterialRuntime Binding Skeleton

Goal:

- Add runtime state that can bind material instances to entity/object slots.

Work:

- Add `src/runtime/three/materials/ThreeMaterialRuntime.ts`.
- Implement minimal entity/slot to material-instance binding for loaded Object3D meshes.
- Preserve existing model loading, cloned resources, palette-toon renderStyle, selection/highlight, and fallback placeholder behavior.
- Define share vs clone policy for S0; prefer conservative per-instance ownership unless sharing is explicitly safe.
- Add tests for bind, set public parameter, fallback, and dispose.

Validation:

```powershell
npm run test -- src/runtime/three
npm run build
npm run check-boundaries
```

Debug self-check:

- Can failures be localized to definition lookup, factory creation, object binding, or disposal?
- Do missing slots fail gracefully?
- Does disposal avoid leaking owned shader materials?

Architecture self-check:

- Does runtime binding stay inside Three runtime?
- Does React not own per-frame or material-instance state?
- Does this preserve Phase 16 `renderStyle` behavior for entities without custom material slots?

### Round 18.9: Runtime Integration With Renderable Materials

Goal:

- Wire optional renderable material slots into runtime object creation without changing existing demo semantics.

Work:

- Connect renderable `materials` data to `ThreeMaterialRuntime` in the Three runtime path.
- Apply custom materials only when data explicitly requests them.
- Ensure placeholder objects and ordinary palette-toon objects still render.
- Add tests proving custom material application and default renderStyle fallback can coexist.

Validation:

```powershell
npm run test -- src/runtime/three src/data src/schemas
npm run validate-data
npm run build
```

Debug self-check:

- Can the current Gate Demo still render without custom material data?
- Does a test fixture apply the S0 material to a mesh slot?
- Are missing custom materials recoverable through fallback?

Architecture self-check:

- Does runtime integration avoid changing data semantics outside Renderable materials?
- Does it avoid material timeline/action behavior?
- Are all Three details still hidden from data and schemas?

### Round 18.10: Browser Shader Compile Test

Goal:

- Prove the S0 shader compiles in real Chromium through the actual Three renderer path.

Work:

- Add a Playwright or browser smoke test that creates or loads a minimal scene using the S0 shader material.
- Use `renderer.compileAsync(scene, camera)` when supported by the current Three version, with a safe fallback if needed.
- Ensure `renderer.debug.checkShaderErrors` is enabled or explicitly set in the relevant test/runtime path.
- Capture useful diagnostics when compile fails: material id, shader stage/source path when known, and browser/runtime context where practical.
- Keep visual assertions minimal for S0; Phase 21 owns broad visual regression.

Validation:

```powershell
npm run test:smoke
npm run build
```

Debug self-check:

- Does a bad shader fail the test in a controlled fixture or targeted unit?
- Can compile failure be localized to shader source, material factory, renderer setup, or browser capabilities?
- Does the test avoid relying on screenshots alone?

Architecture self-check:

- Does the compile test exercise the actual Three backend?
- Does it avoid adding production dissolve behavior?
- Does it keep test-only helpers out of runtime user data?

### Round 18.11: Documentation And Authoring Guidance

Goal:

- Make the new material runtime understandable and safe for the next executor.

Work:

- Update `docs/developer-guide.md` with material definition authoring, public parameter names, `.glsl?raw` imports, fallback behavior, and validation rules.
- Update `docs/abeto-messenger-development-plan.md` only if Phase 18 status or guide pointer needs clarification.
- Update `docs/post-mvp-execution-workflow.md` if new shader compile smoke commands or validation commands are added.
- Document S0 limitations and Phase 19 handoff in `docs/phase-18-shader-glsl-material-runtime-foundation.md`.
- Do not claim Phase 18 PASS before final validation.

Validation:

```powershell
git diff --check
rg "MaterialRuntime|Shader GLSL|ShaderMaterial|\\.glsl\\?raw|Phase 18" docs/developer-guide.md docs/phase-18-shader-glsl-material-runtime-foundation.md docs/abeto-messenger-development-plan.md
```

Debug self-check:

- Can a fresh executor understand how to add a material definition without exposing raw uniforms?
- Are commands truthful to package scripts?
- Are S0 limitations explicit?

Architecture self-check:

- Do docs keep `renderStyle` and `MaterialRuntime` separate?
- Do docs defer dissolve, timeline/action, postprocessing, and globals?
- Are untracked source docs and unrelated files handled explicitly?

### Round 18.12: Integrated Validation And Smoke Readiness

Goal:

- Confirm S0 material runtime does not regress the editor/runtime demo.

Work:

- Run full validation.
- Run smoke.
- Run report-assets to ensure Phase 17 asset validation still passes.
- Fix only Phase 18 issues.
- Ensure docs align with actual command output.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run report-assets
git diff --check
```

Debug self-check:

- Does the current Gate Demo still load and render?
- Does the S0 shader compile test pass in Chromium?
- Are failures localizable to schema, registry, factory, runtime binding, shader source, or browser compile?

Architecture self-check:

- Are all Three/shader runtime changes isolated?
- Did validation avoid duplicating material semantics across schema, registry, and runtime?
- Are unrelated untracked files still uncommitted?

### Round 18.13: Buffer Fix Round 1

Use only for issues found in rounds 18.1-18.12.

Allowed work:

- Fix material contract validation bugs.
- Fix shader raw import typing.
- Fix browser compile test flakiness.
- Fix fallback material behavior.
- Fix boundary-check failures.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
npm run test:smoke
```

Also run targeted tests for the layer that caused the buffer use.

Self-check:

- What issue consumed the buffer?
- Which layer caused it?
- Why is the fix phase-scoped?

### Round 18.14: Buffer Fix Round 2

Use only if another issue remains.

Focus:

- ReferenceResolver edge cases.
- Material instance disposal.
- Existing renderStyle compatibility.
- Windows path or Vite raw import quirks.

Validation:

```powershell
npm run test
npm run validate-data
npm run build
npm run check-boundaries
```

Also run `Smoke.cmd` if runtime behavior changed.

Self-check:

- Did the fix avoid broader refactors?
- Are fallback states tested?
- Is the work pushed before continuing?

### Round 18.15: Buffer Fix Round 3

Use only for final release-blocking fixes.

Focus:

- Full validation failures.
- Browser shader compile or smoke failures.
- Missing documentation of S0 limits.
- Accidental unrelated staged files.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Self-check:

- Is this truly a Phase 18 blocker?
- Are all unrelated files excluded?
- Is there a clear final validation path?

### Round 18.16: Final Validation And Handoff

Goal:

- Close Phase 18 and prepare Phase 19 Shader Dissolve And Material Timeline handoff.

Work:

- Run full validation, smoke, asset report, and documentation checks.
- Confirm no forbidden Three.js imports or dynamic-code patterns.
- Confirm shader planning docs required by the roadmap are tracked or replaced by tracked docs.
- Confirm `renderStyle` still works for existing Gate Demo data.
- Confirm S0 shader compile test passes.
- Add `docs/phase-18-shader-glsl-material-runtime-foundation-final-report.md`.
- Update `docs/abeto-messenger-development-plan.md` if Phase 18 status should be recorded.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run report-assets
git diff --check
git status --short --branch
```

Debug self-check:

- Does the final report state exactly what changed?
- Are known limitations and Phase 19 handoff explicit?
- Can a fresh executor start the first story dissolve material without guessing?

Architecture self-check:

- Is all Three/ShaderMaterial implementation inside `src/runtime/three/**`?
- Do data/schema/runtime/editor boundaries still match `AGENTS.md`?
- Did Phase 18 avoid dissolve, material timeline/action, shader globals, postprocessing, LOD, instancing, spherical world, gameplay, and multiplayer scope?

## 7. PASS Criteria

Phase 18 passes only when:

- Renderer-neutral material contracts exist and are tested.
- Material definitions expose public parameters without leaking raw uniform names.
- `.glsl?raw` imports are explicitly typed and build successfully.
- At least one minimal test/debug shader lives in `src/shaders/**` as `.glsl` files.
- A Three-only material factory/runtime can create, apply, update, fallback, and dispose a minimal `THREE.ShaderMaterial`.
- `Renderable` data can optionally reference material slots without breaking existing `renderStyle`.
- Reference validation catches missing material ids, unknown parameters, invalid parameter values, and wrong texture asset references.
- A real Chromium shader compile test passes and fails usefully for compile errors.
- Existing Gate Demo data validates and still renders.
- No Three.js imports leak into renderer-neutral layers.
- No custom shader DSL, Shader Graph, TSL, WGSL, RawShaderMaterial default path, or postprocessing is introduced.
- `Validate.cmd` passes.
- `Smoke.cmd` passes.
- `npm run report-assets` passes.
- `git diff --check` passes.
- Developer/handoff docs are updated.
- Phase-relevant commits are pushed to `origin/main`.
- The final report records commit hashes, validation results, buffer usage, limitations, and Phase 19 handoff.

## 8. Final Report Template

Use this format:

```txt
Phase 18 Final Report

Status:
- PASS / BLOCKED

Completed:
- ...

Material runtime contracts:
- ...

Three ShaderMaterial runtime:
- ...

Schema and validation:
- ...

Browser shader compile tests:
- ...

Docs updated:
- ...

Validation:
- Validate.cmd: pass/fail
- Smoke.cmd: pass/fail
- npm run report-assets: pass/fail
- git diff --check: pass/fail
- boundary checks: pass/fail

Commits and push:
- <hash> <message> pushed to <remote>/<branch>

Buffer:
- consumed / not consumed
- reason if consumed

Known limitations:
- ...

Remaining blockers:
- ...

Recommended next goal:
Complete Phase 19 from docs/abeto-messenger-development-plan.md: Shader Dissolve And Material Timeline.
```
