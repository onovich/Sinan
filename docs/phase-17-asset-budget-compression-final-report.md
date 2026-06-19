# Phase 17 Asset Budget And Compression Final Report

Date: 2026-06-19

## Status

PASS.

Phase 17 completed typed asset metadata, budget validation, asset reporting, routine validation wiring, and a Three-only compressed-loader strategy without starting Shader runtime, LOD, instancing, spherical world, gameplay, or multiplayer scope.

## Completed

- Added typed asset metadata schemas for budget, material profile, texture usage/colorSpace, compression readiness, texture compression readiness, clips, source, notes, and controlled extras.
- Populated `data/assets.manifest.json` metadata for the current five Gate Demo assets.
- Added `AssetBudgetValidator` and integrated it into `validateProject` and `npm run validate-data`.
- Added `npm run report-assets` with human and `--json` output.
- Wired `npm run report-assets` into `.codex/project-ops-workflow.json` so `Validate.cmd` runs the report.
- Added a Three-only compression loader strategy in `src/runtime/three/ThreeCompressedAssetLoader.ts`.
- Added tests for metadata schema, asset budget validation, report output, missing required decoder support, and compression loader hook configuration.
- Updated developer, release, roadmap, and workflow docs for Phase 17 and the Phase 18 Shader GLSL handoff.

## Asset Metadata And Report Changes

- Current report summary: 5 assets, 19,404 B used, 36,864 B budget, 0 issues.
- Current compression summary: 0 compressed assets / 0 B, 5 source assets / 19,404 B.
- Current budget summary: 5 pass, 0 fail, 0 unknown; metadata missing 0; missing files 0.
- Current assets remain honest source assets with `compression.codec: "none"` and `status: "source"`.
- Required non-`none` compression codecs now fail validation/reporting unless decoder support is explicitly configured.
- Texture usage/colorSpace metadata is schema-backed and documented for future texture assets.

## Runtime Compression Strategy

- `GltfThreeModelLoader` still defaults to regular `GLTFLoader` behavior.
- Optional Draco, Meshopt, and KTX2 hooks are configured only through explicit factories and decoder/transcoder paths.
- Missing decoder/transcoder config leaves the current uncompressed GLB fallback path active.
- All Three loader/compression code remains inside `src/runtime/three/**`.
- No ShaderMaterial, MaterialRuntime, postprocessing, LOD, instancing, world, gameplay, or multiplayer work was added.

## Docs Updated

- `docs/phase-17-asset-budget-compression.md`
- `docs/developer-guide.md`
- `docs/release-checklist.md`
- `.codex/project-ops-workflow.json`
- `docs/abeto-messenger-development-plan.md`
- `docs/development-plan.md`
- `docs/post-mvp-development-plan.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/phase-16-stylized-runtime-foundation-final-report.md`
- `docs/phase-17-asset-budget-compression-goal-mode-execution-guide.md`

## Validation

- `Validate.cmd`: PASS on 2026-06-19. Includes format, typecheck, lint, build, test, check-boundaries, validate-data, report-assets, and migration check. Lint still reports the pre-existing Fast Refresh warning in `src/editor/Viewport.tsx`.
- `Smoke.cmd`: PASS on 2026-06-19 with 14 Playwright smoke tests.
- `npm run report-assets`: PASS on 2026-06-19 with zero issues.
- `git diff --check`: PASS on 2026-06-19.
- Boundary checks: PASS through `Validate.cmd`.

## Commits And Push

All listed commits were pushed to `origin/main`.

- `8d28d2c` docs: lock phase 17 asset budget plan
- `b066b8b` feat: type asset manifest metadata
- `7cbe542` data: add asset budget metadata
- `fe53f2a` feat: validate asset budgets
- `45babb1` feat: add asset report command
- `2af775c` feat: expand asset report budgets
- `2f23cb4` chore: run asset reports during validation
- `81c1b74` feat: add three compression loader strategy
- `d94d11f` feat: validate compression readiness metadata
- `9567d51` docs: document asset authoring workflow
- `4950247` docs: update phase 17 release handoff

The final report commit contains this file and the Phase 17 PASS roadmap marker.

## Buffer

Not consumed.

Rounds 17.13-17.15 were skipped because Round 17.12 integrated validation and smoke passed without release-blocking issues.

## Known Limitations

- The repository does not include production compressed GLB, Draco decoder files, Meshopt decoder configuration, or KTX2/Basis transcoder assets.
- Current Gate Demo assets are generated source placeholder assets, not final optimized art.
- No texture/image assets are currently present in `data/assets.manifest.json`; texture usage/colorSpace policy is validated and documented for future assets.
- glTF Transform commands are documented as optional recommendations, not project-local required scripts.
- Existing unrelated untracked files remain intentionally uncommitted, including Web3D shader planning docs, `docs/abeto_messenger_technology_research.pdf`, `docs/project-collaboration-brief.md`, and `tmp/`.

## Remaining Blockers

None for Phase 17.

## Recommended Next Goal

Complete Phase 18 from `docs/abeto-messenger-development-plan.md`: Shader GLSL Material Runtime Foundation. Use `docs/phase-18-shader-glsl-material-runtime-foundation-goal-mode-execution-guide.md` for the goal-mode run.
