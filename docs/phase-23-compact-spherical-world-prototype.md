# Phase 23 Compact Spherical World Prototype Design Lock

Date: 2026-06-22
Status: Round 23.1 design lock.

## Baseline

Phase 23 starts from the accepted Phase 22 baseline:

- Baseline commit: `699dfd7 docs: finalize phase 22 lod instancing vegetation`
- Baseline status: Phase 22 final report is PASS and pushed.
- Existing runtime shape: data-first flat room level, minimal `World`, `EngineSession`
  routing, Three runtime adapter, LOD diagnostics, deterministic scatter, and
  Playwright smoke diagnostics.

The current implementation has no spherical-world source data, no projection schema,
no region contract, no surface movement state, and no spherical camera sampling.
Existing flat-world data must remain valid.

## Phase 23 Scope

Phase 23 delivers a compact spherical-world prototype, not a delivery gameplay slice.

In scope:

- Renderer-neutral world projection contracts.
- Initial `cube-sphere` projection type.
- Readable compact region data for at least three regions.
- Spherical placement from authored local region coordinates.
- Derived sphere-space runtime transforms.
- A narrow Three placement bridge under `src/runtime/three/**`.
- Minimal deterministic player surface movement.
- Stable spherical camera behavior and director compatibility.
- Smoke/perf evidence for compact world readability.

Out of scope:

- Phase 24 delivery jobs, route markers, target feedback, progression, and Showcase Mode.
- Physics/Rapier, InputFlow, ViewRig, Runtime UI, Audio, multiplayer, Inscape, LudoWeave,
  narrative importers, and external adapters.
- Storing generated sphere-space positions, normals, camera quaternions, or Three objects in
  `data/**/*.json`.

## Current Code Audit

`data/levels/level_01.json` is a flat room demo with authored transforms, one scatter group,
events, timelines, and one camera shot.

`LevelSchema` is strict and currently accepts environment, entities, events, timelines,
camera shots, and scatter groups. There is no projection metadata.

`EntitySchema` is strict and currently requires `id`, optional `name`, optional `prefab`,
`transform`, and component payloads. Entity placement must be added in a backwards-compatible
way.

`World` owns entity storage and transform mutation only. It is the correct home for
renderer-neutral placement state and derived world snapshots.

`EngineSession` loads project data, instantiates runtime objects, applies authored transforms,
and routes LOD/scatter/render style data. It may route projection-derived transforms, but it
must not import Three.

`RuntimeTypes` and `WebRuntime` already expose renderer-neutral transform, camera, LOD,
scatter, material, and diagnostics contracts. Spherical placement diagnostics should extend
this style.

`ThreeRuntime` applies direct transforms, owns object placement in Three space, owns camera
pose application, and exposes LOD/scatter diagnostics. Three-specific sphere helpers and
visual placement belong here.

`CameraShotPlayer` and `DirectorCameraSystem` sample flat static, keyframed, follow, and
lookAt shots. Director compatibility should be achieved through renderer-neutral target
resolution and derived entity positions while preserving existing shot data.

`Viewport` exposes a smoke-only diagnostics hook through `__SINAN_RUNTIME_DIAGNOSTICS__`.
Phase 23 should extend this existing diagnostics surface instead of adding a new UI-owned
runtime loop.

## Data Contract Decision

Add optional world projection data to `LevelSchema` so old flat levels remain valid:

```ts
worldProjection?: {
  type: 'cube-sphere';
  radius: number;
  regions: SphericalRegion[];
}
```

Initial region contract:

```ts
interface SphericalRegion {
  id: string;
  name: string;
  label: string;
  face: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
  localBounds: {
    center: [number, number, number];
    size: [number, number, number];
  };
  style?: {
    color?: string;
    tone?: string;
  };
  lodGroup?: string;
  scatterGroup?: string;
}
```

Add optional entity placement data without replacing authored transforms:

```ts
placement?: {
  mode: 'spherical-region';
  region: string;
  localPosition?: [number, number, number];
  localYaw?: number;
}
```

Rules:

- `transform` remains valid and readable authoring data.
- For flat entities, `placement` is omitted and `transform` is applied directly.
- For spherical entities, `transform.position` remains the default local authoring coordinate
  when `placement.localPosition` is omitted.
- Runtime sphere-space transforms are derived, never stored as source JSON.
- Validation owns duplicate region ids, radius range, valid faces, nonnegative bounds,
  entity region references, and flat-level fallback.

