# Phase 16 Stylized Runtime Foundation Goal Mode Execution Guide

Date: 2026-06-18
Status: Guide for an executor running Phase 16 in goal mode.

Phase 16 is the first implementation phase after the Abeto Scope Lock. Its job is to make the current Gate Demo switch from default Three.js blockout rendering to a data-driven Sinan palette-toon style while preserving the renderer boundary, validation workflow, and editor/runtime separation.

## 0. Direct Goal Prompt For The Executor

```txt
Complete Phase 16 for Sinan: Stylized Runtime Foundation. Read AGENTS.md, docs/abeto-messenger-development-plan.md, docs/phase-15-abeto-scope-lock-final-report.md, docs/post-mvp-execution-workflow.md, docs/development-plan.md, docs/phase-8-real-asset-runtime.md, docs/phase-9-demo-visual-pass.md, docs/phase-13-testing-performance-boundaries.md, and the architecture guide referenced by AGENTS.md. Implement data-driven render styles for the existing Gate Demo: renderStyle schema, palette/toon data, renderer-neutral runtime style types, Three runtime material/style registry, palette-toon material profile, outline/highlight support, lightweight fog/color grade controls, low-end style toggles, validation, tests, smoke coverage, docs, commits, and pushes. Keep Three.js code inside src/runtime/three/**, keep data as source of truth, do not start Phase 17 compression/budget work, Phase 18 LOD/instancing work, Phase 19 spherical world work, Phase 20 gameplay work, or Phase 21 multiplayer work.
```

## 1. Required Reading

Read these before editing:

