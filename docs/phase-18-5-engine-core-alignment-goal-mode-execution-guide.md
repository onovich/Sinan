# Phase 18.5 Engine Core Alignment Goal Mode Execution Guide

Date: 2026-06-20
Status: Guide for an executor running Phase 18.5 in goal mode.

Phase 18.5 starts after the accepted Phase 18 Shader GLSL Material Runtime Foundation. Its job is to align the runtime/editor architecture with the Sinan Engine positioning before Phase 19 adds story materials, material timeline tracks, material actions, and Material Inspector work.

This phase is intentionally small. It creates the engine root and world boundary needed by later systems; it must not add gameplay, dissolve materials, shader globals, postprocessing, input gameplay, physics migration, spherical world logic, delivery jobs, multiplayer, or package identity migration.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 18.5 for Sinan: Engine Core Alignment. Read AGENTS.md, docs/abeto-messenger-development-plan.md, docs/engine-positioning-architecture-adjustment-plan.md, docs/phase-18-shader-glsl-material-runtime-foundation-final-report.md, docs/post-mvp-execution-workflow.md, docs/development-plan.md, docs/developer-guide.md, the main architecture guide, .codex/project-ops-workflow.json, and .codex/project-git-workflow.json. Implement only the lightweight engine-root checkpoint: add EngineSession, EngineLoop, EngineMode, a minimal renderer-neutral World, and EditorSessionBridge; move project load/update/render/dispose orchestration out of src/editor/Viewport.tsx; update boundary checks so new semantic directories such as src/engine/**, src/world/**, src/physics/**, src/input/**, src/ui/**, and src/renderer/** cannot import Three.js directly; preserve existing editor behavior, Gate Demo rendering, timeline preview, selection, transform editing, save/reload, and shader compile smoke. Do not implement Phase 19 dissolve/material timeline/action/UI work, do not migrate physics/events beyond boundary preparation, do not rename the package, and do not stage unrelated current workspace changes. Every round must run Debug self-check, architecture self-check, validation, commit, and push before proceeding.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/engine-positioning-architecture-adjustment-plan.md`
- `docs/phase-18-shader-glsl-material-runtime-foundation-final-report.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/development-plan.md`
- `docs/post-mvp-development-plan.md`
- `docs/developer-guide.md`
- `docs/Sinan_Scene_Director_研发方案与架构指南.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Inspect these implementation areas before changing them:

- `src/editor/Viewport.tsx`
- `src/editor/ViewportRuntimeStyle.test.ts`
- `src/runtime/WebRuntime.ts`
- `src/runtime/RuntimeTypes.ts`
- `src/runtime/RuntimeObjectHandle.ts`
- `src/runtime/three/ThreeRuntime.ts`
- `src/runtime/three/EditorCameraController.ts`
- `src/runtime/three/ThreeAssetLoader.ts`
- `src/runtime/three/materials/**`
- `src/runtime/materials/**`
- `src/events/ActionSystem.ts`
- `src/events/EventSystem.ts`
- `src/events/AabbTriggerSystem.ts`
- `src/director/DirectorSystem.ts`
- `src/director/TimelinePlayer.ts`
- `src/data/projectDataSelectors.ts`
- `src/data/validateProject.ts`
- `src/data/ReferenceResolver.ts`
- `src/schemas/**`
- `scripts/check-boundaries.ts`
- `tests/smoke/editor.spec.ts`
- `tests/smoke/shader-material.spec.ts`
- `data/levels/level_01.json`

Current known context:

- Phase 18 is PASS in `docs/phase-18-shader-glsl-material-runtime-foundation-final-report.md`.
- Phase 18 introduced renderer-neutral material contracts and Three-only shader material runtime code.
- `src/editor/Viewport.tsx` still acts as the implicit engine root for loading, frame loop, runtime object sync, rendering, and disposal.
- `WebRuntime` and `ThreeRuntime` are still valid boundaries. Do not delete or replace them in this phase.
- The product framing is now Sinan Engine. Scene Director is a first-party Director System inside the engine, not the whole engine root.
- Existing unrelated dirty or untracked files may be present. Do not stage PDFs, temporary folders, generated screenshots, package identity experiments, or unrelated user changes.

## 2. What This Phase Must Complete

Phase 18.5 must complete:

- `src/engine/EngineMode.ts` or equivalent renderer-neutral mode contract for at least `edit`, `play`, `preview`, and `showcase` readiness.
- `src/engine/EngineLoop.ts` or equivalent frame lifecycle coordinator with a clear update/render/dispose order.
- `src/engine/EngineSession.ts` or equivalent session root that owns project loading, runtime object instantiation, frame update, render delegation, and disposal orchestration.
- A minimal renderer-neutral world layer under `src/world/**` that can initialize from project/level data, query entities by id, expose transform reads/writes, and produce a test/debug snapshot without storing Three.js or React state.
- `src/editor/EditorSessionBridge.ts` or equivalent bridge that maps editor concerns such as selection, transforms, debug helper visibility, dirty/save state, and preview mode into the engine session without turning React into the runtime owner.
- `src/editor/Viewport.tsx` reduced to canvas mount, size handling, pointer/key routing, camera/editor input glue, and slow React state display.
- Boundary automation updated so `src/engine/**`, `src/world/**`, `src/physics/**`, `src/input/**`, `src/ui/**`, and `src/renderer/**` are covered by the no-Three-import policy unless a future adapter subtree is explicitly documented.
- Tests proving the new engine/session/world boundaries and existing editor/runtime behavior.
- Documentation and a final Phase 18.5 report with validation, smoke, commits, push status, limitations, and Phase 19 handoff.

## 3. What This Phase Must Not Do

Do not:

- Implement the dissolve/open-gate production material. That is Phase 19.
- Add `material.parameter` timeline tracks. That is Phase 19.
- Add `material.setParameter` actions. That is Phase 19.
- Add Material Inspector UI. That is Phase 19.
- Add shader globals, postprocessing, visual regression infrastructure, LOD, instancing, spherical world, delivery gameplay, or multiplayer.
- Migrate `AabbTriggerSystem` into a full physics layer. This phase may prepare boundary checks for `src/physics/**`, but the actual migration is later scope.
- Add a gameplay input system or player controller.
- Rename `package.json`, npm package identity, repository naming, or historical documentation. Product identity migration is a separate small phase/commit.
- Rewrite `WebRuntime` or `ThreeRuntime` wholesale.
- Store `THREE.Object3D`, Three material instances, DOM nodes, React state, or raw shader uniforms inside `src/world/**` or `src/engine/**`.
- Duplicate data validation, event, director, material, or render-style semantics inside editor components.
- Use `eval`, `new Function`, script strings, or unregistered dynamic dispatch.
- Stage unrelated PDFs, temporary files, generated screenshots, or user changes.

## 4. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Inspect current files before editing.
3. Define the smallest coherent checkpoint.
4. Implement the checkpoint.
5. Run targeted tests first.
6. Run relevant validation.
7. Run browser smoke when runtime, editor-visible behavior, frame lifecycle, shader compile, or viewport behavior changed.
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
- Whether buffer capacity was consumed

Progression rules:

- If validation fails, do not commit, do not push, and do not proceed.
- If validation is blocked by unrelated pre-existing dirty files, isolate the blocker, report it clearly, and do not stage unrelated fixes unless they are required to restore the project gate.
- If commit fails, do not proceed.
- If push fails, do not proceed.
- If browser smoke fails, localize whether the failure is session loading, loop timing, runtime adapter, editor bridge, DOM/canvas mount, shader compile, or test flake before editing further.
- If generated artifacts appear, keep them out of commits unless explicitly named as source artifacts.

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
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "feat: add engine session foundation" -Paths src\engine,src\world,src\editor\EditorSessionBridge.ts,src\editor\Viewport.tsx,scripts\check-boundaries.ts,docs\phase-18-5-engine-core-alignment-goal-mode-execution-guide.md
```

Do not use broad staging commands such as `git add .`.

## 6. Round Budget

Total: 3 rounds.

- Main implementation: rounds 18.5.1 through 18.5.2.
- Buffer fixes: limited buffer capacity inside round 18.5.3.
- Final validation and handoff: round 18.5.3.

This is shorter than the 16-round pattern because Phase 18.5 is a narrow architecture-alignment checkpoint. If the executor discovers that moving orchestration out of `Viewport.tsx` requires broad gameplay, physics, material, or editor rewrites, stop and report the scope expansion instead of silently consuming future phases.

### Round 18.5.1: Baseline Audit, Engine Contracts, And World Skeleton

Goal:

- Lock the minimal EngineSession/EngineLoop/World design and add renderer-neutral contract/skeleton code with tests.

Work:

- Inspect current status, recent commits, `Viewport.tsx`, `WebRuntime`, `ThreeRuntime`, material runtime wiring, editor store, smoke tests, and boundary checker.
- Create or update a short implementation note if the code shape differs from this guide.
- Add `EngineMode`, `EngineLoop`, and `EngineSession` interfaces/classes with no React or Three imports.
- Add minimal `World`, entity store/query, transform read/write, and snapshot support under `src/world/**`.
- Add unit tests proving `World` initializes from project/level data, queries entities by id, updates transforms, and produces snapshots without mutating source JSON unexpectedly.
- Update `scripts/check-boundaries.ts` to include the new semantic directories.
- Do not wire `Viewport.tsx` deeply yet except where a compile-safe skeleton import is required.

Validation:

```powershell
npm run test -- World EngineSession EngineLoop
npm run check-boundaries
git diff --check -- src scripts docs
```

Debug self-check:

- Can the new engine/world skeleton be explained by the smallest Gate Demo fixture?
- Can failures be localized to world initialization, transform mutation, session lifecycle, or boundary tooling?
- Are success, missing entity, empty world, invalid transform, stale snapshot, and dispose states represented or explicitly deferred?
- Did any test require a real Three renderer when a renderer-neutral test should have been enough?

Architecture self-check:

- Does `data/**/*.json` remain the source of truth?
- Do `src/engine/**` and `src/world/**` avoid Three, React, DOM, GLSL, and raw uniform imports?
- Does `EngineSession` orchestrate rather than reimplement `WebRuntime`, `ThreeRuntime`, material runtime, director, event, or data validation semantics?
- Did this round avoid Phase 19 dissolve/material timeline/action/UI scope?
- Were unrelated files and user changes left alone?

Expected commit:

```txt
feat: add engine core alignment contracts
```

### Round 18.5.2: Move Runtime Orchestration Out Of Viewport

Goal:

- Make `EngineSession` own project load/update/render/dispose orchestration while `Viewport.tsx` becomes editor surface and adapter glue.

Work:

- Move project loading, runtime object creation, frame update ordering, render delegation, resize handling delegation, and disposal orchestration from `src/editor/Viewport.tsx` into `EngineSession` and `EngineLoop`.
- Add `EditorSessionBridge` to connect selection, transform edits, debug helper visibility, preview/play/edit mode, camera/editor input, and slow React state to the session.
- Keep `WebRuntime` and `ThreeRuntime` as adapter/runtime facade boundaries. Add narrow methods only when required; do not replace them wholesale.
- Preserve renderStyle, shader material slot behavior, AABB debug helpers, timeline preview, camera shot preview, selection/picking, transform editing, save/reload, and existing smoke selectors.
- Add or update tests around `EditorSessionBridge`, `EngineSession` lifecycle, viewport runtime style behavior, and editor-visible flows impacted by the move.
- Update docs if public workflow or boundaries changed.

Validation:

```powershell
npm run test -- EngineSession EditorSessionBridge ViewportRuntimeStyle ThreeRuntime
npm run typecheck
npm run check-boundaries
npm run validate-data
```

Run smoke if viewport/runtime behavior changed:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
```

Debug self-check:

- Can runtime failures be localized to session load, engine loop, world sync, runtime adapter, editor bridge, or viewport mount?
- Are success, empty project, asset-load failure, invalid data, stale selection, disposed session, and resize states covered or explicitly deferred?
- Did any UI/runtime smoke verify that the Gate Demo still renders and remains interactive?
- If a shader material path changed, did shader compile smoke still pass?

Architecture self-check:

- Is `Viewport.tsx` now primarily canvas mount, size handling, pointer/key routing, camera/editor input glue, and slow React state display?
- Did editor code avoid duplicating world/runtime/director/material semantics?
- Did `World` avoid storing `THREE.Object3D`, React state, DOM nodes, and raw uniforms?
- Did `EngineSession` keep Director as orchestration logic rather than making Director own world/input/physics/material runtime?
- Were deferred Physics/Input/UI/Renderer directories only prepared by boundary policy, not implemented as broad systems?

Expected commit:

```txt
refactor: move viewport orchestration into engine session
```

### Round 18.5.3: Integrated Validation, Docs, And Final Report

Goal:

- Close Phase 18.5 with full validation, smoke, docs, final report, and a clean Phase 19 handoff.

Work:

- Fix issues found by integrated validation without expanding scope.
- Run the full validation wrapper and smoke wrapper.
- Review `scripts/check-boundaries.ts` output and make sure new semantic dirs are included.
- Review `git diff --stat` and `git status --short --branch` to make sure only Phase 18.5 files are staged.
- Update roadmap entry points only where necessary.
- Create `docs/phase-18-5-engine-core-alignment-final-report.md`.
- The final report must include status, completed work, validation, smoke, boundary evidence, commits, push status, known limitations, and Phase 19 recommended next goal.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
rg "Phase 18.5|Engine Core Alignment|EngineSession|EngineLoop|EditorSessionBridge" docs src scripts
```

Debug self-check:

- Can every remaining failure be localized to a specific layer before any fix is attempted?
- Do smoke and unit tests cover the user workflows that Phase 18.5 promised to preserve?
- Are empty, stale, disposed, incompatible, and failure states either tested or listed as limitations?
- Did final docs match actual validation results instead of planned results?

Architecture self-check:

- Does the source-of-truth layer remain data-first?
- Does Three.js stay inside `src/runtime/three/**` and accepted thin editor glue?
- Are engine/world/editor/runtime/director/material responsibilities separated enough for Phase 19 to add material commands without returning orchestration to `Viewport.tsx`?
- Did the phase avoid package rename, gameplay, physics migration, material timeline, material action, shader globals, postprocessing, and UI inspector scope?
- Are unrelated files, generated outputs, and user changes left alone?

Expected commit:

```txt
docs: finalize phase 18.5 engine core alignment
```

## 7. PASS Criteria

Phase 18.5 is PASS only when all of these are true:

- `EngineSession`, `EngineLoop`, and `EngineMode` exist and are covered by tests or direct validation.
- Minimal renderer-neutral `World` exists, initializes from current level/project data, supports entity queries and transform read/write, and has tests.
- `EditorSessionBridge` exists and reduces direct runtime ownership in `Viewport.tsx`.
- `Viewport.tsx` no longer owns the bulk of project load/update/render/dispose orchestration.
- Existing editor behavior remains intact: Gate Demo opens, canvas renders nonblank, selection works, transform editing works, timeline preview still works, save/reload remains valid, and shader compile smoke still passes.
- Boundary checks cover `src/engine/**`, `src/world/**`, `src/physics/**`, `src/input/**`, `src/ui/**`, and `src/renderer/**` according to the current policy.
- No Three.js, React, DOM, GLSL, or raw shader uniform dependencies leak into `src/engine/**` or `src/world/**`.
- `Validate.cmd` passes.
- `Smoke.cmd` passes.
- `git diff --check` passes.
- Phase 18.5 final report exists.
- All Phase 18.5 commits are pushed to `origin/main`.

## 8. Validation Matrix

| Area | Required validation |
| --- | --- |
| Engine/session contracts | Unit tests for lifecycle, load/update/render delegation, dispose, and mode handling |
| World | Unit tests for level initialization, entity query, transform read/write, snapshot, missing entity |
| Editor bridge | Unit or component tests for selection/transform/debug state bridging where practical |
| Viewport preservation | Existing viewport/runtime style tests plus smoke |
| Material/shader preservation | Existing material runtime tests and shader compile smoke |
| Data safety | `npm run validate-data`, migration check through `Validate.cmd` |
| Boundaries | `npm run check-boundaries`, manual review of new semantic dirs |
| Full gate | `Validate.cmd`, `Smoke.cmd`, `git diff --check` |

## 9. Final Report Template

Create `docs/phase-18-5-engine-core-alignment-final-report.md` using this structure:

```markdown
# Phase 18.5 Engine Core Alignment Final Report

Date: <date>

## Status

PASS or BLOCKED.

## Completed

- ...

## Engine Root

- EngineSession:
- EngineLoop:
- EngineMode:
- EditorSessionBridge:

## World Boundary

- ...

## Viewport Responsibility Reduction

- ...

## Boundary Checks

- ...

## Validation

- Validate.cmd:
- Smoke.cmd:
- Targeted tests:
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

Complete Phase 19 from docs/abeto-messenger-development-plan.md: Shader Dissolve And Material Timeline. Start only after Phase 18.5 is PASS and pushed.
```

## 10. Phase 19 Handoff Notes

After Phase 18.5 passes, Phase 19 should use the new engine root instead of putting material timeline/action behavior into `Viewport.tsx`.

Phase 19 should route material parameter changes through data schemas, director/event systems, and `MaterialRuntime` public parameter names. Director, events, editor UI, and timeline tracks must not reference raw uniforms such as `uProgress`.
