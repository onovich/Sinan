# Phase 17 Asset Budget And Compression

Status: design locked for implementation.

This phase turns the current loose asset manifest into a typed, reportable, compression-ready asset pipeline while keeping the runtime demo behavior stable. It follows Phase 16's accepted stylized runtime foundation and prepares asset governance for later world-scale work without starting LOD, instancing, spherical worlds, gameplay expansion, or multiplayer.

## Current Baseline

The source of truth is still `data/assets.manifest.json`. It currently declares five demo assets:

| Asset id | Type | URL | Current file size |
| --- | --- | --- | --- |
| `model.room_blockout` | `model` | `/models/room_blockout.glb` | 3,544 bytes |
| `model.switch_wall` | `model` | `/models/props/switch_wall.glb` | 1,596 bytes |
| `model.door_wood` | `model` | `/models/props/door_wood.glb` | 2,020 bytes |
| `model.player_spawn` | `model` | `/models/markers/player_spawn.glb` | 1,616 bytes |
| `audio.switch_click` | `audio` | `/audio/switch_click.wav` | 10,628 bytes |

Existing validation already checks root-relative URLs, allowed file extensions, missing public files, asset reference ids, asset reference types, and animation clip metadata when known. The gap is that `metadata` is currently a loose record, no per-asset size budget exists, no asset report is generated, and the Three loader has no typed strategy for compressed models or decoder fallback.

## File Boundaries

- `data/assets.manifest.json` remains the source of truth for asset ids, URLs, typed metadata, budgets, and compression readiness.
- `src/schemas/asset.schema.ts` owns the Zod schema and TypeScript types for manifest metadata.
- `src/data/**` owns editor/runtime-neutral asset validation and report inputs.
- `scripts/report-assets.ts` will own filesystem-backed reporting for local assets under `public/`.
- `src/runtime/three/**` is the only allowed location for Three.js compression loader code and decoder strategy.
- `docs/developer-guide.md`, `docs/release-checklist.md`, and phase reports own authoring/release guidance.

No Three.js import may move into `src/game`, `src/events`, `src/director`, `src/world`, `src/schemas`, `src/data`, or `src/migrations`.

## Metadata Policy

Each manifest entry keeps `type` and `url` required. Phase 17 will replace loose ad hoc metadata with a typed optional object that is still plain JSON:

- `clips`: model animation clip names used by event/timeline validation.
- `sizeBudgetBytes`: optional per-asset byte budget checked against the resolved `public` file.
- `compression`: optional declared compression readiness for model assets.
- `notes`: optional short author-facing notes for manual asset review.

Compression metadata is descriptive and deterministic. It must not embed arbitrary scripts, functions, decoder code, or generated runtime behavior in data.

The expected initial metadata pass for the current five assets is:

- all five assets receive explicit `sizeBudgetBytes` values above their current file sizes;
- `model.door_wood` preserves `clips: ["Open"]`;
- model assets may declare uncompressed source readiness first;
- audio remains reportable without Three compression metadata.

## Budget Policy

Budgets are per asset rather than global-only. This makes failures actionable at the same path where authors already edit asset ids and URLs.

Validation states:

- Success: file exists, metadata parses, file size is at or below `sizeBudgetBytes`, and type-specific metadata is supported.
- Missing metadata: an asset has no required budget metadata once Phase 17 enforcement is enabled.
- Over budget: resolved public file size exceeds the declared `sizeBudgetBytes`.
- Missing file: the manifest URL does not resolve to a file under `public/`.
- Unsupported decoder: model compression metadata asks for a decoder or compression mode that the current Three runtime strategy does not support.

The first implementation should keep failures as validation errors for local data and should make warnings explicit only when a state is intentionally non-blocking. Release-candidate validation should run asset reporting before handoff.

## `report-assets` Shape

`npm run report-assets` will be added as a CLI report over `data/assets.manifest.json` plus files under `public/`.

Human output should include:

- total asset count and total bytes;
- one row per asset with id, type, URL, actual bytes, budget bytes, delta, compression mode, and status;
- grouped error lines for missing metadata, over-budget assets, missing files, and unsupported decoder declarations.

Machine output should be available as JSON through a CLI flag so later CI or release notes can consume the same calculations without parsing text. The JSON should include:

- `summary`: asset count, total bytes, total budget bytes, and error count;
- `assets`: normalized per-asset rows;
- `issues`: path, severity, asset id, and message.

The current five assets should report as five rows with actual byte sizes taken from `public/`; after the metadata pass they should all be within budget.

## Loader Strategy

Runtime behavior stays stable while loader strategy becomes explicit:

- default model loading continues through `GLTFLoader` in `src/runtime/three/ThreeAssetLoader.ts`;
- compression helpers and decoder configuration stay under `src/runtime/three/**`;
- unsupported or unavailable decoder states must fail into the existing asset-loader failure path, preserving placeholder fallback behavior in the editor/runtime;
- cache semantics stay keyed by asset id and URL, with compression strategy changes considered part of the loader input only when they affect the fetched representation.

Phase 17 may add Draco or Meshopt readiness metadata and tests, but it does not need to ship compressed replacement assets. The phase is successful when the manifest, report, validation, and runtime fallback path can distinguish compressed-ready, uncompressed, missing decoder, and failed-load states without breaking the current GLB demo.

## Non-Scope

Phase 17 does not implement:

- LOD selection or instancing;
- world streaming, spherical-world coordinates, or partitioning;
- gameplay feature expansion;
- multiplayer replication;
- asset CDN upload or remote cache invalidation;
- editor UI redesign beyond any minimal status text needed for validation.

Those topics remain deferred to later phase guides.

## Round 17.1 Acceptance Notes

This design keeps the manifest data-first, keeps Three runtime work isolated to `src/runtime/three/**`, and makes `report-assets` the named bridge between authoring metadata and release validation. Implementation rounds should update this document only when an accepted policy changes.
