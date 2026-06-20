# Phase 19 Shader Dissolve And Material Timeline

Status: Design lock for Phase 19 execution.
Last updated: 2026-06-20.

Phase 19 turns the Phase 18 shader material foundation into one production story-material proof. The target is intentionally narrow: a dissolve/open-gate material, deterministic timeline and action control over public material parameters, a small editor inspector surface, and browser smoke evidence that the material changes visibly.

## Baseline Audit

- Phase 18 shipped renderer-neutral `MaterialDefinition`, `MaterialRegistry`, `MaterialRuntime`, raw GLSL imports, a Three `ShaderMaterial` backend, fallback behavior, renderable material slots, validation, and a Chromium shader compile smoke.
- Phase 18.5 moved editor runtime orchestration behind `EngineSession`, `EngineLoop`, `World`, and `EditorSessionBridge`; Phase 19 must use that path instead of putting material orchestration back into `src/editor/Viewport.tsx`.
- Current `MaterialRuntime.setParameter` exists, but `src/runtime/three/materials/ThreeMaterialRuntime.ts` only maps public parameter updates for `debug.uv-gradient`.
- Current data already has a visible proof target: `gate_a` in `data/levels/level_01.json`, using prefab `door_wood`, and `data/timelines/tl_open_gate.json` already drives the gate opening flow.
- `ReferenceResolver` already validates `Renderable.materials`, supported slot `main`, public parameter names, material registry parameters, and texture/image references.
- Timeline currently supports `property` tracks with deterministic sampling, but there is no `material.parameter` track yet.
- Action registry currently supports gameplay/director actions, but there is no `material.setParameter` action yet.
- Inspector currently edits transform and known component payloads; it does not inspect or edit material definitions or public parameters.

## Production Material

Material id: `story.gate-dissolve`.

Display name: `Gate Dissolve`.

Implementation owner:

- Renderer-neutral definition: `src/runtime/materials/BuiltInMaterials.ts`.
- Three implementation: `src/runtime/three/materials/**`.
- Shader source: `src/shaders/materials/story/gate-dissolve.vert.glsl` and `src/shaders/materials/story/gate-dissolve.frag.glsl`.

Public parameters:

| Parameter | Type | Default | Range | Timeline | Purpose |
| --- | --- | --- | --- | --- | --- |
| `progress` | number | `0` | `0..1` | continuous | Dissolve amount; `0` means fully visible, `1` means dissolved. |
| `edgeWidth` | number | `0.08` | `0..0.35` | continuous | Width of the glowing dissolve edge. |
| `edgeColor` | color | `#ffcf70` | n/a | continuous | Edge glow color for the gate reveal. |
| `baseColor` | color | `#9b6a3c` | n/a | continuous | Warm wood tint used by the story material. |
| `noiseScale` | number | `8` | `1..32` | continuous | Procedural noise scale. |

Asset plan: use inline procedural GLSL noise for the first production material. Phase 19 will not add a texture/noise asset unless implementation or smoke proves it is necessary. This keeps the first story material focused on public parameters and runtime binding rather than texture-loading scope.

Non-public implementation details:

- Three uniforms may use backend names such as `uProgress`, but data, timeline tracks, events, editor UI, schemas, and director code must only use public names such as `progress`.
- GLSL source lives in `.glsl` files imported by TypeScript with `?raw`; no GLSL source is stored in JSON.
- The material uses `ShaderMaterial`, not `RawShaderMaterial`, shader graph, TSL, or WGSL.

## Demo Target

Target entity: `gate_a`.

Target slot: `main`.

Data assignment path:

- Add `Renderable.materials.main.materialId = "story.gate-dissolve"` for the gate through the existing data model.
- Prefer assigning the material at the level entity override for `gate_a` so the proof is localized to the Gate Demo. Keep prefab-level assignment only if later inspection shows the same material should be shared by every `door_wood` use.
- Initial parameters should start with `progress: 0`, visible warm base color, and an edge color that reads clearly in the existing Gate Demo lighting.

## Timeline Path

Track type: `material.parameter`.

Shape:

