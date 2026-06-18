# Release Candidate Checklist

Use this checklist before calling a Sinan Scene Director checkout demo-ready.

## Phase 14 Finalization Result

Status: PASS on 2026-06-18.

Evidence is recorded in `docs/phase-14-release-candidate-finalization.md`.

Summary:

- `npm ci` passed from the current lockfile.
- `npm audit --audit-level=moderate` passed; one low severity `esbuild` advisory remains below the release threshold.
- `Validate.cmd` passed.
- `Smoke.cmd` passed with 13 Playwright tests after starting the persistent wrapper dev server for the final health check.
- A browser demo gate confirmed runtime ready state, `switch_a` Inspector selection, `tl_open_gate` scrub feedback, subtitle feedback, and no console errors.

## Fresh Checkout

- [ ] Clone the repository.
- [ ] Confirm Node.js and npm are available.
- [ ] Install dependencies:

```powershell
npm ci
```

- [ ] If generated development assets are missing, regenerate them:

```powershell
npm run generate:dev-assets
```

- [ ] Review dependency audit output and confirm no moderate-or-higher vulnerability blocks the release:

```powershell
npm audit --audit-level=moderate
```

## Required Validation

- [ ] Run the configured validation wrapper:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

- [ ] Confirm direct validation passes when wrappers are not available:

```powershell
npm run format:check
npm run typecheck
npm run lint
npm run build
npm run test
npm run check-boundaries
npm run validate-data
npm run report-assets
npm run migrate-data -- --check
```

- [ ] Run browser smoke:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
```

- [ ] Confirm Playwright smoke covers desktop workflow, save/reload workflow, and narrow viewport workflow.

## Demo Workflow

- [ ] Start the local editor:

```powershell
npm run dev -- --port 5174 --strictPort
```

- [ ] Open `http://127.0.0.1:5174/`.
- [ ] Confirm the viewport reaches `Level loaded`.
- [ ] Confirm the room, gate, switch, player marker, and trigger bounds are visually distinguishable.
- [ ] Select `switch_a` and confirm structured component editing is visible.
- [ ] Play or scrub `tl_open_gate` and confirm visible camera/timeline/runtime feedback.
- [ ] Confirm event, timeline, and camera shot panels can save valid data and reject invalid data through schema validation.
- [ ] Confirm no browser console errors appear during the common demo flow.

## Architecture Gate

- [ ] `npm run check-boundaries` passes.
- [ ] No Three.js imports appear in renderer-neutral layers.
- [ ] No dynamic-code execution patterns appear in project source, data, scripts, or tests.
- [ ] New actions and conditions have schema entries, registry entries, tests, and validation coverage.
- [ ] Timeline preview still skips unsafe runtime-only/destructive effects.

## Data And Asset Gate

- [ ] `npm run validate-data` passes.
- [ ] `npm run report-assets` passes and reports zero critical issues.
- [ ] Save or reference the latest asset report summary in the release notes when asset budgets change.
- [ ] `data/assets.manifest.json` references existing files under `public/`.
- [ ] Model assets use `.glb` or `.gltf`; audio assets use `.mp3`, `.ogg`, or `.wav`.
- [ ] Every manifest asset declares `metadata.sizeBudgetBytes`; model assets declare triangle, texture, material profile, and compression metadata.
- [ ] Animation clips referenced by actions or timelines are declared in `metadata.clips` when clip metadata is known.
- [ ] Stable ids are used for entities, prefabs, assets, events, timelines, tracks, and camera shots.

## Documentation Gate

- [ ] `README.md` explains setup, validation, architecture boundaries, and docs map.
- [ ] `docs/developer-guide.md` covers assets, actions, conditions, timelines, camera shots, and editor authoring.
- [ ] `docs/phase-13-testing-performance-boundaries.md` documents smoke scope, boundary automation, bundle hygiene, and runtime lifecycle coverage.
- [ ] Any new release limitation is written down before the release is tagged or shared.

## Git Gate

- [ ] Commit all release-candidate changes.
- [ ] Push to `origin/main`.
- [ ] Confirm no unrelated or generated files are accidentally staged.
- [ ] Confirm `git status --short --branch` is clean for the release worktree.
