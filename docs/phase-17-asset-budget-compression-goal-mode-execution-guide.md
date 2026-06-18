# Phase 17 Asset Budget And Compression Goal Mode Execution Guide

Date: 2026-06-19
Status: Guide for an executor running Phase 17 in goal mode.

Phase 17 starts after the accepted Phase 16 Stylized Runtime Foundation. Its job is to make Sinan's asset pipeline measurable and compression-aware before the project grows into the Messenger-like vertical slice. This phase must add asset metadata, validation, reporting, and loader strategy without pulling in Phase 18 LOD/instancing or Phase 19 spherical-world work.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 17 for Sinan: Asset Budget And Compression. Read AGENTS.md, docs/abeto-messenger-development-plan.md, docs/phase-16-stylized-runtime-foundation-final-report.md, docs/phase-16-stylized-runtime-foundation.md, docs/developer-guide.md, docs/phase-8-real-asset-runtime.md, docs/phase-13-testing-performance-boundaries.md, docs/post-mvp-execution-workflow.md, and docs/Sinan_Scene_Director_研发方案与架构指南.md. Implement typed asset metadata, asset budget validation, npm run report-assets, asset byte/status reports, compression-readiness metadata, and a Three runtime compressed-asset loader strategy with deterministic fallback tests. Keep data as source of truth, keep Three.js/compression-loader code inside src/runtime/three/**, wire report-assets into docs and release guidance, and do not start Phase 18 LOD/instancing, Phase 19 spherical world, Phase 20 gameplay, or Phase 21 multiplayer work.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/phase-16-stylized-runtime-foundation-final-report.md`
- `docs/phase-16-stylized-runtime-foundation.md`
- `docs/developer-guide.md`
- `docs/phase-8-real-asset-runtime.md`
- `docs/phase-13-testing-performance-boundaries.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/Sinan_Scene_Director_研发方案与架构指南.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Inspect these implementation areas before changing them:

- `package.json`
- `src/schemas/asset.schema.ts`
- `src/data/AssetUrlValidator.ts`
- `src/data/ReferenceResolver.ts`
- `src/data/validateProject.ts`
- `scripts/validate-data.ts`
- `src/runtime/three/ThreeAssetLoader.ts`
- `src/runtime/three/ThreeAssetLoader.test.ts`
- `data/assets.manifest.json`
- `public/models/**`
- `public/audio/**`
- `docs/release-checklist.md`
- `tests/smoke/editor.spec.ts`

Current known context:

- Phase 16 is accepted in `docs/phase-16-stylized-runtime-foundation-final-report.md`.
- Current manifest metadata is intentionally loose: `metadata: z.record(z.string(), z.unknown()).optional()`.
- Current validation checks URLs, extensions, public-file existence, references, animation clip metadata, and palette/render-style references.
- `package.json` does not yet have `report-assets`.
- Known unrelated untracked files may include `docs/abeto_messenger_technology_research.pdf`, `tmp/`, and `docs/Web3D_Shader_研发方案与架构指南_GLSL_MVP.md`. Do not stage them unless the user explicitly asks.

## 2. What This Phase Must Complete

Phase 17 must complete:

- Typed, schema-backed asset metadata for current model, audio, image, texture, material, font, and data asset categories where applicable.
- Metadata fields for category, material profile, triangle budget, texture budget, LOD group marker, compression status, instancing hint, known clips, and optional source notes.
- Updated `data/assets.manifest.json` metadata for all current Gate Demo assets.
- `AssetBudgetValidator` or equivalent validation layer with actionable paths.
- `npm run report-assets`, backed by a script such as `scripts/report-assets.ts`.
- Asset report output covering asset id, type, URL, public file size, compression status, declared budgets, clips, material profile, and missing metadata warnings.
- Validation policy for over-budget or missing critical metadata.
- Runtime compressed-asset loader strategy inside `src/runtime/three/**`, with tests proving safe fallback when decoders/transcoders are not configured.
- Documentation for Blender/GLB/optimization workflow and Phase 18 handoff.
- Final Phase 17 report with validation, smoke, commits, push status, limitations, and next goal.

## 3. What This Phase Must Not Do

Do not:

- Add LOD runtime switching, LOD distance behavior, hysteresis, or billboard rendering. That is Phase 18.
- Add InstancedMesh scatter, vegetation systems, or repeated-prop batching. That is Phase 18.
- Add spherical world projection, surface movement, or spherical camera. That is Phase 19.
- Add Showcase gameplay, delivery jobs, route markers, or player controller. That is Phase 20.
- Add multiplayer, WebSocket rooms, remote avatars, or social stamps. That is Phase 21.
- Replace the entire asset pipeline with an external DCC/export system.
- Require production Draco/KTX2 artifacts if the repository does not yet include the required decoder/transcoder files; implement and document the loader strategy and fallback instead.
- Add heavy runtime dependencies without verifying bundle impact.
- Import Three.js outside `src/runtime/three/**`.
- Stage unrelated research PDFs, shader docs, `tmp/`, generated screenshots, or user changes.

## 4. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Inspect current files before editing.
3. Define the smallest coherent checkpoint.
4. Implement the checkpoint.
5. Run targeted tests first.
6. Run the relevant validation wrapper.
7. Run browser smoke when runtime loading or editor-visible behavior changed.
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
- If report or smoke commands create generated artifacts, keep them out of commits unless the guide explicitly names them as source files.

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
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "feat: add phase 17 asset metadata schema" -Paths src\schemas\asset.schema.ts,src\schemas\assetSchemas.test.ts,docs\phase-17-asset-budget-compression.md
```

Do not use broad staging commands such as `git add .`.

## 6. Round Budget

Total: 16 rounds.

- Main implementation: rounds 17.1 through 17.12.
- Buffer fixes: rounds 17.13 through 17.15.
- Final validation and handoff: round 17.16.

The roadmap's earlier 4-round estimate is a coarse planning estimate. This goal-mode guide splits Phase 17 into smaller commit-and-push checkpoints because asset metadata, reports, validation, and runtime loader strategy touch several layers.

### Round 17.1: Baseline Audit And Phase 17 Design Lock

Goal:

- Confirm the current Phase 16 baseline and create Phase 17 implementation notes.

Work:

- Inspect status, recent commits, existing asset schema, manifest, generated assets, loaders, and validation scripts.
- Create `docs/phase-17-asset-budget-compression.md`.
- Document file boundaries, metadata policy, budget policy, report shape, loader strategy, and non-scope.
- Do not change runtime behavior yet.

Validation:

```powershell
git diff --check
rg "Phase 17|report-assets|Asset Budget" docs/phase-17-asset-budget-compression.md docs/abeto-messenger-development-plan.md
```

Debug self-check:

- Can the plan explain how current five assets will be reported?
- Are success, missing metadata, over-budget, missing file, and unsupported decoder states listed?
- Are current untracked PDF/tmp files left untouched?

Architecture self-check:

- Does the design keep `data/assets.manifest.json` as source of truth?
- Does it keep Three compression-loader code inside `src/runtime/three/**`?
- Does it avoid LOD/instancing and gameplay scope?

### Round 17.2: Typed Asset Metadata Schema

Goal:

- Make asset metadata schema-backed while staying backward-compatible where needed.

Work:

- Extend `src/schemas/asset.schema.ts` with typed metadata structures.
- Support fields such as `category`, `materialProfile`, `maxTriangles`, `textureBudgetKb`, `compressed`, `compression`, `lodGroup`, `instancing`, `clips`, and `source`.
- Keep unknown metadata policy explicit: reject, allow only under `extras`, or temporarily allow with tests.
- Add schema tests.

Validation:

```powershell
npm run test -- src/schemas
npm run validate-data
```

Debug self-check:

- Do current assets remain valid or fail with actionable fixes?
- Are invalid negative budgets and invalid compression values rejected?
- Are animation clips still represented safely?

Architecture self-check:

- Does the schema avoid runtime and Three imports?
- Are Phase 18 LOD distances excluded unless explicitly only a marker?
- Are compression fields metadata, not runtime behavior yet?

### Round 17.3: Current Manifest Metadata Pass

Goal:

- Add budget/compression metadata to all current demo assets.

Work:

- Update `data/assets.manifest.json`.
- Add conservative metadata for room, switch, door, player marker, and audio.
- Preserve current asset ids and URLs.
- Update tests that load demo data.

Validation:

```powershell
npm run validate-data
npm run test
```

Debug self-check:

- Does every current asset have enough metadata for reporting?
- Are clip names still validated?
- Is metadata realistic but not pretending final production optimization is done?

Architecture self-check:

- Are data changes Git-friendly JSON only?
- Did asset metadata not alter game semantics?
- Did this avoid adding new assets unless required?

### Round 17.4: Asset Budget Validator

Goal:

- Add explicit budget/reference validation for asset metadata.

Work:

- Add `src/data/AssetBudgetValidator.ts` or equivalent.
- Validate required metadata by asset type.
- Validate declared public file size against byte budgets where practical.
- Validate `maxTriangles`, `textureBudgetKb`, `compression`, and `materialProfile` values.
- Integrate into `validateProject` or `validate-data`.
- Add tests for missing metadata and over-budget assets.

Validation:

```powershell
npm run test -- src/data
npm run validate-data
```

Debug self-check:

- Are errors actionable and path-specific?
- Are warnings vs errors policy explicit?
- Can generated dev assets pass without lying about production compression?

Architecture self-check:

- Is validation data-only?
- Does validator avoid parsing binary GLB unless explicitly in script/report layer?
- Does it avoid Phase 18 runtime perf enforcement?

### Round 17.5: Asset Report Script MVP

Goal:

- Add the first `npm run report-assets` path.

Work:

- Add `scripts/report-assets.ts`.
- Add `report-assets` to `package.json`.
- Report asset id, type, URL, public file existence, byte size, compression status, material profile, clips, and declared budgets.
- Add script tests if local patterns support them, or add unit-testable helpers under `src/data`.

Validation:

```powershell
npm run report-assets
npm run test
```

Debug self-check:

- Does the report succeed on the current demo assets?
- Does it fail or mark missing files clearly?
- Is output human-readable and stable enough for future CI?

Architecture self-check:

- Is file-system inspection confined to scripts or data tooling?
- Does runtime stay unaffected?
- Are generated reports not committed unless intentionally documented?

### Round 17.6: Asset Report Budget Details

Goal:

- Make asset reporting useful for performance budgeting.

Work:

- Include initial/total compressed-size summaries.
- Include budget pass/fail totals for desktop/mobile where practical.
- Include missing metadata count.
- Include machine-readable JSON output option if useful, for example `--json`.
- Document command examples.

Validation:

```powershell
npm run report-assets
npm run report-assets -- --json
npm run test
```

Debug self-check:

- Can failures be localized to schema, file access, or report formatting?
- Are totals deterministic across Windows paths?
- Does JSON output avoid absolute machine-specific paths?

Architecture self-check:

- Does report logic avoid editor/runtime imports?
- Are desktop/mobile budgets sourced from constants or data, not scattered literals?
- Does this avoid Phase 22 release automation scope beyond basic command availability?

### Round 17.7: Wire Report Into Validation Policy

Goal:

- Decide and implement how asset budgets participate in routine validation.

Work:

- Wire strict budget checks into `validate-data` if appropriate.
- If report-only warnings are used, document why and ensure `Validate.cmd` still catches critical metadata issues.
- Update `.codex/project-ops-workflow.json` only if project policy deliberately changes.
- Update docs to tell future agents which command is required.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
npm run report-assets
```

Debug self-check:

- Does validation fail for critical broken metadata?
- Does report explain non-blocking compression gaps?
- Are workflow config changes intentional and documented?

Architecture self-check:

- Does routine validation stay deterministic and fast?
- Are warnings not hidden as passing when they should block?
- Are project workflow docs/configs consistent?

### Round 17.8: Compression Loader Strategy

Goal:

- Add a Three-runtime strategy for compressed model/texture loading without forcing unavailable artifacts.

Work:

- Inspect Three example loaders available in the current dependency version.
- Add a Three-only compressed loader strategy module, for example `ThreeCompressedAssetLoader.ts`.
- Configure `GLTFLoader` with optional Draco or meshopt hooks when decoder paths/configs are present.
- Plan KTX2/Basis texture loader support or implement a guarded strategy if required assets are available.
- Add tests with fakes/mocks proving configuration and fallback.

Validation:

```powershell
npm run test -- src/runtime/three
npm run build
npm run check-boundaries
```

Debug self-check:

- Does missing decoder/transcoder config fall back clearly?
- Can failures be localized to loader configuration vs asset loading?
- Is real compressed asset loading not falsely claimed if no compressed fixture exists?

Architecture self-check:

- Is all Three loader/compression code inside `src/runtime/three/**`?
- Does `WebRuntime` remain renderer-neutral?
- Are no heavy dependencies added without bundle/build validation?

### Round 17.9: Compression Metadata And Fallback Tests

Goal:

- Connect metadata to loader/report policy without breaking current assets.

Work:

- Add metadata fields such as `compression.draco`, `compression.meshopt`, `textureCompression.ktx2`, or equivalent.
- Ensure `report-assets` displays declared compression readiness.
- Add tests for compressed metadata with missing decoder support and safe fallback.
- Keep current uncompressed assets valid.

Validation:

```powershell
npm run test
npm run report-assets
npm run validate-data
```

Debug self-check:

- Does metadata accurately distinguish `none`, `ready`, `required`, and `unknown`?
- Does missing required decoder become actionable?
- Are current dev assets marked honestly?

Architecture self-check:

- Does metadata not imply runtime behavior outside the adapter?
- Are texture compression fields data-only unless loader support exists?
- Does this avoid adding production assets just to satisfy metadata?

### Round 17.10: Asset Authoring And Optimization Docs

Goal:

- Document the human/AI workflow for assets.

Work:

- Update `docs/developer-guide.md`.
- Add Blender to GLB to optimize to manifest workflow.
- Document gltf-transform or equivalent optimization commands as recommendations, not mandatory local commands unless available.
- Document metadata fields, budgets, report usage, validation failures, and compression limitations.

Validation:

```powershell
git diff --check
rg "report-assets|Asset Budget|compression|metadata" docs/developer-guide.md docs/phase-17-asset-budget-compression.md
```

Debug self-check:

- Can a new developer add a model asset from the docs?
- Are current limitations clear?
- Are commands truthful to installed dependencies?

Architecture self-check:

- Do docs preserve data-first asset authoring?
- Do docs keep runtime loader details isolated?
- Do docs defer LOD/instancing to Phase 18?

### Round 17.11: Release And Workflow Docs

Goal:

- Make asset reporting discoverable in release and handoff docs.

Work:

- Update `docs/release-checklist.md`.
- Update `docs/abeto-messenger-development-plan.md` Phase 17 status/guide pointer if appropriate.
- Update workflow docs if `report-assets` is now required before release.
- Avoid claiming Phase 17 PASS before final validation.

Validation:

```powershell
git diff --check
rg "report-assets|Phase 17|Asset Budget" docs/release-checklist.md docs/abeto-messenger-development-plan.md docs/post-mvp-execution-workflow.md
```

Debug self-check:

- Can release validation find asset reports?
- Is Phase 17 status still honest until final report?
- Are docs free of stale Phase 16-as-next wording?

Architecture self-check:

- Are docs consistent with `.codex` workflow config?
- Is release scope not pulling in Phase 22 hardening?
- Are unrelated docs left alone?

### Round 17.12: Integrated Validation And Smoke Readiness

Goal:

- Confirm the asset budget/compression changes do not regress the editor/runtime demo.

Work:

- Run full validation.
- Run smoke if runtime loader strategy or manifest data changed runtime behavior.
- Fix only Phase 17 issues.
- Ensure reports and docs align with actual command output.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run report-assets
git diff --check
```

Debug self-check:

- Does current Gate Demo still load and render?
- Does asset report output match docs?
- Are smoke failures localizable to runtime loader vs unrelated UI?

Architecture self-check:

- Are all compression loader changes isolated?
- Did validation/reporting avoid runtime/editor semantic duplication?
- Are unrelated untracked files still uncommitted?

### Round 17.13: Buffer Fix Round 1

Use only for issues found in rounds 17.1-17.12.

Allowed work:

- Fix metadata validation bugs.
- Fix report command output stability.
- Fix Windows path handling.
- Fix docs/command mismatch.
- Fix boundary-check failures.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
npm run report-assets
```

Also run smoke if runtime loader behavior changed.

Self-check:

- What issue consumed the buffer?
- Which layer caused it?
- Why is the fix phase-scoped?

### Round 17.14: Buffer Fix Round 2

Use only if another issue remains.

Focus:

- Compression loader fallback.
- Asset report JSON determinism.
- Budget policy edge cases.
- Existing asset compatibility.

Validation:

```powershell
npm run test
npm run validate-data
npm run report-assets
npm run check-boundaries
```

Also run `Smoke.cmd` if runtime behavior changed.

Self-check:

- Did the fix avoid broader refactors?
- Are fallback states tested?
- Is the work pushed before continuing?

### Round 17.15: Buffer Fix Round 3

Use only for final release-blocking fixes.

Focus:

- Full validation failures.
- Browser smoke failures.
- Missing report-assets docs.
- Accidental unrelated staged files.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
npm run report-assets
git diff --check
```

Self-check:

- Is this truly a Phase 17 blocker?
- Are all unrelated files excluded?
- Is there a clear final validation path?

### Round 17.16: Final Validation And Handoff

Goal:

- Close Phase 17 and prepare Phase 18 handoff.

Work:

- Run full validation, smoke, and asset report.
- Confirm no forbidden Three.js imports or dynamic-code patterns.
- Confirm asset budget behavior is documented.
- Confirm git status is clean except intentional preserved untracked research/temp files if still present.
- Add `docs/phase-17-asset-budget-compression-final-report.md`.
- Update `docs/abeto-messenger-development-plan.md` if Phase 17 status should be recorded.

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
- Are known limitations and Phase 18 handoff explicit?
- Can a fresh executor start LOD/instancing without guessing?

Architecture self-check:

- Is all Three compression loader implementation inside `src/runtime/three/**`?
- Do data/schema/runtime/editor boundaries still match `AGENTS.md`?
- Did Phase 17 avoid LOD, instancing, spherical world, gameplay, and multiplayer scope?

## 7. PASS Criteria

Phase 17 passes only when:

- Asset manifest metadata is typed, validated, and populated for current demo assets.
- `npm run report-assets` exists and reports asset id, type, URL, file size, compression status, metadata, and budget status.
- Asset budget validation catches missing critical metadata and over-budget cases with actionable paths.
- Current Gate Demo assets pass validation honestly, without pretending production compression exists.
- Compression metadata and loader strategy are implemented or documented with tested fallback behavior.
- Any Three compression loader code remains inside `src/runtime/three/**`.
- `Validate.cmd` passes.
- `Smoke.cmd` passes if runtime loading behavior changed or as part of final validation.
- `npm run report-assets` passes.
- `git diff --check` passes.
- Developer/release docs are updated.
- Phase-relevant commits are pushed to `origin/main`.
- The final report records commit hashes, validation results, buffer usage, limitations, and Phase 18 handoff.

## 8. Final Report Template

Use this format:

```txt
Phase 17 Final Report

Status:
- PASS / BLOCKED

Completed:
- ...

Asset metadata and report changes:
- ...

Runtime compression strategy:
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
Complete Phase 18 from docs/abeto-messenger-development-plan.md: LOD, Instancing, And Vegetation.
```