```json
{
  "id": "track_gate_dissolve_progress",
  "type": "material.parameter",
  "target": "gate_a",
  "slot": "main",
  "parameter": "progress",
  "keys": [
    { "time": 0.4, "value": 0, "ease": "linear" },
    { "time": 2.0, "value": 1, "ease": "easeOutCubic" }
  ]
}
```

Integration plan:

- Schema uses the existing public material parameter value schema and public parameter name schema.
- A dedicated material parameter track sampler mirrors the deterministic behavior of `PropertyTrackPlayer`, including numeric/color/vec interpolation where applicable and discrete fallback for non-continuous values.
- `DirectorSystem` samples active `material.parameter` tracks during playback and scrub.
- Runtime routing goes through a renderer-neutral command/path on `WebRuntime` and `EngineSession`, then reaches `MaterialRuntime.setParameter` in the Three backend.
- Timeline data never addresses raw uniforms.

## Action Path

Action type: `material.setParameter`.

Shape:

```json
{
  "type": "material.setParameter",
  "entityId": "gate_a",
  "slot": "main",
  "parameter": "progress",
  "value": 0
}
```

Integration plan:

- Extend `src/schemas/action.schema.ts` with entity id, slot, public parameter name, and typed public value.
- Register the action in `createDefaultActionRegistry`.
- The action should be `previewSafe` because it writes a deterministic material parameter through the same runtime port used by timeline preview.
- Extend `RuntimeActionPort` / `WebRuntime` with a renderer-neutral material parameter command instead of importing material runtime or Three into events/director/editor code.
- `ReferenceResolver` validates entity existence, slot support, material id existence, parameter existence, and parameter value compatibility for the entity's effective `Renderable.materials` slot.

## Material Inspector MVP

Location: existing Inspector panel or a sibling sub-section inside the selected entity inspector.

MVP behavior:

- Show selected entity renderable material slots.
- Show material id, display name, and current/default public parameter values.
- Provide controls for Phase 19 public parameter types: number, color, boolean, vec2, vec3, texture id/null as read/write where supported by current schemas.
- Commit data changes through existing editor command/component update patterns so undo/dirty/save behavior remains editor-owned.
- Optionally send preview parameter updates through `EditorSessionBridge` when a runtime is available.
- Display validation errors from schemas/registry in the panel.

Explicitly not included:

- Shader graph.
- Raw GLSL or uniform editing.
- Three material object inspection.
- Multi-material slot authoring beyond the existing supported `main` slot.

## Smoke And Validation Strategy

- Keep the existing S0 debug shader compile smoke intact.
- Extend the shader smoke fixture to compile `story.gate-dissolve` with the actual Chromium renderer.
- Add a small rendered-state assertion proving that `progress = 0` and `progress = 1` produce measurably different pixels.
- Add unit coverage for material definition registration, factory defaults, runtime parameter updates, reset behavior, missing binding, unsupported parameter, and fallback behavior.
- Add timeline/action/schema/reference coverage before using the data in the Gate Demo.
- Add editor smoke or component tests only after the Inspector MVP exists.

## Non-Scope

Phase 19 does not add shader globals, postprocessing, a second production material, LOD, instancing, spherical world work, gameplay input, physics migration, multiplayer, runtime UI, package identity migration, shader graph, TSL, WGSL, arbitrary `onBeforeCompile` patching, raw uniforms in data, or broad visual regression infrastructure.

## Round 19.1 Decisions

- Chosen production material id: `story.gate-dissolve`.
- Chosen proof target: `gate_a` / `main` in the Gate Demo.
- Chosen noise plan: inline procedural GLSL noise, no new texture asset for the first implementation.
- Chosen runtime path: `material.parameter` and `material.setParameter` route through public parameters, `DirectorSystem`, runtime action ports, `EngineSession`, `WebRuntime`, and Three `MaterialRuntime`.
- Chosen editor path: Material Inspector MVP in the selected entity inspector, command-backed data edits, optional bridge-backed runtime preview.
- Chosen smoke proof: Chromium shader compile plus pixel-difference fixture for `progress`.
