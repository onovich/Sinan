# Phase 21 Shader Production Quality Gate

Date: 2026-06-20
Status: Design lock for Phase 21 execution.

## Baseline

Phase 20 is PASS and pushed at `24b7ba5 docs: finalize phase 20 shader globals postprocessing`.

Current shader and postprocess baseline:

- Renderer-neutral material contracts live under `src/runtime/materials/**`.
- Renderer-neutral postprocess effect contracts live under `src/runtime/postprocess/**`.
- Three shader material implementation stays under `src/runtime/three/materials/**`.
- GLSL sources live under `src/shaders/**` and are imported with Vite `?raw`.
- The active support material is `debug.uv-gradient`.
- The active production materials are `story.gate-dissolve` and `story.hologram-scanline`.
- The active production postprocess effect is `cinematic.vignette`.
- `EngineSession` and `EngineLoop` own the runtime update/render route; `Viewport.tsx` remains an editor surface.
- `ShaderGlobals` is routed from the engine/runtime path into `ThreeMaterialRuntime`, not from React state.
- `ThreePostProcessRuntime` owns `EffectComposer`, `RenderPass`, vignette `ShaderPass`, `OutputPass`, resize, render routing, and disposal.
- Existing smoke coverage compiles the debug and dissolve materials, proves shader globals affect debug material pixels, checks material lifecycle/resource counters, and proves vignette changes edge pixels.

Existing unrelated worktree items include external infrastructure, RFC, architecture, and strategy documents. They are not Phase 21 implementation scope and must not be staged with Phase 21 commits unless the user explicitly changes the task.

## Production Inventory

### Browser Compile Matrix

Phase 21 compile coverage must include:

| Kind | Id | Source path or runtime owner | Required gate |
| --- | --- | --- | --- |
| Support material | `debug.uv-gradient` | `src/shaders/materials/debug/debug-uv-gradient.*.glsl` | Keep existing Chromium compile smoke |
| Production material | `story.gate-dissolve` | `src/shaders/materials/story/gate-dissolve.*.glsl` | Chromium compile plus visual fixture |
| Production material | `story.hologram-scanline` | `src/shaders/materials/story/hologram-scanline.*.glsl` | Add Chromium compile plus visual fixture |
| Postprocess effect | `cinematic.vignette` | `src/runtime/three/ThreePostProcessRuntime.ts` | Chromium output path compile/render plus visual fixture |
| Final output path | `OutputPass` composer route | `src/runtime/three/ThreePostProcessRuntime.ts` | Covered through vignette enabled/disabled fixture |

### Visual Regression Targets

Phase 21 visual regression is shader/postprocess scoped, not broad product screenshot testing.

Required visual fixtures:

- `story.gate-dissolve` with stable camera, plane geometry, viewport, public parameters, and baseline states such as visible, edge, and dissolved.
- `story.hologram-scanline` with stable camera, plane geometry, viewport, fixed shader globals, and public parameters.
- `cinematic.vignette` with enabled and disabled states, fixed white source plane, edge and center samples, and final output alpha checks.

## Visual Baseline Strategy

Use compact JSON baselines and targeted sample regions before introducing screenshot baselines.

Initial baseline format:

- fixture id
- material id or effect id
- viewport size
- camera type and transform summary
- public parameters
- shader globals where applicable
- sampled pixel coordinates or named regions
- expected RGBA values or expected deltas
- per-channel tolerance and aggregate delta tolerance
- diagnostic labels for failure output

Storage policy:

- Store source baselines under `tests/fixtures/shader-visual-baselines/**` if the harness needs committed baseline data.
- Keep Playwright `test-results/**`, traces, screenshots, and local hardware captures generated-only.
- Do not commit ad hoc screenshots unless a later round deliberately promotes them to source baselines.

Tolerance policy:

- Prefer deterministic readback from a small offscreen canvas with `preserveDrawingBuffer: true`.
- Use stable 64x64 or 96x96 viewports unless a fixture proves a larger size is necessary.
- Keep alpha exact for opaque fixtures.
- Use small per-channel tolerance for known stable colors and aggregate-delta thresholds for shader edge/flicker behavior.
- Failure output must name fixture id, material/effect id, sample label, expected value, observed value, delta, and tolerance.

