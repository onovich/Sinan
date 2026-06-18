# Phase 16 Stylized Runtime Foundation Notes

Date: 2026-06-18
Status: Round 16.1 design lock.

Phase 16 starts from the accepted Phase 14 release-candidate baseline and the Phase 15 Abeto Scope Lock final report. Its implementation target is the existing Gate Demo, not a new world, gameplay layer, asset compression pipeline, LOD system, spherical world, Showcase Mode, or multiplayer feature.

## Current Baseline

- `Renderable` currently supports only a `model` asset id.
- Gate Demo entities load model ids through `src/editor/Viewport.tsx`, which calls the renderer-neutral `WebRuntime` interface.
- Three.js material creation, placeholder objects, debug AABB drawing, animation mixers, picking, transform controls, and disposal are all inside `src/runtime/three/**`.
- Data validation already checks prefab, level, entity, model asset, action, condition, timeline, camera shot, and public asset references.
- Browser smoke already verifies a nonblank asset-backed viewport, interaction, timeline preview, save/reload, and narrow layout.

## Boundaries

- Data remains the source of truth. Style choices must live in JSON data or schema-backed config, not hard-coded editor UI state.
- `src/schemas/**`, `src/data/**`, `src/runtime/**` outside `src/runtime/three/**`, `src/world/**`, `src/events/**`, and `src/director/**` must remain renderer-neutral.
- Three.js imports and material/shader details stay in `src/runtime/three/**`.
- React may pass selected entity id, slow style/profile config, and authoring data into runtime, but must not own per-frame material, animation, or render state.
- Editor helpers such as grid, transform gizmo, debug AABB, and authoring overlays must not be replaced by gameplay material styling.

## Proposed Data Shape

Start with a `renderStyle` object on the `Renderable` component:

```json
{
  "Renderable": {
    "model": "model.switch_wall",
    "renderStyle": {
      "profile": "palette-toon",
      "palette": "world_01",
      "tone": "accent",
      "outline": "interactable",
      "highlight": "selected"
    }
  }
}
```

Initial profile policy:

- `standard`: default backward-compatible profile. It should preserve existing GLB or placeholder material behavior.
- `palette-toon`: applies a simple robust toon-like material from palette colors.

Initial optional fields:

- `palette`: named palette id. Required only when the selected profile needs palette data.
- `tone`: a palette tone key such as `base`, `accent`, `warm`, `cool`, or `neutral`.
- `outline`: `none`, `selected`, `interactable`, or `always`.
- `highlight`: `none`, `selected`, `interactable`, or `always`.

Environment style can stay separate from `Renderable` and use level/runtime config for:

- background color
- fog enabled/color/near/far
- color-grade exposure/saturation or an equivalent lightweight renderer-neutral control

## Palette Data

If named palettes are used, add a small Git-friendly JSON file such as `data/palettes/world_01.json`:

```json
{
  "schemaVersion": 1,
  "id": "world_01",
  "tones": {
    "base": "#76b28b",
    "accent": "#5aa7d6",
    "warm": "#d6a15a",
    "cool": "#6d8fd6",
    "neutral": "#9fb0b7"
  }
}
```

Validation should report missing palette ids and missing tone keys with actionable paths.

## Runtime Style Contract

Renderer-neutral runtime types should describe parsed style data without importing Three.js:

- render style profile
- palette id and tone
- outline/highlight behavior
- render environment style
- style quality profile, for example `standard` or `low-end`

The runtime adapter can expose small methods such as applying a style to an entity, applying a project style set, setting selected/highlighted entity ids, and setting render environment options. The exact method names can be refined in Round 16.4 after schema and validation settle.

## Three Runtime Plan

The Three implementation should be small and disposable:

- Add a Three-only material/style registry under `src/runtime/three/**`.
- Keep `standard` as the fallback resolver.
- Implement `palette-toon` with stable built-in Three materials first. Avoid a shader graph and avoid heavy post-processing.
- Apply style only to runtime gameplay/model meshes under the runtime object root.
- Preserve or intentionally dispose replaced materials through existing resource cleanup helpers.
- Keep debug AABB lines, grid, transform controls, and editor helper objects outside style replacement.

## Fallback And Error States

- Missing `renderStyle`: use `standard`.
- Unknown profile: reject in schema or fall back only if explicitly represented by validation policy.
- Missing palette file or tone: data validation should fail with the JSON path.
- Runtime missing palette/style data: use `standard` and warn rather than crash.
- Failed GLB load: existing placeholder fallback must still work and accept style application.
- Low-end mode: disable outline/highlight extras while preserving a readable palette or standard material.

## Gate Demo Style Pass

Round 16.7 applies the first data-backed style pass to existing Gate Demo prefabs:

- `room_blockout`: `palette-toon` with `world_01.neutral`, no outline/highlight.
- `switch_wall`: `palette-toon` with `world_01.accent`, interactable outline, selected highlight.
- `door_wood`: `palette-toon` with `world_01.warm`, selected outline/highlight.
- `player_spawn`: `palette-toon` with `world_01.base`, selected outline/highlight.

The level entity ids, prefab ids, model asset ids, event ids, timeline ids, and camera shot ids remain unchanged. Trigger helpers remain debug AABB overlays instead of gameplay meshes.

## Tests And Validation Strategy

Targeted tests by layer:

- schema tests for valid/invalid `renderStyle`
- data validation tests for palette ids and tones
- runtime-neutral type/adapter tests where practical
- Three runtime tests for material application, fallback, helper exclusion, and disposal
- smoke test for nonblank styled rendering and visible pixel change when style/highlight changes

Round-level validation starts narrow and should end with:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
git diff --check
```

## Phase 17 Handoff Boundary

Phase 16 should not add Draco, meshopt, KTX2, asset reports, triangle budgets, compressed asset loading, LOD, instancing, spherical world projection, gameplay jobs, or multiplayer. Those remain Phase 17 and later.
