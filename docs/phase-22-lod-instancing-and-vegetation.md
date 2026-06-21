# Phase 22 LOD Instancing And Vegetation Design Lock

Status: Design locked for goal-mode execution.
Date: 2026-06-21.
Baseline commit: `b56471d docs: finalize phase 21.5 contract gate`.

## 1. Baseline

Phase 21.5 is PASS and pushed. Phase 22 starts after the external infrastructure contract gate and remains an implementation phase for Sinan-owned LOD, instancing, and vegetation contracts.

Current audit:

- `data/assets.manifest.json` already contains light `lodGroup` and `instancing` metadata hints.
- No formal LOD group schema exists yet.
- No scatter or vegetation schema exists yet.
- `Renderable` components currently reference one model asset id.
- `LevelSchema` has entities, events, timelines, and camera shots, but no scatter groups.
- `RuntimeTypes.ts` has renderer-neutral transforms, camera, render style, material, shader global, and low-end style quality contracts.
- `WebRuntime` has model load/instantiate, transform, style, material, camera, gizmo, update, render, and dispose methods.
- `ThreeRuntime` owns GLB instantiation, Three scene objects, material binding, style helpers, editor camera, picking, gizmo, animation mixers, postprocess, and disposal.
- `ThreeAssetLoader` loads by public asset id and URL, caches loaded GLB scenes, clone/disposes render resources, and falls back to placeholders through `ThreeRuntime`.
- Existing smoke coverage proves the editor/runtime canvas renders, low-end style quality changes pixels, picking/selection works, save/reload works, and the layout remains contained.

## 2. Phase 22 Scope

Phase 22 implements traditional data-driven LOD, deterministic scatter, Three `InstancedMesh` runtime support, low-end LOD bias, and perf/smoke evidence.

Phase 22 does not approve:

- runtime dynamic mesh reduction
- runtime mesh decimation
- UE Nanite-style virtualized geometry
- meshlet streaming
- WebGPU geometry pipelines
- external asset-pipeline dependencies
- Indirection runtime loader replacement
- InputFlow, ViewRig, LudoWeave, Inscape, Physics, Audio, Runtime UI, gameplay controller, spherical world, multiplayer, or Phase 23 scope

## 3. LOD Contract Decision

Phase 22 will use preauthored or offline-generated LOD model assets. Runtime selection chooses between already-authored asset ids; it does not simplify geometry at runtime.

The LOD source of truth will stay renderer-neutral and asset-id based. The preferred schema shape for Round 22.2 is an optional `lodGroups` record in `data/assets.manifest.json`, because asset manifest already owns public asset ids, metadata, budgets, and existing `lodGroup` hints.

Draft shape:

```json
{
  "lodGroups": {
    "gate-demo-switch": {
      "strategy": "distance",
      "hysteresis": 1,
      "lowEndBias": 1,
      "fallbackAsset": "model.switch_wall.lod2",
      "levels": [
        { "level": 0, "asset": "model.switch_wall.lod0", "minDistance": 0 },
        { "level": 1, "asset": "model.switch_wall.lod1", "minDistance": 8 },
        { "level": 2, "asset": "model.switch_wall.lod2", "minDistance": 16 }
      ]
    }
  }
}
```

Rules to validate:

- group ids are stable strings
- levels are unique and ordered
- `level` starts at 0
- first `minDistance` is 0
- later `minDistance` values strictly increase
- `hysteresis` is nonnegative and smaller than the narrowest adjacent threshold gap
- `lowEndBias` is an integer level offset
- all referenced assets exist and are type `model`
- fallback asset exists and is one of the group levels
- LOD groups reference public asset ids, not URLs, paths, Three objects, geometry handles, or generated runtime caches

## 4. LOD Selection Decision

Round 22.3 will add a pure renderer-neutral selector. The selector input should include:

- group definition
- camera distance or equivalent runtime distance signal
- previous selected level
- quality profile
- optional disabled or fallback state

The initial selector should use distance thresholds. It may later be extended to screen coverage, but Phase 22 should choose the smaller deterministic model first.

Anti-popping behavior:

- Hysteresis holds the previous level until distance crosses the next threshold by the configured margin.
- If there is no previous level, selection uses the raw threshold result.
- Low-end profile applies `lowEndBias` after threshold selection and clamps to the coarsest available level.

## 5. Three Runtime LOD Decision

Three runtime switching belongs under `src/runtime/three/**`.

Allowed Three-owned work in later rounds:

