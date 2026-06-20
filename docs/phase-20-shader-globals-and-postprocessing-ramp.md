# Phase 20 Shader Globals And Postprocessing Ramp

Date: 2026-06-20
Status: Design lock for Phase 20 execution.

## Baseline

Phase 19 is PASS and pushed at `87800d5 docs: finalize phase 19 shader dissolve timeline`.

Current shader/material baseline:

- Renderer-neutral material contracts live under `src/runtime/materials/**`.
- The active material definitions are `debug.uv-gradient` and `story.gate-dissolve`.
- Public material parameters are validated through `MaterialRegistry`, `material.schema.ts`, `ReferenceResolver`, `material.parameter` timeline tracks, `material.setParameter` actions, and Material Inspector MVP.
- `EngineSession.step()` is the single update/render route for the editor runtime. `Viewport.tsx` must stay an authoring surface and must not own per-frame shader state.
- `ThreeRuntime.render()` currently calls `renderer.render(scene, camera)` directly. There is no composer, pass runtime, shader global update path, second production material, or postprocess data contract.
- `ThreeEnvironmentStyle.colorGrade` currently uses renderer exposure plus a DOM CSS filter. It is a lightweight style control, not a postprocessing pipeline.

Existing unrelated worktree changes include external infrastructure/RFC/strategy documents. They are not Phase 20 implementation scope and must not be staged with Phase 20 commits unless the user explicitly changes the task.

## Phase 20 Design

### ShaderGlobals

Add a renderer-neutral `ShaderGlobals` contract under `src/runtime/materials/**`.

Initial supported values:

- `elapsedSeconds`
- `deltaSeconds`
- `viewportSize`
- optional `cameraPosition`

Deferred values:

- player position, world signals, input state, physics state, and gameplay-specific values.

`ShaderGlobals` is runtime input state only. It is not a JSON authoring format and must not become a data source-of-truth file.

Update source:

- `EngineLoop` remains the authoritative frame clock.
- `EngineSession.step()` routes elapsed/delta globals to `WebRuntime`.
- `EngineSession.resize()` routes viewport globals to `WebRuntime`.
- React state is not used for per-frame shader globals.

### Global Binding

`WebRuntime` may expose a renderer-neutral `setShaderGlobals` method or equivalent narrow frame update payload. It must not expose raw uniform names.

`ThreeMaterialRuntime` owns raw uniform binding. Materials that declare supported global uniforms can receive values such as internal `uTime`, `uDeltaTime`, and `uViewportSize`; materials without those uniforms skip global updates without warning.

Object reuse is required for Three `Vector2`, `Vector3`, and color/vector uniform values where per-frame updates occur.

### Second Production Material

Use material id `story.hologram-scanline`.

Purpose:

- prove the runtime is not hard-coded to dissolve;
- prove global time reaches visible shader behavior;
- keep story-critical state controlled by public parameters instead of inferred from global time.

Initial public parameters:

- `intensity`: number, continuous, default `0.75`
- `baseColor`: color, continuous, default `#5aa7d6`
- `scanlineColor`: color, continuous, default `#ffcf70`
- `scanlineDensity`: number, continuous, default `36`
- `flickerStrength`: number, continuous, default `0.12`

Global usage:

- read global elapsed time and viewport where useful for scanline/flicker animation;
- keep critical progression explicit through `intensity` and public parameters.

Demo target:

- prefer `switch_a` or a small explicit smoke fixture first;
- avoid changing the gate dissolve story proof unless needed for validation.

### Material Lifecycle Policy

Phase 20 makes the policy explicit:

- Static equal-parameter built-in style materials may share through the existing render-style path.
- Shader story materials remain per-entity owned by `ThreeMaterialRuntime` because timeline/actions can mutate public parameters independently.
- Reapplying a material to the same entity/slot disposes the previous owned shader material and preserves original material restoration.
- Entity destruction and scene reload must restore original materials and dispose owned shader/fallback materials.
- High-cardinality shader variation is deferred to Phase 22+ instancing/attributes; Phase 20 must not create material instances per frame.

Resource diagnostics should observe `renderer.info.memory` and `renderer.info.programs` in browser smoke or narrow Three runtime tests. The acceptance target is no sustained linear growth across repeated apply/dispose cycles, not zero counters immediately after a render.

### Postprocessing

Add a Three-only runtime boundary under `src/runtime/three/**`, likely `ThreePostProcessRuntime`.

Initial runtime responsibilities:

- own `EffectComposer`, `RenderPass`, final output handling, render targets, resize, enable/disable, and disposal;
- let `ThreeRuntime.render()` render through composer only when a postprocess effect is enabled;
- keep direct renderer render path available when disabled;
- keep composer/pass classes out of data, schemas, director, events, engine, world, editor UI, and runtime public contracts.

First effect id:

- `cinematic.vignette`

Public parameters:

- `intensity`: number, default `0`
- `softness`: number, default `0.55`

The internal pass uniforms may use raw names, but data/timeline/action/editor contracts must use only `cinematic.vignette`, `intensity`, and `softness`.

Color handling:

- `ThreeEnvironmentStyle.colorGrade` remains a lightweight environment style using exposure/CSS filter.
- Real postprocessing is the composer pipeline.
- Phase 20 must document and test that final color-space/tone-mapping output happens once. If `OutputPass` owns final output, shader materials/pass shaders must not duplicate final output conversion in the composer path.
- A disabled composer path must preserve existing editor visual behavior.

### Public Postprocess Parameter Path

Add the public postprocess parameter path only after material parameter handling and postprocess runtime are stable.

Preferred shape:

- renderer-neutral postprocess effect metadata under `src/runtime/materials/**` or a small adjacent runtime contract;
- `RuntimePostProcessParameterUpdate` in `RuntimeTypes`;
- `WebRuntime.setPostProcessParameter` and optional `setPostProcessEffectEnabled`;
- schema/reference validation if `postprocess.parameter` timeline data is added.

If adding a timeline track in Phase 20, it must mirror `material.parameter`:

- public `effectId`;
- public `parameter`;
- typed public values;
- validation for unknown effect ids, unknown parameters, wrong value types, and raw-uniform-like names.

No full postprocess editor is planned for Phase 20.

## Smoke Strategy

Browser evidence should cover:

- debug shader still compiles;
- `story.gate-dissolve` still compiles and changes pixels through public parameters;
- `story.hologram-scanline` compiles;
- shader global elapsed time changes visible output or a deterministic browser-exposed state;
- repeated material apply/dispose does not show sustained resource growth;
- `cinematic.vignette` can be enabled and disabled without blank rendering;
- disabled postprocess returns to the direct render path.

This remains a small smoke/fixture strategy. Broad visual regression, HMR strategy, structured shader error telemetry, precompile policy, and mobile shader baseline are Phase 21.

## Explicit Non-Scope

Phase 20 does not implement:

- Phase 21 visual regression/HMR/mobile shader quality gates;
- Phase 21.5 external infrastructure contracts;
- Phase 22 LOD, instancing, vegetation, mature dependency POCs, or adapter policy;
- input, physics, Runtime UI, audio, narrative, multiplayer, delivery gameplay, spherical world, or package identity migration;
- shader graph, custom shader DSL, TSL, WGSL, `RawShaderMaterial` as default, or arbitrary `onBeforeCompile` patching;
- raw uniforms in data, timeline, action, editor UI, director, engine, world, schemas, or authoring docs.

## Round 20.1 Decision

Proceed to Round 20.2 with a renderer-neutral `ShaderGlobals` contract and tests. Do not change runtime behavior until the contract and raw-uniform boundary tests are in place.
