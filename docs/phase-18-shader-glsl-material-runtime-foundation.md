# Phase 18 Shader GLSL Material Runtime Foundation

Status: PASS. Final report: `docs/phase-18-shader-glsl-material-runtime-foundation-final-report.md`.

Phase 18 implements Shader MVP S0 only. The goal is to add a minimal, renderer-neutral material runtime foundation that can import GLSL source, register a small debug shader material, apply it through the Three runtime adapter, compile it in Chromium, and fail with visible diagnostics.

This phase does not build the first production dissolve effect. It prepares the contract that later shader effects must use.

## Baseline

- Phase 17 is PASS and added the asset budget, texture metadata, compression-loader strategy, and validation/reporting prerequisites.
- `data/assets.manifest.json` currently contains four generated model assets and one generated audio asset. It has texture metadata schema support, but no texture asset is currently required by demo data.
- `Renderable` accepts `model`, optional `renderStyle`, and optional `materials`. `renderStyle` is the existing high-level built-in style path and remains intact.
- `src/runtime/three/ThreeMaterialRegistry.ts` is a Phase 17 stylized render-style helper. It is not `MaterialRuntime` and should not become the public shader/material runtime contract.
- `src/runtime/WebRuntime.ts` preserves render-style and environment style hooks and now exposes optional renderable material slot assignment.
- `src/data/ReferenceResolver.ts` validates model asset references, `renderStyle` palette/tone references, material ids, supported slots, public material parameters, and material texture references.
- `src/vite-env.d.ts` declares `.glsl?raw` shader imports, and `tsconfig.node.json` includes that declaration so smoke fixtures can typecheck when they import runtime shader code.
- `package.json` currently keeps `three` as `^0.181.2`; `package-lock.json` pins the installed runtime to `0.181.2`.

## Source Documents

The two Web3D Shader GLSL MVP planning docs are now Phase 18 handoff inputs and must be tracked with this phase:

- `docs/Web3D_Shader_GLSL_MVP_支持度评估与实施计划.md`
- `docs/Web3D_Shader_研发方案与架构指南_GLSL_MVP.md`

These docs are roadmap sources, not runtime output. Their core accepted direction for S0 is standard GLSL plus Vite `?raw`, `THREE.ShaderMaterial`, renderer-neutral public material contracts, visible fallback/diagnostics, and real-browser compile tests.

## Architecture Boundaries

- JSON remains the source of truth. Level and prefab data may reference material ids, slots, public parameter names, and texture asset ids; they must never contain GLSL source, raw uniform names, JavaScript snippets, or shader code strings.
- Renderer-neutral contracts live under `src/runtime/materials/**`.
- Three-only implementation lives under `src/runtime/three/materials/**`.
- GLSL source files live under `src/shaders/**` and are imported with `?raw`.
- `src/game/**`, `src/events/**`, `src/director/**`, `src/world/**`, `src/schemas/**`, `src/data/**`, and `src/migrations/**` remain free of `three` imports.
- Editor UI may present material definitions later, but Phase 18 does not add a material editor.
- React must not update raw uniforms or own per-frame material animation state.

## Contract Shape

Round 18.2 should add renderer-neutral types equivalent to:

- `MaterialParameterType`: `number`, `boolean`, `color`, `vec2`, `vec3`, and `texture`.
- `MaterialParameterValue`: primitive public values, color strings, vector tuples, texture asset ids, or `null`.
- `MaterialParameterDefinition`: type, default value, optional numeric bounds, optional step, and exposure metadata.
- `MaterialDefinition`: stable id, version, display name, parameter definitions, optional fallback policy, and renderer-neutral metadata.
- `MaterialRegistry`: register, resolve, list, and validate definitions without importing Three.
- `MaterialRuntime`: apply a material to an entity slot, set/get/reset public parameters, dispose entity material state, and expose structured failure state.

Public material parameter names must be stable data/editor names such as `baseColor` or `amount`. Three implementations may map them to GLSL uniforms such as `uBaseColor`, but raw uniform names are private to `src/runtime/three/materials/**`.

## Renderable Material Slots

The existing `Renderable.renderStyle` field remains the built-in style layer.

Phase 18 adds a separate optional `Renderable.materials` object for shader/runtime materials. Its shape is slot based:

```json
{
  "Renderable": {
    "model": "model.switch_wall",
    "renderStyle": {
      "profile": "palette-toon"
    },
    "materials": {
      "main": {
        "materialId": "debug.uv-gradient",
        "parameters": {
          "baseColor": "#87c5ff",
          "accentColor": "#ffcf70",
          "strength": 0.8,
          "uvScale": [1, 1]
        }
      }
    }
  }
}
```

S0 only needs a stable `main` slot for simple meshes. Multi-material GLB slot discovery and authoring UI are out of scope.

## Test Shader Plan

The S0 shader should be deliberately small and boring:

- `src/shaders/materials/debug/debug-uv-gradient.vert.glsl`
- `src/shaders/materials/debug/debug-uv-gradient.frag.glsl`
- `src/shaders/materials/debug/debugUvGradientShaders.ts`
- `src/runtime/three/materials/createDebugUvGradientMaterial.ts`

