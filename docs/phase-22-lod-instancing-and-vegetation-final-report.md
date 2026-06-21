# Phase 22 LOD Instancing And Vegetation Final Report

Date: 2026-06-21

## Status

PASS.

Phase 22 is complete and pushed through the integrated gate. The implementation uses
traditional preauthored/offline-generated LOD assets, deterministic data-first scatter, and
Three `InstancedMesh` rendering. It does not implement runtime dynamic mesh reduction,
Nanite-style virtualized geometry, meshlet streaming, external runtime adapters, or Phase 23
spherical world/gameplay scope.

## Completed

- Locked the Phase 22 design in `docs/phase-22-lod-instancing-and-vegetation.md`.
- Added LOD schema, reference validation, runtime types, and deterministic selection.
- Added Three runtime LOD switching with fallback and disposal coverage.
- Added three generated switch-wall LOD assets and asset report LOD/instancing fields.
- Added scatter schema, validation, deterministic seeded placement, and low-end count bias.
- Added Three `InstancedMesh` scatter rendering with diagnostics, fallback, and disposal tests.
- Added Playwright smoke diagnostics for runtime LOD and instanced scatter state.
- Added deterministic local perf gates for standard and low-end demo budgets.
- Added an integrated demo-data gate through `DataRepository -> EngineSession -> ThreeRuntime`.
- Updated roadmap entry points to recommend Phase 23 next.

## LOD Contract

- Schema: `data/assets.manifest.json` owns `lodGroups`; `src/schemas/asset.schema.ts` validates
  level order, thresholds, fallback membership, and low-end bias bounds.
- Runtime selector: `src/runtime/LodSelector.ts` selects renderer-neutral distance LOD levels.
- Hysteresis / anti-popping: previous levels are held until the distance crosses the threshold
  plus or minus the configured hysteresis margin.
- Low-end bias: `RuntimeStyleQualityProfile` applies an integer level bias without exposing Three
  details outside the runtime contract.
- Fallback behavior: missing selected LOD assets use the declared fallback asset and are covered
  by runtime tests.
- Three runtime switching: `src/runtime/three/ThreeRuntime.ts` switches loaded object assets while
  preserving transform, style/material state, selection attachment, and animation intent where
  possible.

## Instancing And Vegetation

- Scatter schema: `src/schemas/scatter.schema.ts` validates group id, source, count, seed,
  placement, transform ranges, quality settings, and fallback policy.
- Deterministic seed behavior: `src/runtime/ScatterGenerator.ts` derives repeatable instance
  transforms from `group.id` and `seed`.
- InstancedMesh runtime: `src/runtime/three/ThreeScatterRuntime.ts` extracts a Three-owned mesh
  geometry/material and builds one `InstancedMesh` per scatter group.
- Demo scatter group: `scatter_switch_markers` in `data/levels/level_01.json`.
- Picking / editor limitations: Phase 22 scatter groups render as non-selectable batches. Picking
  remains entity-based until a later phase defines per-instance selection semantics.
- Fallback behavior: missing scatter sources use explicit fallback assets or placeholders and
  expose diagnostics.

## Assets And Reports

- Three-level LOD asset: `model.switch_wall.lod0`, `model.switch_wall.lod1`, and
  `model.switch_wall.lod2`.
- Asset manifest updates: `gate-demo-props` declares three distance levels with fallback
  `model.switch_wall.lod2`.
- Asset report fields: `npm run report-assets` reports LOD group, LOD level count/level label,
  triangle metadata, instancing hints, compression state, and budget status.
- Budget decisions: committed demo assets remain source GLBs and stay under their per-asset byte
  budgets.

## Perf And Smoke Evidence

- Draw calls: `scatter_switch_markers` is budgeted as one instanced draw-call estimate in the
  local gates.
- Triangle estimates: standard demo camera selects LOD0 for `switch_a` and keeps scatter at
  72 estimated triangles; low-end selects LOD1 and reduces scatter to 36 estimated triangles.
- Instance counts: standard profile renders 6 scatter instances; low-end profile renders 3.
- Renderer/resource counters: browser/GPU memory counters are not gated because they are
  environment-sensitive. Disposal tests and deterministic diagnostics cover owned resources.
- Low-end profile: smoke and runtime tests prove lower-detail LOD selection and reduced scatter
  counts.
- Smoke tests: Playwright Chromium exposes a `runtimeDiagnostics=1` read-only test hook and proves
  standard/low-end LOD plus scatter diagnostics while keeping the editor canvas nonblank.

## Validation

- `Validate.cmd`: PASS; format, typecheck, lint, build, Vitest, boundary checks, data validation,
  asset report, and migration check passed.
- `Smoke.cmd`: PASS; 26 Playwright Chromium smoke tests passed.
- Targeted tests: PASS; `npm run test -- lod scatter instancing ThreeRuntime` passed 11 files /
  46 tests. `npm run test -- lod scatter perf low-end` passed 9 files / 37 tests.
- Data validation: PASS; 5 prefabs, 1 level, 3 events, 1 timeline, 1 camera shot, 1 palette,
  8 assets.
- Asset report: PASS; 8 assets, 24884 B used, 46080 B budget, 0 issues.
- Boundary checks: PASS; no forbidden Three.js imports or dynamic-code patterns found.
- `git diff --check`: PASS.

## Commits And Push

- `d0bd86b` docs: lock phase 22 lod instancing plan; pushed to `origin/main`.
- `7b2433d` feat: add lod schema contract; pushed to `origin/main`.
- `9d4b78d` feat: add deterministic lod selection; pushed to `origin/main`.
- `644dfdc` feat: wire lod switching into three runtime; pushed to `origin/main`.
- `b0caca3` feat: add demo lod asset levels; pushed to `origin/main`.
- `3b5364f` feat: add deterministic scatter contract; pushed to `origin/main`.
- `89e4d1a` feat: render scatter groups with instancing; pushed to `origin/main`.
- `9ba9442` test: add lod instancing perf smoke; pushed to `origin/main`.
- `4f1b523` test: integrate lod instancing quality gate; pushed to `origin/main`.
- Final report and roadmap handoff commit: `docs: finalize phase 22 lod instancing vegetation`;
  pushed after final validation.

## Buffer

No buffer rounds were consumed. Rounds 22.9 and 22.10 were skipped because Round 22.8 and
Round 22.11 validation passed after in-round fixes. A Playwright selector was tightened inside
Round 22.8 after LOD assets made `model.switch_wall` ambiguous; this did not require a buffer
round.

## Known Limitations

- Scatter groups are non-selectable instanced batches in Phase 22.
- Browser/GPU memory metrics are not stable enough for a gate in this workspace.
- The first scatter group uses a repeated prop as the vegetation/instancing proof; a full
  vegetation authoring tool is deferred.
- LOD assets are preauthored/offline-generated; runtime mesh simplification remains out of scope.
- Phase 22 does not approve Indirection, InputFlow, ViewRig, LudoWeave, Inscape, Physics, Audio,
  Runtime UI, external adapters, or Phase 23 gameplay implementation.

## Remaining Blockers

None.

## Recommended Next Goal

Complete Phase 23 from `docs/abeto-messenger-development-plan.md`: Compact Spherical World
Prototype. Start only after this Phase 22 PASS final report is pushed. Keep spherical placement,
camera, player movement, and region readability data-first, and do not use Phase 22
LOD/instancing work as permission to add physics, input, Runtime UI, audio, narrative importers,
or external adapters without a scoped guide.
