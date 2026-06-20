# Phase 19 Shader Dissolve And Material Timeline Goal Mode Execution Guide

Date: 2026-06-20
Status: Guide for an executor running Phase 19 in goal mode.

Phase 19 starts after the accepted Phase 18.5 Engine Core Alignment. Its job is to prove that the Phase 18 GLSL material runtime can drive real story/demo behavior through data, timeline sampling, event actions, runtime adapter commands, and a small editor inspection surface.

This phase must deliver one production story material, deterministic material parameter animation, action-driven material parameter changes, and an editor-facing Material Inspector MVP without leaking Three.js, GLSL source, or raw uniform names into data, director, events, schemas, editor UI, or engine/world layers.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 19 for Sinan: Shader Dissolve And Material Timeline. Read AGENTS.md, docs/abeto-messenger-development-plan.md, docs/phase-18-shader-glsl-material-runtime-foundation-final-report.md, docs/phase-18-5-engine-core-alignment-final-report.md, docs/engine-positioning-architecture-adjustment-plan.md, docs/Web3D_Shader_GLSL_MVP_支持度评估与实施计划.md, docs/Web3D_Shader_研发方案与架构指南_GLSL_MVP.md, docs/post-mvp-execution-workflow.md, docs/development-plan.md, docs/developer-guide.md, the main architecture guide, .codex/project-ops-workflow.json, and .codex/project-git-workflow.json. Implement Phase 19 only: add a production dissolve/open-gate GLSL material with public parameters such as progress/edgeWidth/edgeColor/noiseScale; add texture/noise asset metadata if needed; extend material registry and Three material factory/runtime support; add material.parameter timeline track schema, sampling, director/runtime integration, validation, and tests; add material.setParameter action schema/registry/runtime bridge/validation/tests; add Material Inspector MVP controls for public material parameters and validation state; add a visual fixture or smoke path proving material parameters change over time; update docs and final report. Use EngineSession and EditorSessionBridge for runtime integration. Keep data as source of truth. Do not expose raw uniforms such as uProgress in data or editor UI. Keep Three.js inside src/runtime/three/** and accepted thin editor glue. Do not add shader globals, postprocessing, LOD, instancing, spherical world, gameplay input, physics migration, multiplayer, shader graph, TSL, WGSL, or package identity migration. Every round must run Debug self-check, architecture self-check, validation, commit, and push before proceeding.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/phase-18-shader-glsl-material-runtime-foundation-final-report.md`
- `docs/phase-18-5-engine-core-alignment-final-report.md`
- `docs/phase-18-shader-glsl-material-runtime-foundation-goal-mode-execution-guide.md`
- `docs/phase-18-5-engine-core-alignment-goal-mode-execution-guide.md`
- `docs/engine-positioning-architecture-adjustment-plan.md`
- `docs/Web3D_Shader_GLSL_MVP_支持度评估与实施计划.md`
- `docs/Web3D_Shader_研发方案与架构指南_GLSL_MVP.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/development-plan.md`
- `docs/post-mvp-development-plan.md`
- `docs/developer-guide.md`
- `docs/Sinan_Scene_Director_研发方案与架构指南.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Inspect these implementation areas before changing them:

- `src/runtime/materials/**`
- `src/runtime/three/materials/**`
- `src/runtime/three/ThreeRuntime.ts`
- `src/runtime/WebRuntime.ts`
- `src/runtime/RuntimeTypes.ts`
- `src/engine/EngineSession.ts`
- `src/editor/EditorSessionBridge.ts`
- `src/editor/Viewport.tsx`
- `src/schemas/material.schema.ts`
- `src/schemas/timeline.schema.ts`
- `src/schemas/action.schema.ts`
- `src/data/ReferenceResolver.ts`
- `src/data/validateProject.ts`
- `src/events/actionRegistry.ts`
- `src/events/ActionSystem.ts`
- `src/events/types.ts`
- `src/director/TimelinePlayer.ts`
- `src/director/PropertyTrackPlayer.ts`
- `src/director/DirectorSystem.ts`
- `src/director/ActionTrackPlayer.ts`
- `src/editor/panels/InspectorPanel.tsx`
- `src/editor/panels/TimelinePanel.tsx`
- `src/editor/panels/EventInspector.tsx`
- `src/editor/store/editorStore.ts`
- `tests/smoke/editor.spec.ts`
- `tests/smoke/shader-material.spec.ts`
- `data/assets.manifest.json`
- `data/levels/level_01.json`
- `data/prefabs/**`
- `data/timelines/**`
- `data/events/**`
- `public/**`

Current known context:

- Phase 18 is PASS and created renderer-neutral `MaterialDefinition`, `MaterialRegistry`, `MaterialRuntime`, GLSL raw import support, a debug shader material, renderable material slots, validation, and Chromium shader compile smoke.
- Phase 18.5 is PASS and moved runtime orchestration behind `EngineSession` and `EditorSessionBridge`.
- `MaterialRuntime.setParameter` already exists, but the Three backend currently only supports runtime parameter updates for the S0 debug material.
- Only the `main` material slot is currently supported.
- Current demo data is still mostly render-style driven; Phase 19 should add explicit custom material data only where needed for the story material proof.
- Existing unrelated dirty or untracked files may be present. Do not stage PDFs, temporary folders, generated screenshots, package identity experiments, or unrelated user changes.

## 2. What This Phase Must Complete

Phase 19 must complete:

- A first production story material, preferably `story.gate-dissolve` or another stable lowercase id chosen after inspecting current demo data.
- Separate vertex and fragment GLSL files under `src/shaders/**` for the production material.
- Public material parameters such as `progress`, `edgeWidth`, `edgeColor`, `noiseScale`, and an optional texture/data asset parameter. The exact set must be documented and tested.
- Correct texture/noise asset metadata in `data/assets.manifest.json` and `public/**` if the material needs a texture asset.
- Material registry entries and validation for the new material definition.
- Three material factory/runtime support for creating, applying, updating, resetting, and disposing the production material.
- Runtime parameter updates for the production material through public parameter names, not raw uniforms.
- `material.parameter` timeline track schema with deterministic sampling of public material parameter values.
- Timeline/director integration that drives `MaterialRuntime.setParameter` or a renderer-neutral runtime command path during playback and scrub.
- `material.setParameter` action schema, registry handler, runtime bridge, validation, and tests.
- Reference validation for material timeline/action targets, slot names, parameter names, value types, and texture references where applicable.
- A Material Inspector MVP in the editor that displays and edits public material parameters for selected renderable materials without exposing GLSL or raw uniform names.
- Smoke or visual fixture coverage proving that the dissolve material compiles and visibly changes when timeline/action/editor parameter updates run.
- Documentation and a final Phase 19 report with validation, smoke, commits, push status, limitations, and Phase 20 handoff.

## 3. What This Phase Must Not Do

Do not:

- Add shader globals such as `uTime`, `uDeltaTime`, viewport size, camera position, or player position. That is Phase 20.
- Add a second production material. That is Phase 20.
- Add `EffectComposer`, postprocessing passes, or postprocess parameter tracks. That is Phase 20.
- Add shader visual regression infrastructure beyond a small Phase 19 fixture or smoke assertion needed for the dissolve material. Production visual regression is Phase 21.
- Add LOD, instancing, vegetation, spherical world, delivery gameplay, player controller, input system, physics migration, multiplayer, runtime UI, or package identity migration.
- Add shader graph, visual material editor, TSL, WGSL, transpilers, `RawShaderMaterial`, arbitrary `onBeforeCompile` patching, or GLSL source in JSON.
- Convert `renderStyle` into a shader runtime or remove Phase 16 palette-toon behavior.
- Put raw uniforms such as `uProgress`, `uEdgeColor`, or GLSL source paths in data, timeline, event, editor UI, director, engine, world, or schema-facing contracts.
- Put Three.js imports outside `src/runtime/three/**` and already accepted thin editor glue.
- Add runtime orchestration back into `src/editor/Viewport.tsx`.
- Stage unrelated PDFs, temporary files, generated screenshots, or user changes.

## 4. Architecture Boundaries

Data and schema:

- `data/**/*.json` remains the source of truth for material assignments, timeline tracks, actions, and texture asset references.
- Schemas define public authoring contracts only: material ids, entity ids, slot names, parameter names, and typed parameter values.
- Validation must reject unknown material ids, unsupported slots, unknown parameters, wrong value types, missing texture assets, and raw uniform-like parameter names.

Runtime and renderer:

- `src/runtime/materials/**` stays renderer-neutral.
- `src/runtime/three/materials/**` owns Three `ShaderMaterial`, texture objects, uniforms, shader sources, fallback materials, compile diagnostics, and disposal.
- `WebRuntime`/`RuntimeTypes` may expose narrow renderer-neutral material parameter commands if needed; they must not expose Three types.
- `EngineSession` may route material commands to the runtime, but it must not know uniforms or GLSL internals.

Director and events:

- Timeline tracks and actions use public material parameter names such as `progress`.
- Director/event systems dispatch parameter changes through registry/runtime command paths.
- Preview/scrub behavior must be deterministic and must avoid unsafe side effects.

Editor:

- Material Inspector MVP displays public material definitions and current/default/overridden values.
- Editor UI must not duplicate material registry semantics; it should consume shared definitions or selector helpers.
- UI smoke must cover at least one real material parameter interaction if the inspector changes visible behavior.

## 5. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Inspect current files before editing.
3. Define the smallest coherent checkpoint.
4. Implement the checkpoint.
5. Run targeted tests first.
6. Run relevant validation.
7. Run browser smoke when runtime, shader compile, editor-visible behavior, timeline preview, or material pixels changed.
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
- If validation is blocked by unrelated pre-existing dirty files, isolate the blocker, report it clearly, and do not stage unrelated fixes unless the user explicitly approves or the fix is required for the phase gate.
- If commit fails, do not proceed.
- If push fails, do not proceed.
- If shader compile or smoke fails, localize whether the failure is GLSL source, texture loading, material factory, material runtime, timeline sampling, action dispatch, engine session routing, editor UI, or Playwright timing before editing further.
- If generated artifacts appear, keep them out of commits unless explicitly named as source assets.

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

Commit and push with explicit phase-relevant paths:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "feat: add dissolve material definition" -Paths src\runtime\materials,src\runtime\three\materials,src\shaders,data\assets.manifest.json,public\textures,docs\phase-19-shader-dissolve-material-timeline-goal-mode-execution-guide.md
```

Do not use broad staging commands such as `git add .`.

## 7. Round Budget

Total: 16 rounds.

- Main implementation: rounds 19.1 through 19.12.
- Buffer fixes: rounds 19.13 through 19.15.
- Final validation and handoff: round 19.16.

The roadmap's 6-round estimate is the high-level planning estimate. This goal-mode guide splits Phase 19 into smaller commit-and-push checkpoints because the phase touches shader sources, asset metadata, material runtime, timeline schemas, action registries, editor UI, validation, and browser smoke.

### Round 19.1: Baseline Audit And Phase 19 Design Lock

Goal:

- Confirm the Phase 18.5 baseline and lock the exact Phase 19 implementation design.

Work:

- Inspect current status, recent commits, dirty files, material runtime contracts, Three material backend, timeline/player code, action registry, editor inspector, smoke tests, and data assets.
- Create or update `docs/phase-19-shader-dissolve-material-timeline.md` with the chosen production material id, public parameters, asset plan, target demo entity, timeline/action integration path, inspector MVP shape, smoke strategy, and explicit non-scope.
- Decide whether the first material uses a generated data/noise texture asset or an inline procedural GLSL noise function. If a texture is used, plan exact asset manifest metadata and file path.
- Decide the material target for the demo proof after inspecting current level/prefab ids. Prefer an existing visible gate/door entity so smoke can observe the behavior.
- Do not change runtime behavior yet.

Validation:

```powershell
git diff --check -- docs
rg "Phase 19|Shader Dissolve|material.parameter|material.setParameter|progress" docs/phase-19-shader-dissolve-material-timeline.md docs/abeto-messenger-development-plan.md
```

Debug self-check:

- Can the plan explain the smallest user-visible workflow that proves material assignment, timeline scrub, action dispatch, inspector editing, compile, and fallback?
- Can failures be localized to shader source, material definition, asset metadata, runtime binding, timeline sampling, action dispatch, editor UI, or smoke?
- Are success, missing material, unsupported slot, unknown parameter, wrong parameter type, missing texture, compile failure, stale selection, and disposed runtime states covered or explicitly deferred?

Architecture self-check:

- Does data remain the source of truth?
- Does the design keep Three/GLSL/texture implementation inside `src/runtime/three/**` and `src/shaders/**`?
- Does Phase 19 use `EngineSession`/`EditorSessionBridge` instead of returning orchestration to `Viewport.tsx`?
- Does the design avoid Phase 20+ shader globals/postprocessing and gameplay scope?
- Are unrelated files and user changes left alone?

Expected commit:

```txt
docs: lock phase 19 dissolve material plan
```

### Round 19.2: Production Material Definition And Asset Metadata

Goal:

- Add the renderer-neutral material definition and any required asset metadata for the production dissolve material.

Work:

- Add the production material definition under `src/runtime/materials/**` or the current built-in material registry pattern.
- Use public parameters such as `progress`, `edgeWidth`, `edgeColor`, `noiseScale`, and optional texture parameter names. Choose final names and document them.
- Register the material in the default material registry without changing the debug material behavior.
- Add tests for material id validity, default values, parameter validation, public parameter names, and rejection of raw uniform-like names.
- If a texture is required, add a small source asset under `public/**` and metadata to `data/assets.manifest.json` with correct texture/data usage and budget metadata.
- Update asset report expectations only if required by existing tests.

Validation:

```powershell
npm run test -- MaterialRegistry BuiltInMaterials AssetReport
npm run validate-data
npm run report-assets
git diff --check -- src data public docs
```

Debug self-check:

- Can invalid parameter definitions and missing texture metadata be explained by targeted tests?
- Can texture failures be localized to asset manifest, public file path, colorSpace/usage metadata, or material definition?
- Are empty/default parameter states and incompatible parameter types covered?

Architecture self-check:

- Does the material definition avoid GLSL source, raw uniforms, and Three types?
- Does texture metadata distinguish color textures from data/noise/mask textures?
- Did `renderStyle` remain independent from custom material assignment?
- Did the phase avoid applying the material to demo data before runtime support exists?

Expected commit:

```txt
feat: register dissolve material definition
```

### Round 19.3: GLSL Sources And Three Material Factory

Goal:

- Add production GLSL files and Three material factory support for the dissolve material.

Work:

- Add separate vertex and fragment shader files under `src/shaders/materials/**`.
- Add a typed source module importing the GLSL files with `?raw`.
- Extend `ThreeMaterialFactory` so the production material creates a `THREE.ShaderMaterial` with internal uniforms mapped from public parameters.
- Add texture loading/assignment plumbing only inside `src/runtime/three/**` if the material uses a texture asset.
- Keep fallback material behavior explicit when shader/material creation fails.
- Add tests for factory success, default uniforms, public-to-uniform mapping, texture parameter handling if applicable, and fallback errors.

Validation:

```powershell
npm run test -- ThreeMaterialFactory debugUvGradientShaders
npm run typecheck
npm run check-boundaries
git diff --check -- src
```

Debug self-check:

- Can shader/factory failures be localized to GLSL import, factory parameter mapping, texture resolution, or fallback creation?
- Are compile-source existence, default parameters, invalid parameter values, and fallback paths covered?
- Is the material visually designed to show progress changes in a smoke fixture?

Architecture self-check:

- Are `THREE.ShaderMaterial`, textures, and uniforms confined to `src/runtime/three/**`?
- Are public parameters mapped to uniforms only in the Three backend?
- Did no data/schema/editor code learn names like `uProgress`?
- Did this round avoid timeline/action/editor UI scope?

Expected commit:

```txt
feat: create dissolve shader material
```

### Round 19.4: Three Material Runtime Parameter Updates

Goal:

- Make the production material support runtime parameter updates through `MaterialRuntime.setParameter`.

Work:

- Extend `ThreeMaterialRuntime` parameter update handling for the production material.
- Keep debug material update behavior unchanged.
- Ensure `getParameter`, `resetParameter`, disposal, reapply, fallback material, and missing binding behavior remain deterministic.
- Add tests for setting `progress`, edge parameters, texture/data parameters where applicable, reset to defaults, unsupported parameter, unsupported slot, missing binding, and disposal.
- If needed, refactor material-specific parameter application into local helpers under `src/runtime/three/materials/**` without creating a broad abstraction prematurely.

Validation:

```powershell
npm run test -- ThreeMaterialRuntime ThreeMaterialFactory MaterialRegistry
npm run typecheck
npm run check-boundaries
git diff --check -- src
```

Debug self-check:

- Can failures be localized to binding, registry validation, public parameter mapping, uniform mutation, fallback material, or disposal?
- Are stale binding and disposed entity cases covered?
- Does reset behavior restore public default values?

Architecture self-check:

- Does runtime parameter update code stay in the Three material backend?
- Does `MaterialRuntime` remain renderer-neutral?
- Did no timeline/action/editor code bypass `MaterialRuntime.setParameter`?
- Were unrelated runtime facades left intact?

Expected commit:

```txt
feat: update dissolve material parameters at runtime
```

### Round 19.5: Demo Material Assignment And Reference Validation

Goal:

- Assign the production material to a visible demo object through data and make validation catch bad references.

Work:

- Add or update demo data so a visible gate/door-like object uses the production material in the `main` slot.
- Preserve existing renderStyle behavior for ordinary objects.
- Extend `ReferenceResolver` if needed so material assignments validate material ids, supported slots, parameter names, parameter value types, and texture asset references.
- Add tests for valid assignment and invalid material id, slot, parameter, value type, missing texture, and wrong asset type.
- Keep the demo visually legible if the material fails by relying on explicit fallback behavior.

Validation:

```powershell
npm run test -- validateProject ReferenceResolver MaterialRegistry
npm run validate-data
npm run report-assets
npm run check-boundaries
git diff --check -- src data public
```

Debug self-check:

- Can data validation failures be localized to asset, prefab, level entity, material id, slot, parameter, or value type?
- Is the valid demo assignment visible without breaking existing Gate Demo flow?
- Are fallback and invalid data states tested?

Architecture self-check:

- Is the material assignment expressed in JSON data, not hard-coded in runtime/editor code?
- Does validation stay data-first and renderer-neutral?
- Did Three material creation remain runtime-only?
- Did this round avoid timeline/action scope until the demo material binding is stable?

Expected commit:

```txt
feat: assign dissolve material to demo data
```

### Round 19.6: Browser Compile And Visual Fixture For Dissolve Material

Goal:

- Prove the production material compiles and visibly changes in Chromium.

Work:

- Extend or add a smoke fixture that creates/applies the production material through the real runtime path.
- Assert the shader compiles with the actual renderer.
- Add a pixel or rendered-state assertion proving different `progress` values produce a visible change.
- Keep generated screenshots or trace artifacts out of Git unless explicitly required as source references.
- Keep the S0 debug shader compile smoke intact.

Validation:

```powershell
npm run test:smoke -- shader-material
npm run test -- ThreeMaterialRuntime ThreeMaterialFactory
git diff --check -- tests src
```

Debug self-check:

- Can visual failures be localized to GLSL compile, material factory, runtime parameter update, texture load, camera/lighting, or pixel assertion threshold?
- Are both `progress = 0` and `progress = 1` or equivalent states tested?
- Does fallback produce a clear diagnostic instead of silent black/blank rendering?

Architecture self-check:

- Does the smoke use the runtime/material path instead of one-off ad hoc Three code where practical?
- Does it avoid adding production semantics to test-only code?
- Did no raw uniform names enter data or editor contracts?

Expected commit:

```txt
test: compile dissolve material in chromium
```

### Round 19.7: material.parameter Timeline Schema And Sampling

Goal:

- Add schema and deterministic sampling for material parameter timeline tracks.

Work:

- Add a `material.parameter` timeline track schema with target entity id, slot, parameter name, keys, and typed public parameter values.
- Reuse existing material parameter value schema/types where possible.
- Add a `MaterialParameterTrackPlayer` or equivalent renderer-neutral sampler under `src/director/**`.
- Add tests for number interpolation, color/vec behavior as appropriate, boolean/string handling if supported, clamping, sorted/unsorted keys, duplicate times, and invalid schemas.
- Update timeline sorting/start-time logic to include the new track type.

Validation:

```powershell
npm run test -- timelineSchemas TimelinePlayer MaterialParameterTrackPlayer
npm run typecheck
npm run check-boundaries
git diff --check -- src
```

Debug self-check:

- Can sampling failures be localized to schema parsing, key sorting, interpolation, clamping, or target resolution?
- Are empty keys, invalid value types, and incompatible interpolation states rejected or documented?
- Does sampling use public parameter values only?

Architecture self-check:

- Is the track renderer-neutral and free of Three/uniform concepts?
- Does it preserve existing `property` track behavior?
- Did this round avoid event action and editor UI scope?
- Are timeline data contracts validated before runtime use?

Expected commit:

```txt
feat: add material parameter timeline track
```

### Round 19.8: Timeline Playback And Scrub Runtime Integration

Goal:

- Route material parameter samples from timeline playback/scrub to the runtime through the engine/session path.

Work:

- Extend director or preview integration so `material.parameter` tracks call a renderer-neutral runtime command or `MaterialRuntime.setParameter` path through `WebRuntime`/`EngineSession`.
- Ensure playback and scrub are deterministic and preview-safe.
- Preserve existing action, property, animation, camera, subtitle, and sound track behavior.
- Add tests for playback, seek/scrub, repeated samples, stopped timeline state, missing target, missing material binding, and runtime errors.
- Update smoke coverage or existing timeline smoke if it can observe material progress changes.

Validation:

```powershell
npm run test -- DirectorSystem TimelinePlayer MaterialParameterTrackPlayer ViewportRuntimeStyle EngineSession
npm run typecheck
npm run check-boundaries
```

Run smoke if editor-visible timeline behavior changed:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
```

Debug self-check:

- Can runtime failures be localized to sampler, director, engine session, WebRuntime command, ThreeMaterialRuntime, or material binding?
- Are playback, scrub, rewind, repeated preview, missing target, and missing binding states covered?
- Does smoke or a test prove timeline scrub visibly changes the material?

Architecture self-check:

- Does Director stay renderer-neutral?
- Does EngineSession route commands without knowing uniforms or GLSL?
- Does timeline preview avoid unsafe side effects?
- Did `Viewport.tsx` remain an editor surface, not the material orchestration root?

Expected commit:

```txt
feat: drive material parameters from timelines
```

### Round 19.9: material.setParameter Action Schema And Registry

Goal:

- Add action-driven material parameter changes through the registry path.

Work:

- Add `material.setParameter` to `src/schemas/action.schema.ts` with entity id, slot, parameter, and typed value.
- Register the action in `ActionRegistry` with an appropriate side-effect classification.
- Route the action through runtime/director command context without exposing Three or uniforms.
- Add registry coverage and action tests for dispatch, preview behavior, invalid action data, missing target, unknown parameter, wrong value type, and runtime error handling.
- Preserve existing actions and custom function behavior.

Validation:

```powershell
npm run test -- events actionRegistry RegistryCoverageValidator action
npm run validate-data
npm run typecheck
npm run check-boundaries
git diff --check -- src data
```

Debug self-check:

- Can action failures be localized to schema, registry, context command, runtime bridge, or material runtime?
- Are success, missing entity, unknown material binding, unknown parameter, wrong value type, and preview side-effect states covered?
- Does the action use public parameter names only?

Architecture self-check:

- Does `ActionRegistry` remain the only action dispatch path?
- Does data validation cover action references before runtime?
- Did no editor UI or runtime code dispatch unregistered action strings?
- Did this round avoid timeline UI/editor inspector scope?

Expected commit:

```txt
feat: add material set parameter action
```

### Round 19.10: Demo Timeline And Event Integration

Goal:

- Add a small demo story path that uses the dissolve material through timeline and/or event action data.

Work:

- Update or add timeline data so a material parameter changes during an existing visible sequence such as open-gate.
- Update or add event data so `material.setParameter` can set a deterministic material state where useful.
- Keep the demo compact and readable; do not add new gameplay loops.
- Extend `ReferenceResolver` tests and data validation for the new timeline/action references.
- Update existing smoke if it can assert timeline preview changes material state or pixels.

Validation:

```powershell
npm run test -- validateProject TimelinePlayer DirectorSystem events
npm run validate-data
npm run test:smoke -- editor
npm run report-assets
git diff --check -- data src tests
```

Debug self-check:

- Can demo failures be localized to JSON data, reference validation, timeline sampling, action dispatch, runtime binding, or pixel assertion?
- Does the demo still pass existing open-gate, save/reload, timeline preview, and transform workflows?
- Are invalid references caught before runtime?

Architecture self-check:

- Is story behavior data-driven?
- Does the demo use the new engine/session route?
- Did no gameplay, input, physics, or spherical world scope slip in?
- Were existing demo semantics preserved unless explicitly changed?

Expected commit:

```txt
feat: add dissolve material demo sequence
```

### Round 19.11: Material Inspector MVP

Goal:

- Add editor controls for inspecting and editing public material parameters.

Work:

- Add a Material Inspector MVP in or near the existing Inspector panel for selected entities with renderable material slots.
- Display material id, slot, public parameter names, default/current/overridden values where practical, and validation state.
- Add controls appropriate to parameter types: slider/number for numeric values, swatch/color input for colors, checkbox for booleans, text or selector for strings/textures where supported.
- Route edits through existing command/editor state patterns where data is modified, and through preview/runtime bridge only when previewing.
- Do not expose GLSL, shader file paths, raw uniforms, or Three objects.
- Add unit/component tests for rendering the panel, validation messages, editing a parameter, and preserving unrelated entity data.

Validation:

```powershell
npm run test -- InspectorPanel EditorPanelsSmoke editorStore material
npm run typecheck
npm run check-boundaries
git diff --check -- src
```

Debug self-check:

- Can UI failures be localized to selector data, parameter schema, editor command, runtime preview, validation state, or React rendering?
- Are selected entity, no material, invalid material, unsupported type, dirty state, and undo/redo boundaries covered or documented?
- If UI changed, is there repeatable component or smoke coverage?

Architecture self-check:

- Does editor UI consume shared material definitions instead of duplicating registry semantics?
- Are mutations command-backed where they change data?
- Does React avoid per-frame material animation state?
- Did the inspector stay an MVP, not a shader graph or visual material editor?

Expected commit:

```txt
feat: add material inspector mvp
```

### Round 19.12: Editor Smoke And Authoring Documentation

Goal:

- Prove the editor workflow and document Phase 19 authoring boundaries.

Work:

- Extend Playwright smoke to cover one visible material workflow: select the material-bearing entity, inspect public parameters, scrub or play the material timeline, and verify visible pixel/state change where practical.
- Ensure existing smoke remains stable: shader compile, styled runtime, transform gizmo, timeline preview, save/reload, and narrow viewport containment.
- Update `docs/developer-guide.md` and/or `docs/phase-19-shader-dissolve-material-timeline.md` with material authoring guidance, parameter naming rules, timeline/action examples, inspector behavior, and troubleshooting.
- Document limitations and Phase 20 handoff.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run test
npm run validate-data
git diff --check -- docs tests src data
```

Debug self-check:

- Can smoke failures be localized to selector fragility, timeline timing, material runtime, shader compile, texture load, or pixel threshold?
- Are save/reload and preview states still stable after material inspector changes?
- Do docs match actual commands and behavior?

Architecture self-check:

- Does smoke exercise public material paths only?
- Do docs reinforce no raw uniforms in authoring contracts?
- Did no Phase 20 globals/postprocessing language imply implemented behavior?
- Were generated artifacts excluded?

Expected commit:

```txt
test: cover material timeline editor workflow
```

### Round 19.13: Buffer Fix Round 1

Goal:

- Fix validation, smoke, or architecture issues found after main implementation without expanding scope.

Work:

- Run targeted failing tests first.
- Fix only Phase 19 defects.
- Prefer small fixes with tests over broad refactors.
- Update docs if behavior changed.

Validation:

```powershell
npm run test
npm run typecheck
npm run check-boundaries
git diff --check
```

Debug self-check:

- Is each fix tied to a reproducible failure?
- Can the failure be localized to one layer before changing code?
- Did the fix add or adjust a focused test?

Architecture self-check:

- Did the fix avoid widening material/editor/runtime contracts beyond Phase 19?
- Are unrelated files untouched?
- Did the buffer round remain within Phase 19 scope?

Expected commit:

```txt
fix: stabilize phase 19 material timeline
```

### Round 19.14: Buffer Fix Round 2

Goal:

- Resolve remaining browser, shader, data, or editor stability issues.

Work:

- Focus on smoke stability, shader compile diagnostics, data validation, and UI containment.
- Tighten fallback/error messages if failures are hard to interpret.
- Do not add new features.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run test -- shader material timeline action Inspector
npm run validate-data
git diff --check
```

Debug self-check:

- Are flaky failures separated from real regressions?
- Are shader errors actionable?
- Are stale/disposed runtime states covered?

Architecture self-check:

- Did no raw uniform or Three dependency leak into semantic layers?
- Did error handling stay in the right layer?
- Did unrelated dirty files remain unstaged?

Expected commit:

```txt
fix: harden dissolve material smoke path
```

### Round 19.15: Buffer Fix Round 3

Goal:

- Use only if integrated validation still finds Phase 19 defects.

Work:

- Fix last blockers before final report.
- If no blockers remain, skip this round and record it as unused in the final report.
- Do not use this round for Phase 20 features.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Debug self-check:

- Is there a clear failure that justifies consuming this buffer round?
- Is the fix minimal and test-backed?
- Are docs updated only where behavior actually changed?

Architecture self-check:

- Did the phase stay within dissolve/material timeline/action/editor inspector scope?
- Are new contracts still renderer-neutral?
- Are unrelated changes excluded?

Expected commit:

```txt
fix: close phase 19 validation blockers
```

### Round 19.16: Final Validation And Handoff

Goal:

- Close Phase 19 with full validation, smoke, final docs, and Phase 20 handoff.

Work:

- Run full validation and smoke from the project wrappers.
- Run `git diff --check`.
- Confirm all Phase 19 commits are pushed.
- Review `git status --short --branch` and ensure unrelated dirty files are not staged.
- Create `docs/phase-19-shader-dissolve-material-timeline-final-report.md`.
- Update roadmap entry points so Phase 20 is the next active implementation phase.
- The final report must include status, completed work, validation, smoke, shader/material evidence, timeline/action/editor evidence, commits, push status, known limitations, and Phase 20 recommended next goal.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
rg "Phase 19|Shader Dissolve|material.parameter|material.setParameter|Material Inspector|Phase 20" docs src data tests
```

Debug self-check:

- Can every remaining failure be localized before the final report is written?
- Do smoke and tests cover the material workflows Phase 19 promised?
- Are empty, missing, stale, disposed, fallback, compile-failure, incompatible, and invalid-reference states either tested or listed as limitations?
- Does the final report match actual validation results and commit hashes?

Architecture self-check:

- Does data remain the source of truth?
- Do engine/world/director/event/editor/runtime/material responsibilities remain separated?
- Does Three.js stay inside `src/runtime/three/**` and accepted thin editor glue?
- Did the phase avoid shader globals, postprocessing, LOD, instancing, spherical world, gameplay, physics/input migration, multiplayer, and package identity scope?
- Are unrelated files, generated outputs, and user changes left alone?

Expected commit:

```txt
docs: finalize phase 19 shader dissolve timeline
```

## 8. PASS Criteria

Phase 19 is PASS only when all of these are true:

- A production dissolve/open-gate material exists with separate GLSL vertex/fragment sources.
- The material is registered through renderer-neutral material definitions and uses public parameters.
- Three runtime factory/runtime can create, apply, update, reset, fallback, and dispose the production material.
- Browser shader compile coverage passes for the production material.
- A visible material change is proven by smoke or a deterministic browser fixture.
- Demo data can assign the material to a visible object through renderable material slots.
- `material.parameter` timeline tracks are schema-backed, sampled deterministically, validated, and routed to runtime material parameter updates.
- `material.setParameter` actions are schema-backed, registry-backed, validated, tested, and routed to runtime material parameter updates.
- Material Inspector MVP can inspect and edit public material parameters without exposing raw uniforms or GLSL.
- Timeline playback and scrub can drive a material parameter deterministically.
- Events/actions can set material parameters through the registry path.
- Invalid material ids, unsupported slots, unknown parameters, wrong parameter value types, missing texture assets, and wrong texture asset types fail with actionable validation errors.
- `Validate.cmd` passes.
- `Smoke.cmd` passes.
- `git diff --check` passes.
- Phase 19 final report exists.
- All Phase 19 commits are pushed to `origin/main`.

## 9. Validation Matrix

| Area | Required validation |
| --- | --- |
| Material definition | Unit tests for id, defaults, public parameter metadata, raw uniform rejection |
| Asset metadata | `validate-data`, `report-assets`, missing/wrong texture asset tests if texture is used |
| GLSL/Three factory | Unit tests for factory creation, uniform mapping, fallback, texture assignment |
| Material runtime | Unit tests for apply, set, get, reset, dispose, unsupported slot, missing binding |
| Timeline schema | Schema tests for `material.parameter`, keys, target, slot, parameter, values |
| Timeline sampling | Unit tests for deterministic interpolation/clamping/scrub/playback |
| Runtime integration | Director/EngineSession/WebRuntime tests proving material parameter commands reach runtime |
| Actions | Schema, registry, side-effect, dispatch, validation, runtime bridge tests |
| Editor inspector | Component tests and/or smoke for selected entity material parameter display/edit |
| Browser shader | Chromium compile test and visible parameter-change fixture |
| Full gate | `Validate.cmd`, `Smoke.cmd`, `git diff --check` |

## 10. Final Report Template

Create `docs/phase-19-shader-dissolve-material-timeline-final-report.md` using this structure:

```markdown
# Phase 19 Shader Dissolve And Material Timeline Final Report

Date: <date>

## Status

PASS or BLOCKED.

## Completed

- ...

## Production Material

- Material id:
- Public parameters:
- GLSL sources:
- Texture/data assets:
- Fallback behavior:

## Timeline Integration

- `material.parameter` schema:
- Sampling:
- Playback/scrub route:

## Action Integration

- `material.setParameter` schema:
- Registry side effect:
- Runtime route:

## Material Inspector

- ...

## Validation

- Validate.cmd:
- Smoke.cmd:
- Targeted tests:
- Shader compile:
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

Complete Phase 20 from docs/abeto-messenger-development-plan.md: Shader Globals And Postprocessing Ramp. Start only after Phase 19 is PASS and pushed.
```

## 11. Phase 20 Handoff Notes

After Phase 19 passes, Phase 20 may add shared shader globals, a second material, material sharing/cloning hardening, and the first controlled postprocessing runtime pass.

Phase 20 must build on the Phase 19 public parameter path. It should not introduce raw uniforms into timeline/action/editor contracts, and it should keep postprocessing entirely under renderer/runtime adapter boundaries.