The shader should not require external textures. A color/UV gradient material is enough to prove raw GLSL import, `THREE.ShaderMaterial` creation, parameter mapping, fallback behavior, and Chromium compilation.

The shader should use the Three-compatible GLSL style documented in the planning guide: no custom shader language, no GLSL3-only syntax by default, no `RawShaderMaterial`, no `onBeforeCompile`, and include correct output color/tone mapping chunks when needed.

## Fallback And Diagnostics

Phase 18 must provide a conspicuous fallback material in the Three backend, for example a magenta `MeshBasicMaterial` named `material:fallback-error`.

Failures must not be silently swallowed. Structured material runtime errors should include as much of the following as is available:

- `materialId`
- entity id and slot
- parameter name, when relevant
- shader source module or factory name
- stage, when known
- Three version or renderer backend, when known
- original error message

Recovering to a fallback is allowed only after the error is recorded and visible to tests/editor diagnostics.

## Reference Validation

Round 18.5 should extend reference validation so invalid material usage fails before runtime:

- missing material id
- duplicate or invalid material definition id
- unknown slot, for the supported S0 slot set
- unknown parameter name
- invalid parameter value type
- numeric values outside bounds
- texture parameter referencing a missing asset
- texture parameter referencing a non-texture asset
- texture color-space misuse, especially data/noise/mask textures marked as `srgb`

This validation belongs in the data/reference layer and should remain renderer neutral.

## Compile Test Strategy

The acceptance test must use a real browser path:

- Build a minimal Three scene in Playwright/Chromium.
- Instantiate geometry and the S0 debug shader material.
- Set `renderer.debug.checkShaderErrors = true` when available.
- Call `renderer.compileAsync(scene, camera)` when available.
- Capture console errors and shader/link errors.
- Fail the test if the shader cannot compile.

If `compileAsync` is unavailable in a browser/runtime variant, the fallback path must be explicit in the test and still render/compile enough to surface WebGL shader errors. Regex-only GLSL tests do not count.

Current compile smoke coverage lives in `tests/smoke/shader-material.spec.ts` and uses `tests/smoke/shaderCompileFixture.ts` to instantiate a minimal Three scene in Chromium, enable `renderer.debug.checkShaderErrors`, call `renderer.compileAsync(scene, camera)` when available, render once, and assert the program list is non-empty.

## S0 Implementation Snapshot

Rounds 18.2 through 18.10 currently provide:

- renderer-neutral contracts under `src/runtime/materials/**`
- the built-in debug material definition `debug.uv-gradient`
- optional `Renderable.materials` schema support with `main` slot validation
- material reference validation in the data layer without importing Three
- `.glsl?raw` shader imports and the first debug GLSL pair under `src/shaders/materials/debug/**`
- Three-only material factory/runtime/fallback implementation under `src/runtime/three/materials/**`
- optional renderable material wiring through `WebRuntime`, `Viewport`, and `ThreeRuntime`
- Chromium shader compile smoke coverage through `npm run test:smoke`

The runtime still applies custom materials only when data explicitly requests `Renderable.materials`; existing Gate Demo data continues to use Phase 16 `renderStyle` by default.

## Phase 19 Handoff

Phase 19 should build on this S0 path by adding the first production story material, likely a dissolve/open-gate shader. It should reuse the public material parameter model, add any required texture assets with Phase 17 metadata, then introduce material timeline tracks/actions through schemas, registries, validators, runtime adapters, editor forms, and smoke tests.

Phase 19 should not bypass the S0 runtime with ad hoc `ShaderMaterial` construction, raw uniform names in data, or GLSL embedded in JSON/React/TypeScript strings.

## Three Version Policy

No dependency pin change is made in Round 18.1.

Decision: keep `three` as `^0.181.2` for now because `package-lock.json` pins the actual tested install to `0.181.2`, and Phase 18 will add real browser compile coverage before any production shader depends on version-sensitive behavior.

If the compile test or ShaderMaterial behavior proves brittle, switch to an exact `three` dependency in a dedicated implementation commit with validation notes. Do not combine that policy change with unrelated shader code.

## Non-Scope

Phase 18 must not implement:

- dissolve or any production story material
- `material.parameter` timeline tracks
- `material.setParameter` actions
- shader globals such as `uTime`
- postprocessing
- material editor UI
- custom Shader DSL, Shader Graph, TSL, WGSL, transpilers, or `RawShaderMaterial` default paths
- LOD, instancing, spherical world, gameplay, multiplayer, or Abeto Messenger gameplay work

## Round 18.1 Debug Self-Check

- Smallest fixture: a single mesh using a debug shader with no texture dependency.
- Failure layers are separable: schema/reference validation, registry resolution, raw import, Three factory, runtime binding, browser compilation, and fallback.
- Success and failure states are identified before implementation.
- Browser compile coverage is planned before production shader work.

## Round 18.1 Architecture Self-Check

- `renderStyle` remains separate from `MaterialRuntime`.
- Shader source stays in repo files, not JSON.
- Three implementation stays under `src/runtime/three/**`.
- Renderer-neutral validation and contracts stay free of Three imports.
- Timeline/action/material editor features are deferred to later phases.
- Unrelated untracked workspace files are ignored.
