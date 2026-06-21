# Phase 22 LOD Instancing And Vegetation Goal Mode Execution Guide

Date: 2026-06-21
Status: Guide for an executor running Phase 22 in goal mode.

Phase 22 starts after Phase 21.5 Engine Maturity And External Infrastructure Contract Gate is PASS and pushed. The accepted baseline is `b56471d docs: finalize phase 21.5 contract gate` on `main` / `origin/main`.

The goal of this phase is to make repeated objects and distant content controllable through Sinan-owned data contracts, deterministic runtime behavior, Three `InstancedMesh` support, and smoke/perf evidence. Phase 22 uses traditional data-driven LOD with preauthored or offline-generated LOD assets. It must not implement UE Nanite-style virtualized geometry, runtime dynamic mesh reduction, runtime decimation, meshlet streaming, WebGPU geometry pipelines, or external asset-pipeline dependencies.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 22 for Sinan: LOD, Instancing, And Vegetation. Start only after Phase 21.5 is PASS and pushed; the accepted baseline is b56471d docs: finalize phase 21.5 contract gate. Read AGENTS.md, docs/development-plan.md, docs/abeto-messenger-development-plan.md, docs/post-mvp-execution-workflow.md, docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md, docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-goal-mode-execution-guide.md, docs/phase-21-5-poc-sequencing-and-roadmap-routing.md, docs/strategy/adapter-boundary-policy.md, docs/rfcs/rfc-001-sinan-asset-boundary.md, docs/phase-21-shader-production-quality-gate-final-report.md, docs/developer-guide.md, docs/Sinan_Scene_Director_研发方案与架构指南.md, .codex/project-ops-workflow.json, and .codex/project-git-workflow.json before editing. Implement Phase 22 only: add data-first LOD contracts, schema validation, runtime types, deterministic LOD selection with hysteresis or equivalent anti-popping behavior, low-end profile LOD bias, deterministic seeded scatter data, Three InstancedMesh rendering for at least one repeated prop or vegetation group, draw-call/triangle/runtime-memory perf signals where practical, smoke/perf coverage, docs, and a Phase 22 final report. Keep data/**/*.json as the source of truth. Keep Three.js, GLTF, InstancedMesh, geometry/material cloning, renderer counters, and mesh traversal details inside src/runtime/three/** and test/smoke fixtures. Use traditional preauthored/offline-generated LOD assets; do not implement runtime dynamic mesh reduction, Nanite-style virtualized geometry, meshlet streaming, new external dependencies, Indirection runtime replacement, InputFlow, ViewRig, LudoWeave, Inscape, Physics, Audio, Runtime UI, spherical world, gameplay controller, delivery gameplay, multiplayer, or Phase 23 scope. Every round must run Debug self-check, architecture self-check, validation, commit, and push before proceeding.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `docs/development-plan.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md`
- `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-goal-mode-execution-guide.md`
- `docs/phase-21-5-poc-sequencing-and-roadmap-routing.md`
- `docs/strategy/adapter-boundary-policy.md`
- `docs/strategy/mature-dependency-evaluation-template.md`
- `docs/strategy/adapter-compatibility-matrix-template.md`
- `docs/rfcs/rfc-001-sinan-asset-boundary.md`
- `docs/rfcs/rfc-004-sinan-camera-pose-shot-rig-boundary.md`
- `docs/phase-21-shader-production-quality-gate-final-report.md`
- `docs/phase-21-shader-production-quality-gate-goal-mode-execution-guide.md`
- `docs/developer-guide.md`
- `docs/Sinan_Scene_Director_研发方案与架构指南.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Inspect these implementation areas before changing them:

- `data/assets.manifest.json`
- `data/levels/**`
- `data/prefabs/**`
- `src/schemas/asset.schema.ts`
- `src/schemas/component.schema.ts`
- `src/schemas/entity.schema.ts`
- `src/schemas/level.schema.ts`
- `src/data/ReferenceResolver.ts`
- `src/runtime/RuntimeTypes.ts`
- `src/runtime/WebRuntime.ts`
- `src/runtime/three/ThreeRuntime.ts`
- `src/runtime/three/ThreeAssetLoader.ts`
- `src/runtime/three/ThreeObjectResources.ts`
- `src/runtime/three/ThreeStyleDecorators.ts`
- `src/runtime/three/ThreeEnvironmentStyle.ts`
- `src/runtime/three/ThreeRuntime.test.ts`
- `tests/smoke/editor.spec.ts`
- `scripts/validate-data.ts`
- `scripts/report-assets.ts`
- `scripts/check-boundaries.ts`

Current known context:

- Phase 17 added asset budget, compression metadata, compression loader policy, and `report-assets`.
- Phase 18 through Phase 21 created production shader/material/postprocess contracts and a shader quality gate.
- Phase 21.5 is PASS and defines adapter/RFC boundaries. Phase 22 may use RFC-001 asset boundary as a guardrail, but must not make Indirection or any external asset project a hard dependency.
- `data/assets.manifest.json` already includes asset metadata such as `lodGroup` and `instancing` hints. Phase 22 may refine or extend those contracts only through Sinan-owned schemas and validation.
- Three.js imports remain forbidden outside `src/runtime/three/**` and accepted thin editor glue.
- Existing unrelated dirty or untracked files may be present. Do not stage unrelated external docs, strategy notes, generated screenshots, local reports, or user changes.

## 2. What This Phase Must Complete

Phase 22 must complete:

- A documented Phase 22 design lock for traditional LOD, instancing, and vegetation, including the explicit decision not to implement runtime dynamic mesh reduction or Nanite-style virtualized geometry.
- LOD schema and runtime types for at least:
  - LOD group id or asset relationship.
  - Ordered LOD levels.
  - Distance or screen-coverage thresholds.
  - Hysteresis or equivalent anti-popping margin.
  - Optional low-end bias.
  - Fallback behavior for missing or invalid LOD assets.
- Data validation for LOD definitions and references.
- At least one asset or renderable path with three LOD levels.
- Runtime LOD selection that is deterministic and test-covered.
- Three runtime LOD switching that stays inside `src/runtime/three/**`.
- Low-end profile behavior that selects more aggressive LODs through a public renderer-neutral quality/profile contract, not through Three-specific data.
- Instance scatter schema and runtime types for deterministic seeded placement.
- At least one repeated prop or vegetation scatter group rendered through Three `InstancedMesh`.
- Deterministic scatter tests that prove seed stability and validation of empty/missing/incompatible states.
- Perf or smoke evidence around draw calls, triangle estimates, and runtime memory/resource signals where practical.
- Editor/runtime smoke that proves the demo scene still renders, LOD switching is visible or observable, and instancing does not break picking/selection expectations beyond documented limitations.
- Documentation updates explaining the Phase 22 contracts, how future assets should add LODs and instance scatter, and how perf failures should be triaged.
- `docs/phase-22-lod-instancing-and-vegetation-final-report.md` with validation, smoke, perf evidence, commits, pushed status, limitations, and Phase 23 handoff.

## 3. What This Phase Must Not Do

Do not:

- Implement UE Nanite-style virtualized geometry, runtime dynamic mesh reduction, runtime mesh decimation, meshlet streaming, hierarchical GPU-driven culling, or WebGPU geometry pipelines.
- Install or require external asset-pipeline, mesh simplification, vegetation, physics, audio, input, UI, or narrative dependencies.
- Replace the Sinan asset manifest, `ReferenceResolver`, or Three loader with Indirection or another external loader.
- Add real Indirection, InputFlow, ViewRig, LudoWeave, Inscape, Physics, Audio, Runtime UI, or narrative adapters.
- Start Phase 23 spherical world, gameplay input, player controller, physics migration, delivery gameplay, multiplayer, or compact planet work.
- Put Three classes, `InstancedMesh`, GLTF loader details, geometry/material cloning details, draw-call counters, or renderer memory counters into `data/**/*.json`, schemas outside renderer-neutral contracts, editor state, events, director, or gameplay semantics.
- Let React own per-frame LOD decisions, scatter simulation, instancing transforms, renderer resource accounting, or camera-distance sampling.
- Use random scatter without deterministic seeds and testable output.
- Hide missing LOD assets or scatter assets behind silent fallbacks. Fallbacks must be explicit, observable in diagnostics or tests, and safe for smoke.
- Commit generated Playwright output, local screenshots, ad hoc perf logs, or temporary reports unless the guide explicitly marks them as stable source fixtures.
- Stage unrelated untracked files, external reference docs, package experiments, generated outputs, or user changes.

## 4. Architecture Boundaries

Data and schema:

- `data/**/*.json` remains the source of truth for asset references, LOD group declarations, scatter groups, and authored transform intent.
- Schemas own valid ranges, references, ordering rules, uniqueness, and fallback requirements.
- LOD definitions must reference public asset ids, not file paths or Three objects.
- Scatter definitions must be deterministic: seed, source asset/prefab id, placement shape, count, transform ranges, and optional material/style hooks must be reviewable and validated.

Runtime and world:

- Renderer-neutral runtime types may expose LOD and instancing concepts such as selected level, quality profile, scatter instance transforms, and perf summaries.
- Runtime/world/director layers may route stable renderer-neutral data, but must not import `three`.
- Per-frame camera sampling and LOD selection may live in runtime/world systems only when the contract stays renderer-neutral. Three-specific object switching belongs under `src/runtime/three/**`.

Three runtime:

- `src/runtime/three/**` owns `InstancedMesh`, GLTF scene traversal, geometry/material extraction, clone/dispose policy, renderer counters, draw-call sampling, and Three-specific fallback objects.
- Three runtime may create internal helper classes for LOD groups, instanced groups, scatter objects, diagnostics, and perf counters.
- Three runtime must preserve existing material, shader global, postprocess, transform gizmo, editor camera, selection, and debug helper behavior.

Testing and smoke:

- Unit tests should cover schema parsing, LOD selection, hysteresis, low-end bias, scatter determinism, fallback diagnostics, and resource disposal.
- Smoke tests should cover the visible editor/runtime path and any perf/draw-call counters used as acceptance evidence.
- Perf checks must be deterministic and local. If the local browser/hardware cannot produce stable memory metrics, record that limitation and rely on draw calls, instance count, triangle estimates, and renderer info counters.

External infrastructure:

- RFC-001 and Phase 21.5 adapter policy are guardrails. Phase 22 may prepare an asset manifest report or catalog dry-run only if it does not replace the runtime loader and does not create a hard dependency.
- Offline LOD generation is allowed as a future asset pipeline strategy, but Phase 22 runtime uses preauthored/offline-generated LOD assets and deterministic selection.

## 5. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Confirm Phase 21.5 final report is PASS and pushed before implementation starts.
3. Inspect current status, dirty files, and implementation files before editing.
4. Define the smallest coherent checkpoint.
5. Implement the checkpoint.
6. Run targeted tests first.
7. Run relevant validation.
8. Run browser smoke when runtime rendering, Three behavior, editor-visible state, perf counters, or pixels changed.
9. Run Debug self-check.
10. Run architecture self-check.
11. Inspect status and diff.
12. Stage only Phase 22-relevant files.
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
- If validation is blocked by unrelated pre-existing dirty files, isolate the blocker, report it clearly, and do not stage unrelated fixes unless the user explicitly approves or the fix is required for the phase gate.
- If commit fails, do not proceed.
- If push fails, do not proceed.
- If LOD selection or instancing smoke fails, localize whether the failure is schema, data, reference resolution, LOD selector, quality profile, scatter generator, Three asset loading, geometry/material extraction, `InstancedMesh`, renderer counters, browser timing, or UI/editor shell before editing further.
- If generated artifacts appear, keep them out of commits unless explicitly named as source fixtures.
- If Phase 23 or external adapter work appears in the current diff, stop and remove it from the Phase 22 commit scope unless the user explicitly changes the phase.

Reusable self-checks for every round:

Debug self-check:

- Can the current change be explained by the smallest relevant fixture or user workflow?
- Can failures be localized to a specific layer such as schema, data validation, reference resolver, LOD selector, quality profile, scatter generator, Three asset loader, geometry/material extraction, InstancedMesh runtime, renderer counters, browser smoke, tooling, CLI, or UI?
- Are success, failure, empty, stale, missing asset, invalid threshold, incompatible geometry, low-end profile, fallback, disposal, and generated-output states covered where relevant?
- If UI changed, was a repeatable smoke or component verification added?
- If state changed, are export/import, validate, migration, report-assets, boundary check, and runtime disposal boundaries covered?

Architecture self-check:

- Does `data/**/*.json` remain the source of truth for LOD, scatter, asset, prefab, and level semantics?
- Did host/editor/UI code avoid duplicating runtime, selector, scatter, validation, asset loading, or renderer accounting semantics?
- Are public capability/schema contracts, binding/mapping, diagnostics/audit, and runtime state still separated?
- Did the phase avoid dynamic mesh reduction, external dependencies, Phase 23, and unrelated engine-module scope?
- Are unrelated files, generated outputs, and user changes left alone?
- Does Three.js remain inside `src/runtime/three/**` and accepted thin editor glue?
- Are Three-specific objects, renderer counters, GLTF details, and InstancedMesh internals kept out of data, events, director, engine, schemas outside renderer-neutral contracts, and authoring docs?

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

Commit and push with explicit Phase 22 paths:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "feat: add lod runtime selection" -Paths src\schemas,src\runtime,src\data,data,tests,scripts,docs\phase-22-lod-instancing-and-vegetation-goal-mode-execution-guide.md,docs\phase-22-lod-instancing-and-vegetation-final-report.md,docs\developer-guide.md,docs\development-plan.md,docs\abeto-messenger-development-plan.md,docs\post-mvp-execution-workflow.md
```

Adjust `-Paths` per round so only touched, phase-relevant files are staged. Do not use broad staging commands such as `git add .`.

## 7. Round Budget

Total: 12 rounds.

- Main implementation: rounds 22.1 through 22.8.
- Buffer fixes: rounds 22.9 through 22.10.
- Integrated validation and hardening: round 22.11.
- Final validation and handoff: round 22.12.

The roadmap's 5-round estimate is the high-level planning estimate. This goal-mode guide splits Phase 22 into smaller commit-and-push checkpoints because the phase touches data contracts, runtime selection, Three instancing, asset data, perf smoke, docs, and final handoff. It is shorter than the default 16-round implementation pattern because the phase must not implement external adapters, runtime decimation, spherical world, gameplay input, physics, audio, or Runtime UI.

## 8. Round Plan

### Round 22.1: Baseline Audit And LOD Design Lock

Goal:

- Confirm the Phase 21.5 baseline and lock the Phase 22 design as traditional data-driven LOD plus deterministic instancing/vegetation.

Work:

- Confirm `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md` is PASS and pushed.
- Inspect current asset manifest, prefab data, level data, schema files, Three runtime, asset loader, existing smoke tests, and asset reports.
- Inventory existing model assets and decide which asset or new generated test asset will represent three LOD levels.
- Decide whether LOD thresholds use distance, screen coverage, or a hybrid. Prefer the smallest deterministic model that can be tested in unit and smoke.
- Lock the no-runtime-decimation decision in docs: Phase 22 uses preauthored/offline-generated LOD assets and runtime selection only.
- Update only docs if implementation design needs to be made explicit before source edits.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
rg "Phase 22|LOD|Instancing|Vegetation|runtime dynamic mesh reduction|Nanite|InstancedMesh" docs\abeto-messenger-development-plan.md docs\phase-21-5-engine-maturity-external-infrastructure-contract-gate-final-report.md docs\phase-22-lod-instancing-and-vegetation-goal-mode-execution-guide.md
git diff --check
```

Expected commit:

```txt
docs: lock phase 22 lod instancing plan
```

### Round 22.2: LOD Schema And Data Contract

Goal:

- Add the source-of-truth LOD data contract and validation.

Work:

- Add or extend schemas for LOD groups, levels, thresholds, hysteresis, low-end bias, fallback, and asset references.
- Keep LOD definitions renderer-neutral and asset-id based.
- Add unit tests for valid three-level LOD, invalid ordering, duplicate levels, missing fallback, negative thresholds, stale asset ids, and low-end bias bounds.
- Update data validation flow so bad LOD data fails `npm run validate-data`.
- Avoid Three runtime changes in this round unless a type-only seam is required.

Validation:

```powershell
npm run test -- schema lod validate-data
npm run validate-data
git diff --check
```

Expected commit:

```txt
feat: add lod schema contract
```

### Round 22.3: LOD Selection Runtime

Goal:

- Add deterministic renderer-neutral LOD selection logic.

Work:

- Add runtime types and a pure selector for distance or screen-coverage thresholds.
- Implement hysteresis or equivalent anti-popping behavior.
- Implement low-end profile bias without leaking Three details into the selector.
- Add tests for forward/backward camera movement, threshold edges, missing current state, disabled LOD, low-end profile, and fallback level.
- Keep selection independent from React and Three scene objects.

Validation:

```powershell
npm run test -- lod selector runtime
npm run typecheck
git diff --check
```

Expected commit:

```txt
feat: add deterministic lod selection
```

### Round 22.4: Three Runtime LOD Switching

Goal:

- Wire LOD selection into Three runtime object switching.

Work:

- Add Three-specific LOD object management under `src/runtime/three/**`.
- Load and bind LOD asset levels through existing asset loader or a narrow extension that preserves `ReferenceResolver` and asset manifest ownership.
- Switch visible object/mesh level deterministically based on selector output.
- Dispose unused or replaced resources correctly.
- Add tests for loaded level, fallback placeholder, missing LOD asset, switching threshold, hysteresis behavior, and disposal.
- Preserve existing material runtime, shader globals, postprocess, transform gizmo, picking, and editor camera behavior.

Validation:

```powershell
npm run test -- ThreeRuntime ThreeAssetLoader lod
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
feat: wire lod switching into three runtime
```

### Round 22.5: Demo Asset LOD Levels And Reports

Goal:

- Add at least one asset with three LOD levels and make asset reports expose the relevant budget signals.

Work:

- Add or generate small stable GLB source assets for `LOD0`, `LOD1`, and `LOD2` using the existing asset generation workflow if appropriate.
- Update `data/assets.manifest.json` and relevant prefab/level data so one renderable path supports three LOD levels.
- Extend `scripts/report-assets.ts` if needed to report LOD group, level count, triangle estimates, instancing hints, and budget status.
- Ensure generated source assets are intentional, small, and reviewable.
- Do not introduce external asset-pipeline dependencies.

Validation:

```powershell
npm run validate-data
npm run report-assets
npm run test -- asset report lod
git diff --check
```

Expected commit:

```txt
feat: add demo lod asset levels
```

### Round 22.6: Scatter Schema And Deterministic Placement

Goal:

- Add data-first scatter contracts for repeated objects and vegetation.

Work:

- Add schema and runtime types for scatter groups: id, source asset or prefab, count, seed, placement shape, transform ranges, alignment policy, optional LOD/quality settings, and fallback behavior.
- Implement a pure deterministic scatter generator.
- Add tests for seed stability, count bounds, empty scatter, invalid ranges, missing source, duplicate ids, transform constraints, and low-end count bias if included.
- Keep scatter data renderer-neutral and reviewable.

Validation:

```powershell
npm run test -- scatter schema deterministic
npm run validate-data
git diff --check
```

Expected commit:

```txt
feat: add deterministic scatter contract
```

### Round 22.7: Three InstancedMesh Runtime

Goal:

- Render at least one scatter group through Three `InstancedMesh`.

Work:

- Add Three instancing support under `src/runtime/three/**`.
- Extract or create geometry/material for a repeated prop or vegetation object from existing assets or a small generated asset.
- Apply deterministic instance transforms from the scatter generator.
- Track and dispose instanced geometry/material resources correctly.
- Add tests for instance count, matrix updates, empty group, missing asset fallback, material/style compatibility, quality profile count bias if applicable, and disposal.
- Document any picking/selection limitations for instanced groups and ensure editor smoke remains understandable.

Validation:

```powershell
npm run test -- InstancedMesh scatter ThreeRuntime
npm run check-boundaries
git diff --check
```

Expected commit:

```txt
feat: render scatter groups with instancing
```

### Round 22.8: Perf Smoke And Low-End Profile Gate

Goal:

- Add repeatable smoke/perf evidence for LOD, instancing, and low-end behavior.

Work:

- Add smoke coverage that loads the demo scene, proves LOD state and instancing state are observable, and records draw-call/triangle/resource signals where practical.
- Add low-end profile smoke or tests proving more aggressive LOD bias and/or scatter count behavior.
- Define stable local budgets for the demo path.
- If memory metrics are too environment-sensitive, record that limitation and use deterministic draw-call, triangle estimate, instance count, and renderer info counters instead.
- Keep smoke output generated unless a stable source fixture is intentionally added.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run test -- lod scatter perf low-end
git diff --check
```

Expected commit:

```txt
test: add lod instancing perf smoke
```

### Round 22.9: Buffer Fix Round 1

Goal:

- Fix Phase 22 defects found by validation, smoke, or architecture review.

Work:

- Triage failures by layer before editing.
- Keep fixes inside Phase 22 scope.
- Focus on schema validation, selector stability, Three switching, instancing disposal, report-assets, smoke stability, and docs.
- Do not add dynamic mesh reduction, external adapters, Phase 23 scope, or unrelated systems.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: stabilize phase 22 lod instancing
```

### Round 22.10: Buffer Fix Round 2

Goal:

- Reserve a second buffer for remaining Phase 22 issues only.

Work:

- Use only if integrated checks still find Phase 22 blockers.
- Focus on deterministic thresholds, browser smoke timing, low-end profile behavior, asset report accuracy, or docs mismatches.
- Skip this round if no defects remain and record it as unused in the final report.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
fix: close phase 22 validation gaps
```

### Round 22.11: Integrated LOD And Instancing Gate

Goal:

- Prove the LOD, scatter, instancing, reports, and smoke gates work together.

Work:

- Run targeted LOD, scatter, Three runtime, asset report, and smoke suites.
- Fix only Phase 22 defects.
- Update docs if actual command names, file locations, budget values, or known limitations differ from earlier assumptions.
- Confirm no external dependency, dynamic mesh reduction, or Phase 23 scope entered the diff.

Validation:

```powershell
npm run test -- lod scatter instancing ThreeRuntime
npm run validate-data
npm run report-assets
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Expected commit:

```txt
test: integrate lod instancing quality gate
```

### Round 22.12: Final Validation And Handoff

Goal:

- Close Phase 22 with full validation, smoke, final docs, and Phase 23 handoff.

Work:

- Run full validation and smoke.
- Confirm all Phase 22 commits are pushed.
- Create `docs/phase-22-lod-instancing-and-vegetation-final-report.md`.
- Update roadmap entry points so Phase 23 Compact Spherical World Prototype is the recommended next goal.
- The final report must include status, completed work, LOD contract, instancing/scatter evidence, low-end behavior, perf evidence, validation, smoke, commits, push status, known limitations, and Phase 23 handoff.
- Confirm Phase 22 did not implement dynamic mesh reduction, external dependencies, adapter runtime integration, or Phase 23 scope.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
rg "Phase 22|LOD|Instancing|Vegetation|scatter|low-end|Phase 23" docs src data tests scripts
git diff --check
```

Expected commit:

```txt
docs: finalize phase 22 lod instancing vegetation
```

## 9. PASS Criteria

Phase 22 is PASS only when all of these are true:

- Phase 21.5 final report is PASS and the executor confirmed it was pushed before Phase 22 implementation started.
- The Phase 22 guide or design docs explicitly record that runtime dynamic mesh reduction and Nanite-style virtualized geometry are out of scope.
- LOD schema and validation exist.
- Runtime LOD types and deterministic selection exist.
- LOD selection includes hysteresis or an equivalent anti-popping strategy.
- Low-end profile LOD bias exists and is test-covered.
- At least one asset or renderable path supports three LOD levels.
- Three runtime switches LOD levels without leaking Three details into source data or semantic layers.
- Missing or invalid LOD assets have explicit fallback behavior and test coverage.
- Scatter schema and deterministic seeded placement exist.
- At least one scatter group renders through Three `InstancedMesh`.
- Instanced rendering has disposal and fallback coverage.
- Perf/smoke evidence proves draw calls, triangle estimates, instance counts, and practical runtime resource signals stay under the accepted demo budgets.
- `report-assets` exposes enough LOD/instancing information to catch stale or missing budget data.
- No Three.js imports are introduced outside `src/runtime/three/**` and accepted thin editor glue.
- No external runtime dependency, external adapter, Indirection replacement, InputFlow, ViewRig, LudoWeave, Inscape, Physics, Audio, Runtime UI, gameplay controller, spherical world, or Phase 23 scope is implemented.
- `Validate.cmd` passes.
- `Smoke.cmd` passes.
- `git diff --check` passes.
- Phase 22 final report exists.
- All Phase 22 commits are pushed to `origin/main` or the active remote branch requested by the user.
- Roadmap entry points identify Phase 23 Compact Spherical World Prototype as the next implementation phase.

## 10. Validation Matrix

| Area | Required validation |
| --- | --- |
| LOD schema | Unit/schema tests for valid groups, invalid ordering, duplicate levels, missing references, thresholds, hysteresis, fallback, low-end bias |
| Data validation | `npm run validate-data` fails bad LOD/scatter data and passes committed demo data |
| Asset report | `npm run report-assets` includes LOD/instancing/budget signals where practical |
| LOD selector | Unit tests for deterministic selection, camera movement, hysteresis, low-end bias, fallback, disabled/missing state |
| Three LOD runtime | Tests for loading, switching, fallback placeholder, disposal, and no forbidden imports |
| Scatter schema | Unit/schema tests for seed, count, placement shape, transform ranges, duplicate ids, missing source, empty groups |
| Scatter generator | Unit tests for deterministic seeded output and stable transform bounds |
| InstancedMesh runtime | Tests for instance count, matrix updates, material/geometry handling, missing asset fallback, quality bias, disposal |
| Low-end profile | Tests or smoke proving more aggressive LOD bias and/or scatter reduction |
| Perf smoke | Playwright smoke or runtime tests for draw calls, triangle estimates, instance counts, and resource counters |
| Editor/runtime smoke | Existing editor shell still loads, renders, and remains readable; LOD/instancing does not regress core workflow |
| Boundary checks | `check-boundaries` proves Three.js stays inside runtime adapter boundaries |
| Full gate | `Validate.cmd`, `Smoke.cmd`, `git diff --check`, roadmap link checks |

## 11. Final Report Template

Create `docs/phase-22-lod-instancing-and-vegetation-final-report.md` using this structure:

```markdown
# Phase 22 LOD Instancing And Vegetation Final Report

Date: <date>

## Status

PASS or BLOCKED.

## Completed

- ...

## LOD Contract

- Schema:
- Runtime selector:
- Hysteresis / anti-popping:
- Low-end bias:
- Fallback behavior:
- Three runtime switching:

## Instancing And Vegetation

- Scatter schema:
- Deterministic seed behavior:
- InstancedMesh runtime:
- Demo scatter group:
- Picking / editor limitations:
- Fallback behavior:

## Assets And Reports

- Three-level LOD asset:
- Asset manifest updates:
- Asset report fields:
- Budget decisions:

## Perf And Smoke Evidence

- Draw calls:
- Triangle estimates:
- Instance counts:
- Renderer/resource counters:
- Low-end profile:
- Smoke tests:

## Validation

- Validate.cmd:
- Smoke.cmd:
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

Complete Phase 23 from docs/abeto-messenger-development-plan.md: Compact Spherical World Prototype. Start only after Phase 22 is PASS and pushed. Keep spherical placement, camera, player movement, and region readability data-first and do not use Phase 22 LOD/instancing work as permission to add physics, input, Runtime UI, audio, narrative importers, or external adapters without a scoped guide.
```

## 12. Phase 23 Handoff Notes

After Phase 22 passes, Phase 23 may start the Compact Spherical World Prototype.

Phase 23 should use Phase 22 only as infrastructure:

- LOD groups should help distant spherical-region readability, not hide missing world design.
- Scatter/vegetation should remain deterministic data, not procedural runtime randomness.
- Instancing should remain a rendering optimization behind Three runtime boundaries.
- Low-end profile behavior should continue through renderer-neutral quality settings.
- No Physics/InputFlow/ViewRig/LudoWeave/Inscape/Runtime UI/Audio integration should be pulled into Phase 23 unless the Phase 23 guide explicitly scopes it and preserves Phase 21.5 adapter boundaries.