- `AGENTS.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/phase-15-abeto-scope-lock-final-report.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/development-plan.md`
- `docs/phase-8-real-asset-runtime.md`
- `docs/phase-9-demo-visual-pass.md`
- `docs/phase-13-testing-performance-boundaries.md`
- The architecture guide referenced by `AGENTS.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

Inspect these implementation areas before changing them:

- `src/schemas/component.schema.ts`
- `src/schemas/asset.schema.ts`
- `src/runtime/RuntimeTypes.ts`
- `src/runtime/WebRuntime.ts`
- `src/runtime/three/ThreeRuntime.ts`
- `src/runtime/three/ThreeAssetLoader.ts`
- `src/runtime/three/ThreeObjectResources.ts`
- `src/data/validateProject.ts`
- `src/data/ReferenceResolver.ts`
- `scripts/validate-data.ts`
- `scripts/check-boundaries.ts`
- `data/assets.manifest.json`
- `data/prefabs/*.json`
- `data/levels/level_01.json`
- `tests/smoke/editor.spec.ts`

Current known context:

- Phase 14 is accepted in `docs/phase-14-release-candidate-finalization.md`.
- Phase 15 is accepted in `docs/phase-15-abeto-scope-lock-final-report.md`.
- Current route says Phase 16 should implement Stylized Runtime Foundation.
- Known untracked files may include `docs/abeto_messenger_technology_research.pdf` and `tmp/`; do not stage them unless the user explicitly asks.

## 2. What This Phase Must Complete

Phase 16 must complete:

- A renderer-neutral `renderStyle` schema.
- `Renderable.renderStyle` support for existing prefab/entity data.
- A minimal palette data path, such as `data/palettes/world_01.json`, if named palettes are used.
- Runtime style types that do not import Three.js.
- A Three runtime style/material registry under `src/runtime/three/**`.
- A `standard` fallback profile and a `palette-toon` profile.
- Data-driven outline/highlight support for selected and interactable objects.
- Lightweight fog/color grade controls that can be configured through renderer-neutral data or runtime options.
- Low-end profile toggles that can disable expensive style features.
- Unit tests for schema, validation, runtime style resolution, fallback behavior, and resource cleanup.
- Browser smoke proving the Gate Demo is still nonblank/interactive and the styled rendering path changes visible pixels.
- Documentation describing render style authoring, limitations, and Phase 17 handoff.

## 3. What This Phase Must Not Do

Do not:

- Add Draco, meshopt, KTX2, asset budget reports, or production compression. That is Phase 17.
- Add LOD, InstancedMesh scatter, vegetation systems, or draw-call budget enforcement. That is Phase 18.
- Add spherical world projection, surface movement, or spherical camera. That is Phase 19.
- Add Showcase gameplay, delivery jobs, route markers, NPC behavior, or player controller. That is Phase 20.
- Add multiplayer, WebSocket rooms, remote avatars, emote networking, or social stamps. That is Phase 21.
- Add a shader graph, material visual editor, or generic engine-level material system.
- Import `three` outside `src/runtime/three/**` or thin already-established editor viewport glue.
- Put per-frame rendering or animation state in React state.
- Stage unrelated PDFs, `tmp/`, generated screenshots, or user changes.

## 4. Fixed Workflow For Every Round

Every round must follow this order:

1. Re-read this guide's current round and scope.
2. Inspect current files before editing.
3. Define the smallest coherent checkpoint.
4. Implement the checkpoint.
5. Run targeted tests first.
6. Run the relevant validation wrapper.
7. Run browser smoke when runtime/editor rendering changed.
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
- If a browser smoke failure is caused by a known wrapper health-check issue after Playwright passes, use the documented persistent dev-server recovery flow and report it.

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
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "feat: add phase 16 render style schema" -Paths src\schemas\renderStyle.schema.ts,src\schemas\component.schema.ts,src\schemas\componentSchemas.test.ts,docs\phase-16-stylized-runtime-foundation.md
```

Do not use broad staging commands such as `git add .`.

## 6. Round Budget

Total: 16 rounds.

- Main implementation: rounds 16.1 through 16.12.
- Buffer fixes: rounds 16.13 through 16.15.
- Final validation and handoff: round 16.16.

The roadmap's earlier 4-round estimate is a coarse planning estimate. This goal-mode guide splits Phase 16 into smaller commit-and-push checkpoints so every step can self-check and recover safely.

### Round 16.1: Baseline Audit And Phase 16 Design Lock

Goal:

- Confirm the current release baseline and create the Phase 16 implementation notes document.

Work:

- Inspect status, recent commits, docs, existing schemas, runtime, and tests.
- Create `docs/phase-16-stylized-runtime-foundation.md`.
- Document intended file boundaries, data shape, style profiles, fallback behavior, and validation strategy.
- Do not change runtime behavior yet.

Validation:

```powershell
git diff --check
rg "Phase 16|renderStyle|palette-toon" docs/phase-16-stylized-runtime-foundation.md docs/abeto-messenger-development-plan.md
```

Debug self-check:

- Can the intended work be explained against the existing Gate Demo?
- Are success, fallback, low-end, and invalid-data states listed?
- Are current untracked PDF/tmp files left untouched?

Architecture self-check:

- Does the design keep data as source of truth?
- Does it keep Three.js work inside `src/runtime/three/**`?
- Does it avoid Phase 17-21 scope?

### Round 16.2: Render Style Schema

Goal:

- Add schema-level support for render styles without runtime changes.

Work:

- Add `src/schemas/renderStyle.schema.ts`.
- Add `renderStyle` to `RenderableComponentSchema`.
- Support at least `standard` and `palette-toon` profiles.
- Include outline/highlight/fog/color-grade flags or references only as data, not runtime implementation.
- Add schema tests.

Validation:

```powershell
npm run test -- src/schemas
npm run validate-data
```

Debug self-check:

- Do valid and invalid renderStyle examples parse as expected?
- Are omitted styles backward-compatible?
- Are unknown style profiles rejected or clearly fallback-safe according to schema policy?

Architecture self-check:

- Does the schema avoid importing runtime/Three code?
- Is the schema small and phase-scoped?
- Are future Phase 17 budget fields kept out unless already needed?

### Round 16.3: Palette Data And Validation

Goal:

- Add a minimal palette data path if Phase 16 uses named palettes.

Work:

- Add `src/schemas/palette.schema.ts` if needed.
- Add `data/palettes/world_01.json` or equivalent.
- Add validation/reference checks for palette ids used by render styles.
- Add tests for missing palette references and valid references.

Validation:

```powershell
npm run validate-data
npm run test -- src/data src/schemas
```

Debug self-check:

- Does a missing palette fail validation with an actionable path?
- Can a default style avoid requiring a palette?
- Are palette files Git-friendly JSON?

Architecture self-check:

- Is palette validation in data/schema layers, not Three runtime?
- Is texture atlas work deferred unless required for the minimal palette path?
- Does this avoid Phase 17 asset budget scope?

### Round 16.4: Runtime Style Contract

Goal:

- Expose style data through renderer-neutral runtime contracts.

Work:

- Add runtime style types to `src/runtime/RuntimeTypes.ts` or a renderer-neutral adjacent file.
- Extend `WebRuntime` only if needed, for example style profile or render environment methods.
- Update editor/viewport glue to pass render style data without importing Three.js.
- Add unit tests where practical.

Validation:

```powershell
npm run typecheck
npm run test
npm run check-boundaries
```

Debug self-check:

- Can style data flow from JSON to runtime without `three` types?
- Are empty/default states stable?
- Can unsupported runtime implementations ignore or fallback safely?

Architecture self-check:

- Is the runtime adapter boundary still clean?
- Is React only passing slow data/config, not per-frame state?
- Are renderer-neutral layers free of Three imports?

### Round 16.5: Three Material Registry Foundation

Goal:

- Create the Three-only registry for applying style profiles.

Work:

- Add `src/runtime/three/ThreeMaterialRegistry.ts` or equivalent.
- Add `standard` fallback material handling.
- Add tests using simple Three objects to prove traversal/application works.
- Ensure material/resource disposal remains covered.

Validation:

```powershell
npm run test -- src/runtime/three
npm run check-boundaries
```

Debug self-check:

- Does fallback work on loaded GLB objects and placeholder objects?
- Are original materials disposed or preserved intentionally?
- Can failures be localized to material resolution vs object traversal?

Architecture self-check:

- Is all Three material logic inside `src/runtime/three/**`?
- Does the registry consume renderer-neutral style data?
- Are editor helpers/gizmos excluded from material replacement?

### Round 16.6: Palette-Toon Material MVP

Goal:

- Implement the first visible `palette-toon` material profile.

Work:

- Add a lightweight palette-toon material path under `src/runtime/three/**`.
- Prefer a simple robust material implementation first; custom shader complexity must stay minimal.
- Apply palette/toon color bands to demo models or placeholders.
- Add tests for profile resolution and fallback.

Validation:

```powershell
npm run test -- src/runtime/three
npm run build
```

Debug self-check:

- Does `palette-toon` visibly differ from `standard`?
- Does material creation fallback when palette/style data is missing?
- Does it avoid breaking animation and picking?

Architecture self-check:

- Is shader/material code isolated to Three runtime?
- Are data fields still schema-backed?
- Is final art quality deferred while proving the style system?

### Round 16.7: Demo Data Style Pass

Goal:

- Apply render styles to the existing Gate Demo data.

Work:

- Update relevant prefabs/entities to use `renderStyle`.
- Keep current ids stable.
- Ensure `model.room_blockout`, `model.switch_wall`, `model.door_wood`, and `model.player_spawn` still validate.
- Add or update docs describing demo style choices.

Validation:

```powershell
npm run validate-data
npm run test
```

Debug self-check:

- Can the demo load if one styled asset is missing or invalid?
- Are style choices readable for room, door, switch, and player marker?
- Are existing event/timeline flows unchanged?

Architecture self-check:

- Are style declarations in JSON, not hard-coded in editor UI?
- Are asset ids and prefab ids stable?
- Is no unrelated demo content added?

### Round 16.8: Outline And Highlight MVP

Goal:

- Make selected/interactable objects distinguishable without affecting editor helpers.

Work:

- Add outline/highlight data fields if not already present.
- Implement a low-cost outline/highlight path in `src/runtime/three/**`.
- Ensure transform gizmo, grid, debug AABB, and editor helper layers remain distinct.
- Add tests for attach/detach or selected object changes where practical.

Validation:

```powershell
npm run test -- src/runtime/three
npm run test:smoke -- tests/smoke/editor.spec.ts
```

Debug self-check:

- Does selection/highlight survive selecting another entity?
- Does destroy/dispose remove outline resources?
- Are helper objects unaffected?

Architecture self-check:

- Is highlight state passed through runtime adapter/editor glue only?
- Is per-frame highlight state not stored in React unnecessarily?
- Is no post-processing stack added unless justified?

### Round 16.9: Fog And Color Grade Controls

Goal:

- Add lightweight scene atmosphere controls without heavy post-processing.

Work:

- Add renderer-neutral data/config for fog and basic color/background controls.
- Apply controls in `ThreeRuntime` or a Three-only environment module.
- Keep low-end behavior simple.
- Add tests for config application and fallback.

Validation:

```powershell
npm run test -- src/runtime/three src/schemas
npm run build
```

Debug self-check:

- Can fog/color-grade be disabled?
- Do invalid values fail schema or clamp clearly?
- Does background/fog not obscure editor helpers?

Architecture self-check:

- Does atmosphere data remain renderer-neutral?
- Is no heavy EffectComposer path pulled in during Phase 16?
- Does this avoid Phase 22 mobile perf hardening scope?

### Round 16.10: Low-End Style Profile

Goal:

- Add a way to disable expensive style features for low-end targets.

Work:

- Add low-end/style profile type or runtime option.
- Disable outline, ripple-like effects, or advanced style features according to the Phase 16 scope.
- Expose a deterministic test path, such as query param, config value, or test fixture.
- Add tests proving low-end fallback.

Validation:

```powershell
npm run test
npm run build
```

Debug self-check:

- Can low-end mode be enabled predictably in tests?
- Does low-end mode still render a readable scene?
- Are unsupported features reported or silently safe?

Architecture self-check:

- Is device/profile choice renderer-neutral?
- Does it avoid user-agent hacks unless localized and documented?
- Is performance measurement deferred to later perf phases unless necessary?

### Round 16.11: Browser Smoke For Stylized Rendering

Goal:

- Prove the styled rendering path in a repeatable browser test.

Work:

- Extend Playwright smoke for styled rendering.
- Verify the canvas is nonblank and visually changes when style or selection/highlight changes.
- Check no console/page errors during styled render.
- Keep tests deterministic and not overly brittle.

Validation:

```powershell
npm run test:smoke
```

Debug self-check:

- Does smoke fail if style application is disabled?
- Are pixel checks tolerant enough for GPU/browser variance?
- Does smoke cover both default and styled path if practical?

Architecture self-check:

- Does smoke test user-visible behavior rather than implementation internals?
- Does it avoid relying on unrelated UI/UX exact styling?
- Are generated artifacts not committed?

### Round 16.12: Docs And Developer Guide Update

Goal:

- Document how to author and extend render styles.

Work:

- Update `docs/developer-guide.md`.
- Add or finalize `docs/phase-16-stylized-runtime-foundation.md`.
- Update `docs/abeto-messenger-development-plan.md` to point to Phase 16 results.
- Document limitations and Phase 17 handoff.

Validation:

```powershell
git diff --check
rg "renderStyle|palette-toon|Phase 16" docs
```

Debug self-check:

- Can a new developer add a styled renderable from docs alone?
- Are limitations clear enough to prevent scope creep?
- Is Phase 17 compression/budget work clearly deferred?

Architecture self-check:

- Do docs repeat the runtime boundary clearly?
- Do docs state data is source of truth?
- Are material profile extension steps schema/validation/runtime/test aware?

### Round 16.13: Buffer Fix Round 1

Use only for issues found in rounds 16.1-16.12.

Allowed work:

- Fix validation failures.
- Fix smoke instability.
- Fix missing fallback cases.
- Fix boundary-check failures.
- Fix data validation gaps.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

Also run smoke if runtime/editor behavior changed.

Self-check:

- What issue consumed the buffer?
- Which layer caused it?
- Why is the fix phase-scoped?

### Round 16.14: Buffer Fix Round 2

Use only if another issue remains.

Focus:

- Resource cleanup and disposal.
- Highlight/outline detach behavior.
- Low-end fallback correctness.
- Test determinism.

Validation:

```powershell
npm run test
npm run check-boundaries
```

Also run `Smoke.cmd` if UI/runtime behavior changed.

Self-check:

- Did the fix avoid broader refactors?
- Are cleanup and fallback tested?
- Is the work pushed before continuing?

### Round 16.15: Buffer Fix Round 3

Use only for final release-blocking fixes.

Focus:

- Full validation failures.
- Browser smoke failures.
- Documentation/link gaps.
- Accidental unrelated staged files.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

Self-check:

- Is this truly a Phase 16 blocker?
- Are all unrelated files excluded?
- Is there a clear final validation path?

### Round 16.16: Final Validation And Handoff

Goal:

- Close Phase 16 and prepare Phase 17 handoff.

Work:

- Run full validation and smoke.
- Confirm no forbidden Three.js imports or dynamic-code patterns.
- Confirm styled Gate Demo behavior is documented.
- Confirm git status is clean except intentional preserved untracked research/temp files if still present.
- Add `docs/phase-16-stylized-runtime-foundation-final-report.md`.
- Update `docs/abeto-messenger-development-plan.md` if Phase 16 status should be recorded.

Validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
git status --short --branch
```

Debug self-check:

- Does the final report state exactly what changed?
- Are known limitations and Phase 17 handoff explicit?
- Can a fresh executor start Phase 17 without guessing?

Architecture self-check:

- Is all Three style implementation inside `src/runtime/three/**`?
- Do data/schema/runtime/editor boundaries still match `AGENTS.md`?
- Did Phase 16 avoid compression, LOD, spherical world, gameplay, and multiplayer scope?

## 7. PASS Criteria

Phase 16 passes only when:

- `Renderable.renderStyle` or equivalent data-backed style declaration exists and validates.
- The Gate Demo can render with `standard` and `palette-toon` style paths.
- Missing or invalid style data has a safe fallback or clear validation error.
- Outline/highlight works for selected or interactable objects without corrupting editor helpers.
- Fog/color-grade controls exist and can be disabled.
- Low-end style profile can disable expensive features.
- Unit tests cover schema, data validation, runtime style resolution, fallback, and cleanup.
- Browser smoke proves styled rendering is nonblank, interactive, and error-free.
- `Validate.cmd` passes.
- `Smoke.cmd` passes.
- `git diff --check` passes.
- Phase docs and developer guide are updated.
- Phase-relevant commits are pushed to `origin/main`.
- The final report records commit hashes, validation results, buffer usage, limitations, and Phase 17 handoff.

## 8. Final Report Template

Use this format:

```txt
Phase 16 Final Report

Status:
- PASS / BLOCKED

Completed:
- ...

Runtime/data changes:
- ...

Docs updated:
- ...

Validation:
- Validate.cmd: pass/fail
- Smoke.cmd: pass/fail
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
Complete Phase 17 from docs/abeto-messenger-development-plan.md: Asset Budget And Compression.
```