## Diagnostics And Fallback Strategy

Phase 21 diagnostics must remain runtime/test-facing and must not leak raw uniforms into data, timeline, action, editor, director, engine, world, schemas, or authoring docs.

Required diagnostic fields where practical:

- material id or effect id
- material display name or effect display name
- shader stage for shader material failures
- shader source path for GLSL-backed materials
- runtime context such as `three.material.factory`, `three.material.runtime`, `three.postprocess.runtime`, or `smoke.shader.compile`
- Three.js revision when available
- browser and GPU/WebGL renderer information when available in browser fixtures
- affected entity id and material slot when practical
- public parameter name when validation or runtime mapping fails
- compile or link log when the browser exposes it

Fallback policy:

- Runtime material creation failures keep the visible fallback material behavior from Phase 18-20.
- Production compile/smoke tests must still fail on real shader compile failures even if runtime fallback prevents a blank editor.
- Postprocess invalid effect or parameter failures should produce structured warnings or test diagnostics and fall back to the direct render path when safe.

## HMR Policy

Phase 21 documents development-time shader iteration rather than building a broad Vite HMR framework.

Policy:

- On `.glsl` or material factory edits, create a new material instance before replacing the old one.
- Copy public parameters and current shader globals into the new instance.
- Replace the scene material only after successful creation/compile where practical.
- Preserve the previous valid material or use the explicit fallback material on failure.
- Dispose replaced owned materials after the new path is known-good.
- Preserve timeline/action/editor public parameter state.
- Never allow a failed shader edit to silently blank the editor.

Round 21.8 records this policy in `docs/developer-guide.md` under "Shader HMR And Failure Triage" so future shader authors and executors can follow the same local iteration and CI triage steps.

## Precompile Strategy

Document and smoke-test the current browser precompile path where practical:

- Use `renderer.compileAsync(scene, camera)` when available.
- Fall back to `renderer.compile(scene, camera)` in environments without async compile support.
- Precompile fixture scenes should instantiate the known production materials and the postprocess route behind the Three adapter boundary.
- The public runtime contract should not expose Three renderer or material types.

## Mobile And Low-End Baseline Strategy

Phase 21 does not require real mobile hardware in this workspace. The accepted baseline is a repeatable low-end Chromium profile until device testing is available.

Initial low-end profile:

- Chromium via Playwright.
- Small deterministic viewport, preferably 360x640 or the existing narrow smoke viewport.
- Pixel ratio capped at `1`.
- Existing `low-end` style quality profile where relevant.
- Production materials and `cinematic.vignette` rendered through the same fixture path.
- Record renderer counters, program count, memory counters, draw/runtime timing summary, and fixture duration.

Budget intent:

- Demo shader/postprocess fixtures should remain small, deterministic, and suitable for local validation.
- The gate watches for obvious regressions, unbounded program/material growth, blank output, and excessive fixture runtime, not device-grade frame pacing yet.

## Explicit Non-Scope

Phase 21 does not implement:

- Phase 21.5 external infrastructure contracts, RFCs, partner POC briefs, mature dependency evaluation, or compatibility matrix work.
- Phase 22 LOD, instancing, vegetation, or performance-system runtime implementation.
- Input, physics, Runtime UI, audio, narrative importers, multiplayer, delivery gameplay, compact spherical world, or package identity migration.
- Shader graph, GLSL editor, TSL, WGSL, transpiler, default `RawShaderMaterial`, arbitrary `onBeforeCompile` patching, or shader source in JSON.
- Broad product screenshot regression unrelated to shader/material/postprocess quality.
- Raw uniforms in data, timeline, action, editor, director, engine, world, schemas, or authoring docs.

## Round 21.1 Decision

Proceed to Round 21.2 with production shader and postprocess compile matrix coverage.

Round 21.2 should:

- keep `debug.uv-gradient` compile coverage intact;
- add or verify browser compile coverage for `story.gate-dissolve`, `story.hologram-scanline`, and `cinematic.vignette` / final output;
- improve failure output so compile failures identify material or effect id and source path;
- avoid broad visual baselines until Round 21.3.