- loading all LOD model assets through existing `ThreeAssetLoader`
- cloning and disposing GLB resources
- binding visible object per selected LOD level
- tagging runtime objects with entity id and selected asset id
- preserving material/style application
- preserving selection/picking behavior or documenting limitations
- exposing diagnostics and perf counters through renderer-neutral summaries

Forbidden leakage:

- no `THREE.Object3D`, `THREE.Mesh`, `THREE.InstancedMesh`, geometry, material, renderer info, GLTF scene, or Three-specific handle in `data/**/*.json`
- no Three imports outside `src/runtime/three/**` and accepted thin editor glue
- no React state ownership of per-frame LOD selection

## 6. Demo LOD Asset Decision

The first three-level LOD path should use a small generated prop asset, preferably a switch or repeated prop. `model.switch_wall` is already marked `instancing: "eligible"` and belongs to `lodGroup: "gate-demo-props"`, so it is the best first candidate.

Round 22.5 may generate stable source GLBs through the existing `scripts/generate-dev-glb-assets.ts` workflow or a small Phase 22 generator extension. The generated assets must remain small, reviewable, and source-controlled only when intentionally added.

## 7. Scatter And Vegetation Decision

Scatter is level-specific authored intent, not an asset backend cache. Round 22.6 should add renderer-neutral scatter groups to `LevelSchema` unless implementation proves a dedicated data file is cleaner.

Draft shape:

```json
{
  "scatterGroups": [
    {
      "id": "gate-demo-switch-repeat",
      "source": { "type": "asset", "asset": "model.switch_wall" },
      "count": 12,
      "seed": 22001,
      "placement": {
        "type": "box",
        "center": [4, 0, 5],
        "size": [6, 0, 3]
      },
      "rotationY": { "min": -15, "max": 15 },
      "scale": { "min": 0.9, "max": 1.1 },
      "lowEndCountBias": 0.5,
      "fallback": "skip-with-diagnostic"
    }
  ]
}
```

Rules to validate:

- ids are unique per level
- count is bounded and nonnegative
- seed is explicit
- source asset or prefab exists
- transform ranges are finite and ordered
- placement shape is finite and nonempty
- low-end count bias is clamped
- empty scatter is valid only when explicit
- missing/incompatible source has deterministic diagnostics or fallback

## 8. Instancing Decision

Three `InstancedMesh` support belongs under `src/runtime/three/**`.

The first instancing implementation should:

- consume deterministic scatter transforms from renderer-neutral runtime data
- create at least one `InstancedMesh` for a repeated prop or vegetation group
- keep geometry/material extraction and resource ownership inside Three runtime
- handle missing assets with explicit fallback or skipped group diagnostics
- dispose instanced geometry/material resources
- document picking/selection limitations for instanced groups

Phase 22 instanced scatter groups are rendered as non-selectable batches. Picking remains entity-based; scatter group observability comes from runtime diagnostics and smoke counters until a later phase defines per-instance selection semantics.

Phase 22 should not build a full vegetation authoring tool. It should prove deterministic data, one instanced render path, and practical smoke/perf evidence.

## 9. Perf And Smoke Decision

Phase 22 acceptance should prefer stable counters:

- draw calls
- triangle estimates from metadata or traversed geometry
- instance counts
- loaded LOD group count
- selected LOD level
- renderer info memory counters where stable

If browser memory metrics are environment-sensitive, the final report should record that limitation and rely on deterministic draw-call, triangle, instance count, and renderer info counters.

Smoke must prove:

- editor shell still loads
- runtime canvas remains nonblank
- low-end profile changes LOD or scatter behavior
- LOD or instancing state is observable through a deterministic runtime/smoke signal
- no generated smoke artifacts are committed unless explicitly stable fixtures

## 10. Round 22.1 Decision

Proceed with the 12-round Phase 22 guide:

- Round 22.2 adds the LOD schema and validation contract.
- Round 22.3 adds pure runtime LOD selection.
- Round 22.4 wires LOD switching into Three runtime.
- Round 22.5 adds the demo three-level LOD asset path and asset report signals.
- Round 22.6 adds scatter schema and deterministic placement.
- Round 22.7 renders scatter through Three `InstancedMesh`.
- Round 22.8 adds perf smoke and low-end gate evidence.
- Rounds 22.9 and 22.10 are buffers.
- Round 22.11 integrates the LOD/instancing gate.
- Round 22.12 writes the final report and Phase 23 handoff.
