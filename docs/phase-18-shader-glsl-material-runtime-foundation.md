# Phase 18 Shader GLSL Material Runtime Foundation

Status: Round 18.1 design locked.

Phase 18 implements Shader MVP S0 only. The goal is to add a minimal, renderer-neutral material runtime foundation that can import GLSL source, register a small debug shader material, apply it through the Three runtime adapter, compile it in Chromium, and fail with visible diagnostics.

This phase does not build the first production dissolve effect. It prepares the contract that later shader effects must use.

## Baseline

- Phase 17 is PASS and added the asset budget, texture metadata, compression-loader strategy, and validation/reporting prerequisites.
- `data/assets.manifest.json` currently contains four generated model assets and one generated audio asset. It has texture metadata schema support, but no texture asset is currently required by demo data.
- `Renderable` currently accepts `model` plus optional `renderStyle`. `renderStyle` is the existing high-level built-in style path and remains intact.
- `src/runtime/three/ThreeMaterialRegistry.ts` is a Phase 17 stylized render-style helper. It is not `MaterialRuntime` and should not become the public shader/material runtime contract.
- `src/runtime/WebRuntime.ts` exposes render-style and environment style hooks, but no material-slot or material-parameter API yet.
- `src/data/ReferenceResolver.ts` validates model asset references and `renderStyle` palette/tone references. It does not yet validate material ids, slots, material parameters, or material texture references.
- `vite.config.ts` and `tsconfig.app.json` do not yet declare `.glsl?raw` shader imports beyond the built-in Vite `?raw` asset behavior.
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

Phase 18 should add a separate optional `Renderable.materials` object for shader/runtime materials. Its shape should be slot based:

```json
{
  "Renderable": {
    "model": "model.switch_wall",
    "renderStyle": {
      "profile": "palette-toon"
    },
    "materials": {
      "main": {
        "materialId": "debug.uv-color",
        "parameters": {
          "baseColor": "#87c5ff"
        }
      }
    }
  }
}
```

S0 only needs a stable `main` slot for simple meshes. Multi-material GLB slot discovery and authoring UI are out of scope.

## Test Shader Plan

The S0 shader should be deliberately small and boring:

- `src/shaders/debug/debug-material.vert.glsl`
- `src/shaders/debug/debug-material.frag.glsl`
- `src/runtime/three/materials/createDebugShaderMaterial.ts`

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