## Projection Decision

Projection math lives in renderer-neutral code under `src/world/**` or `src/runtime/**`.
It must not import Three.

The `cube-sphere` helper converts a region face plus local coordinates into a surface frame:

```ts
interface SphericalSurfaceFrame {
  position: Vec3;
  normal: Vec3;
  tangent: Vec3;
  bitangent: Vec3;
  rotation: Quat;
}
```

The helper computes:

- Cube face local `u/v` coordinates from region bounds.
- A cube-space vector for the selected face.
- Normalized sphere-space position scaled by radius plus local height.
- Stable surface normal, tangent, bitangent, and rotation.
- Deterministic rounded results for tests.

Seams and face edges are treated as deterministic projection math first. Full terrain, physics,
and route semantics wait for later phases.

## Spherical Placement Decision

`World` or a narrow world helper derives spherical placement state from level data:

```ts
interface SphericalPlacementResult {
  entityId: string;
  regionId: string;
  authoredLocalPosition: Vec3;
  surfaceFrame: SphericalSurfaceFrame;
  runtimeTransform: RuntimeTransform;
}
```

`EngineSession` should instantiate objects as it does today, then apply the derived runtime
transform when an entity has spherical placement. Flat entities continue through the current
`setTransform` path.

`WebRuntime` may expose optional diagnostics for spherical placements. Three remains the only
place where helper meshes, visual sphere bands, and Three object updates are implemented.

## Player Surface Movement Decision

Player surface movement is a deterministic kinematic prototype.

State:

```ts
interface SurfaceMovementState {
  regionId: string;
  localPosition: Vec3;
  headingRadians: number;
}
```

Command:

```ts
interface SurfaceMovementCommand {
  forward: number;
  turn: number;
  deltaSeconds: number;
}
```

The movement helper:

- Updates heading and local position deterministically.
- Uses projection helpers to derive the current surface frame.
- Supports zero input and stale region failure cases.
- Handles edge crossing by deterministic clamping or region handoff rules documented in tests.
- Does not add Physics, collision, InputFlow, production controls, or runtime UI.

Runtime preview may use a narrow test/smoke seam, but React must not own per-frame movement.

## Camera Decision

Spherical camera behavior is renderer-neutral and surface-relative.

Initial camera requirements:

- Existing flat static, keyframed, follow, and lookAt camera shots remain valid.
- Entity targets on the spherical world resolve to derived sphere-space positions.
- Follow/look behavior keeps a stable up vector from the surface normal.
- Horizon/tangent selection is deterministic across region transitions and face edges.
- FOV, near, and far are preserved.

Do not introduce ViewRig in Phase 23.

## Smoke And Validation Strategy

Round-level smoke should reuse existing diagnostics where possible:

- Extend `__SINAN_RUNTIME_DIAGNOSTICS__` with spherical placement or region counters.
- Verify nonblank compact world rendering.
- Assert at least three readable regions are present in data/diagnostics.
- Step the deterministic movement seam and assert the player moves on the sphere.
- Sample camera orientation around region transitions.
- Preserve LOD/scatter diagnostics and low-end profile checks.

Targeted tests should cover:

- Missing projection flat-level fallback.
- Invalid radius, face, bounds, duplicate region ids, and stale entity region reference.
- Cube-sphere faces, seams, corners, and radius scaling.
- Spherical placement transform derivation.
- Movement zero input, forward, turn, edge crossing, and stale region.
- Camera follow/look stability and director compatibility.
- Three placement bridge behavior, disposal, LOD/scatter continuity, and boundary checks.

## Round Mapping

- Rounds 23.2-23.4 add schema, projection math, and renderer-neutral placement.
- Rounds 23.5-23.6 add Three placement and compact region data.
- Rounds 23.7-23.10 add movement, camera behavior, and director compatibility.
- Rounds 23.11-23.12 prove LOD/scatter, smoke, and low-end readability.
- Rounds 23.13-23.15 are buffer rounds only.
- Round 23.16 finalizes the Phase 23 report and routes the next goal to Phase 24.

## Phase 24 Handoff

Phase 24 may build Delivery Gameplay Showcase on top of this compact spherical-world
prototype. Delivery jobs, route feedback, target interaction, runtime UI, audio, and production
input semantics remain Phase 24 concerns and must be introduced only through the Phase 24 guide.
