# Developer Guide

This guide is the practical release-candidate handoff for running, validating, and extending Sinan Scene Director.

## Setup

Use a clean checkout with Node.js and npm available.

```powershell
npm ci
npm run dev -- --port 5174 --strictPort
```

Open `http://127.0.0.1:5174/`. The editor should show the asset-backed `level_01` demo with hierarchy, assets, viewport, inspector/events, and timeline panels.

If generated development assets are missing, run:

```powershell
npm run generate:dev-assets
```

## Validation Commands

Preferred configured wrappers:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
```

Direct equivalents:

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
npm run test:smoke
```

`check-boundaries` rejects forbidden Three.js imports in renderer-neutral layers and dynamic-code execution patterns in project code/data. `validate-data` checks schemas, references, public asset URLs, asset budget metadata, registry coverage, custom whitelist usage, duplicate ids, timeline references, camera shot references, and animation clip metadata. `report-assets` prints the asset budget/compression report and exits nonzero for critical asset issues such as missing files, missing metadata, or over-budget files.

## Repository Shape

- `data/assets.manifest.json`: asset ids, types, URLs, and optional metadata.
- `data/prefabs/*.json`: reusable component bundles.
- `data/levels/*.json`: level entities, prefab references, timelines, camera shots, and events.
- `data/events/*.json`: trigger, condition, and action definitions.
- `data/timelines/*.json`: director tracks for action, animation, camera, material parameter, property, subtitle, sound, and wait behavior.
- `data/cameraShots/*.json`: static, keyframed, follow, and look-at camera shots.
- `public/models/**` and `public/audio/**`: Vite public-root assets referenced by manifest URLs.
- `src/schemas/**`: Zod schemas for all project JSON.
- `src/events/**`: action, condition, and trigger registries.
- `src/director/**`: timeline and camera shot sampling.
- `src/runtime/three/**`: the only place that owns Three.js implementation details.
- `src/editor/**`: React editor shell, panels, commands, dirty state, and save UX.

## Asset Authoring

Model assets are declared in `data/assets.manifest.json` with `type: "model"` and root-relative public URLs:

```json
{
  "model.door_wood": {
    "type": "model",
    "url": "/models/props/door_wood.glb",
    "metadata": {
      "category": "prop",
      "materialProfile": "palette-toon",
      "maxTriangles": 64,
      "textureBudgetKb": 0,
      "sizeBudgetBytes": 4096,
      "compressed": false,
      "compression": {
        "codec": "none",
        "status": "source"
      },
      "clips": ["Open"]
    }
  }
}
```

Rules:

- Store model files under `public/models/**`; use `.glb` or `.gltf`.
- Store audio files under `public/audio/**`; use `.mp3`, `.ogg`, or `.wav`.
- Use root-relative URLs such as `/models/props/door_wood.glb`; do not use `..`, backslashes, or protocol-relative URLs.
- Use stable asset ids such as `model.door_wood` or `audio.switch_click`.
- Declare `metadata.sizeBudgetBytes` for every asset. Model assets also declare `materialProfile`, `maxTriangles`, `textureBudgetKb`, `compressed`, and `compression`.
- Texture/image assets declare `metadata.textureUsage` and `metadata.colorSpace`; color/emissive textures use `srgb`, while data-like textures use `linear` or `none`.
- Put known animation clip names in `metadata.clips`. `validate-data` rejects timeline/action clip references only when metadata declares a clip list and the referenced clip is absent.
- Generated blockout assets come from `npm run generate:dev-assets`; replace them with real art by keeping ids and URLs stable or updating all references together.

Asset reporting:

```powershell
npm run report-assets
npm run report-assets -- --json
```

The human report lists byte sizes, byte budgets, compression status, material profile, texture usage/colorSpace, clips, and per-asset status. The JSON report exposes the same summary, rows, and issues for future CI or release notes.

GLB export guidance:

- Export binary glTF 2.0 (`.glb`) where practical.
- Keep object scale consistent with the existing room demo; the runtime assumes ordinary meter-like editor units.
- Name animation clips deliberately, for example `Open`, and reference those exact names from actions or timeline tracks.
- Keep the useful mesh origin and transform clean before export. Entity placement should still live in `data/levels/*.json`, not be baked into every scene file.
- If an asset is missing or invalid, `ThreeRuntime` falls back to deterministic placeholder geometry and logs a warning.

Suggested authoring flow:

1. Create or update the asset in Blender or another DCC tool.
2. Apply transforms, keep the mesh origin meaningful, and name exported nodes/clips deliberately.
3. Export `.glb` to a stable path under `public/models/**`, or export audio to `public/audio/**`.
4. Update `data/assets.manifest.json` while keeping existing asset ids stable when replacing art.
5. Fill in metadata:
   - `category`: broad authoring bucket such as `environment`, `prop`, `marker`, `audio`, or `texture`.
   - `materialProfile`: current render style profile for model assets, usually `standard` or `palette-toon`.
   - `maxTriangles`: declared triangle budget for the model source.
   - `textureBudgetKb`: declared texture budget for textures used by the model; use `0` for generated untextured placeholder GLBs.
   - `sizeBudgetBytes`: byte budget for the resolved file under `public/`.
   - `textureUsage` and `colorSpace`: required for texture/image assets; use `srgb` for color/emissive textures and `linear` or `none` for normal, mask, noise, occlusion, or data textures.
   - `compression`: model compression readiness. Current dev assets use `{"codec": "none", "status": "source"}`. Use `ready` only for optional readiness and `required` only when the runtime has decoder support.
   - `textureCompression`: KTX2/Basis readiness for texture/image assets, separate from `textureUsage` and `colorSpace`.
   - `clips`: known animation clips.
   - `source` and `notes`: authoring provenance and short review notes.
6. Run `npm run report-assets`, `npm run validate-data`, and `npm run test` before committing.

Optional optimization recommendations:

- The project does not require glTF Transform as a local dependency. If you already have `gltf-transform` available, use it to inspect and optimize assets before updating budgets.
- Example inspection command:

```powershell
gltf-transform inspect public/models/props/door_wood.glb
```

- Example optimization shape, adjusted per asset:

```powershell
gltf-transform optimize public/models/props/door_wood.glb public/models/props/door_wood.glb --compress draco
```

- Do not mark `compression.status` as `required` until the repository has the matching decoder strategy configured and validation/reporting passes.
- Phase 17 does not add ShaderMaterial, material timeline tracks, LOD switching, instancing, spherical-world placement, gameplay, or multiplayer behavior.

Common asset validation failures:

- Missing file: the manifest URL does not resolve under `public/`.
- Missing metadata: required budget metadata is absent.
- Over budget: actual file bytes exceed `metadata.sizeBudgetBytes`.
- Unsupported material profile: `metadata.materialProfile` is not a known render style profile.
- Missing decoder: compression is marked `required` for a codec without configured runtime support.
- Invalid texture metadata: color/emissive textures are not `srgb`, or data-like textures are marked `srgb`.

## Render Style Authoring

Phase 16 adds data-driven render styles for the Gate Demo. Style data stays in schemas and JSON; Three.js material work stays in `src/runtime/three/**`.

Palette files live in `data/palettes/*.json`:

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

Attach a style through a `Renderable.renderStyle` object on a prefab or entity:

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

Rules:

- Use `profile: "standard"` to preserve the asset or placeholder material.
- Use `profile: "palette-toon"` with a valid `palette` id and `tone`.
- `outline` and `highlight` accept `none`, `selected`, `interactable`, or `always`.
- Missing palette files or tone keys fail `npm run validate-data` with actionable paths.
- Runtime missing style resources falls back to `standard` and warns instead of crashing.

Level atmosphere is configured separately in `data/levels/*.json` under `environment`:

```json
{
  "background": "#111111",
  "ambientLight": 0.35,
  "fog": {
    "enabled": true,
    "color": "#162024",
    "near": 8,
    "far": 18
  },
  "colorGrade": {
    "enabled": true,
    "exposure": 1.05,
    "saturation": 1.08
  }
}
```

Low-end mode is deterministic: open `http://127.0.0.1:5174/?styleQuality=low-end` or pass `styleQualityProfile: 'low-end'` to `EngineSession.loadProject` in tests. Low-end mode keeps palette readability, uses a lighter palette material, and disables outline/highlight helper boxes.

When adding a new render style profile:

1. Extend `src/schemas/renderStyle.schema.ts` and add schema tests.
2. Extend renderer-neutral runtime types in `src/runtime/RuntimeTypes.ts` only if the contract changes.
3. Add validation for any new referenced data in `src/data/ReferenceResolver.ts` or adjacent validators.
4. Implement the Three-specific behavior under `src/runtime/three/**`.
5. Add runtime tests and a browser smoke assertion if the visible output should change.
6. Run `npm run validate-data`, `npm run test`, `npm run check-boundaries`, and `npm run test:smoke`.

## Shader Material Authoring

Phase 18 adds the Shader GLSL Material Runtime Foundation for Shader MVP S0, and Phase 19 adds the first production story material plus timeline/action authoring. Shader materials are separate from `Renderable.renderStyle`: use `renderStyle` for the high-level built-in style path, and use `Renderable.materials` only when an entity explicitly needs a shader/runtime material slot.

Current material files:

- `src/runtime/materials/**`: renderer-neutral material contracts, definitions, public parameter validation, and the default registry.
- `src/runtime/materials/BuiltInMaterials.ts`: registers the debug material id `debug.uv-gradient` and the production story material id `story.gate-dissolve`.
- `src/shaders/materials/debug/*.glsl` and `src/shaders/materials/story/*.glsl`: GLSL source imported with `.glsl?raw`.
- `src/runtime/three/materials/**`: Three-only `ShaderMaterial` factory, runtime binding, fallback material, and public-parameter-to-uniform mapping.
- `tests/smoke/shader-material.spec.ts`: Chromium smoke tests that compile shader materials through the real Three renderer path and compare visible output for changed public parameters.

Attach a shader material through the optional `Renderable.materials` slot map:

```json
{
  "Renderable": {
    "model": "model.switch_wall",
    "renderStyle": {
      "profile": "palette-toon",
      "palette": "world_01",
      "tone": "accent"
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

The production gate dissolve material uses:

```json
{
  "materials": {
    "main": {
      "materialId": "story.gate-dissolve",
      "parameters": {
        "progress": 0,
        "edgeWidth": 0.08,
        "edgeColor": "#ffcf70",
        "baseColor": "#9b6a3c",
        "noiseScale": 8
      }
    }
  }
}
```

Rules:

- S0 supports the `main` material slot only. Multi-material GLB slot authoring is deferred.
- Public parameter names are data/editor names such as `progress`, `edgeWidth`, `edgeColor`, `baseColor`, `noiseScale`, `accentColor`, `strength`, and `uvScale`.
- Do not put raw uniform names such as `uBaseColor` in JSON, timelines, events, or editor-facing contracts.
- Do not put GLSL source in JSON, React components, or TypeScript template strings. Shader source belongs in `.glsl` files imported with `?raw`.
- Add renderer-neutral definitions before adding a Three material factory. The Three backend is the only layer that maps public parameter names to uniforms.
- Invalid material ids, unsupported slots, unknown parameters, wrong value types, and invalid texture asset references should fail through schema/reference validation before runtime.
- Runtime material creation failures must return a visible fallback material and structured errors; failures should not be silently swallowed.
- Edit selected entity shader parameters in the Inspector's Materials section. The panel shows material id, display name, current/default values, override state, and registry validation without exposing GLSL or uniform names.

Material timeline tracks use public parameter names:

```json
{
  "id": "track_gate_dissolve_progress",
  "type": "material.parameter",
  "target": "gate_a",
  "slot": "main",
  "parameter": "progress",
  "keys": [
    { "time": 0.4, "value": 0, "ease": "linear" },
    { "time": 2, "value": 1, "ease": "easeOutCubic" }
  ]
}
```

Material actions use the same public contract:

```json
{
  "type": "material.setParameter",
  "entityId": "gate_a",
  "slot": "main",
  "parameter": "progress",
  "value": 0
}
```

When adding the next shader material:

1. Add or update a renderer-neutral `MaterialDefinition` under `src/runtime/materials/**`.
2. Add GLSL files under `src/shaders/**` and import them with `.glsl?raw`.
3. Add a Three-only factory path under `src/runtime/three/materials/**`.
4. Add schema/reference validation tests for public parameters and texture asset ids.
5. Add or extend Chromium compile smoke coverage when shader compilation behavior changes.
6. Add deterministic visual regression fixtures for demo-critical output.
7. Add fallback and structured diagnostics evidence for invalid ids, invalid public parameters, unsupported paths, or runtime failures where practical.
8. Add the material or postprocess path to the precompile inventory when it is a known production target.
9. Consider the low-end Chromium baseline budget and update the documented budget only with smoke evidence.
10. Run `npm run validate-data`, `npm run test -- src/runtime/materials src/runtime/three src/data src/schemas`, `npm run build`, `npm run check-boundaries`, and `npm run test:smoke`.

Phase 19 still does not include shader globals such as `uTime`, postprocessing, shader graph authoring, multi-slot material assignment, or a second production material. Those remain future-phase work.

Phase 20 introduces `ShaderGlobals` as a renderer-neutral runtime input contract under `src/runtime/materials/**`. Public global names are semantic values such as `elapsedSeconds`, `deltaSeconds`, `viewportSize`, and optional `cameraPosition`; data JSON, timelines, actions, and editor authoring must not expose raw shader uniform names such as `uTime` or `uResolution`.

Phase 20 material lifetime policy: Three shader materials are currently owned per entity and material slot because public parameters and shader globals mutate uniforms at runtime. Equal-parameter static material sharing is deferred until a future pooling policy can prove immutability; high-cardinality visual variation should use instancing or attributes in a later phase. `ThreeMaterialRuntime` restores original mesh materials on rebind/dispose and disposes only the shader/fallback materials it created, leaving original shared textures under their existing owner.

Phase 20 postprocess contract: public postprocess effects live under `src/runtime/postprocess/**`. The first effect id is `cinematic.vignette` with public parameters `enabled`, `intensity`, and `softness`. Runtime/editor/data contracts must use these public names only; Three composer passes, `ShaderPass`, `OutputPass`, and raw vignette uniforms stay inside `src/runtime/three/**`.

### Shader HMR And Failure Triage

During local GLSL or Three material factory iteration, treat every shader replacement as a risky runtime swap. The editor must keep either the previous valid material or the explicit fallback material visible; a failed shader edit should not silently blank the viewport.

Development-time replacement policy:

1. Keep the source of truth in `.glsl` files plus `MaterialDefinition` public parameters.
2. Create a new `ShaderMaterial` instance before replacing the current scene material.
3. Copy current public parameter values and the latest `ShaderGlobals` into the new instance.
4. Compile or render through the smallest deterministic fixture before considering the replacement valid.
5. Replace the scene material only after creation and compile succeed where practical.
6. Dispose the previous owned material after the replacement is known-good.
7. If creation, parameter validation, or compile fails, keep the previous valid material when available; otherwise use `material:fallback-error`.
8. Surface a structured diagnostic with material id, stage, source path, runtime context, browser/GPU context when available, entity id, slot, and compile log where available.

Triage order:

- If `renderer.compileAsync(scene, camera)` or smoke fails, inspect the structured diagnostic first.
- If the diagnostic names a public parameter, fix `MaterialDefinition`, editor data, timeline/action data, or the Three public-parameter mapping before touching GLSL.
- If the diagnostic names a GLSL source path and stage, isolate the failing vertex or fragment shader in the browser compile fixture.
- If only visual baselines fail, compare the fixture id, sampled pixel, expected value, observed value, and tolerance before changing art values.
- If fallback is visible in the editor, treat it as an error state, not as a passing visual result.

Do not:

- edit raw uniforms from React, JSON, timelines, actions, or editor UI;
- hide shader compile failures behind a successful fallback in CI;
- introduce a broad Vite HMR runtime graph before the existing factory/runtime/visual fixtures show that a narrow helper is insufficient;
- commit Playwright traces, generated screenshots, or local hardware captures as HMR evidence.

### Shader Precompile Guidance

Known production shader and postprocess targets are listed by `src/runtime/three/ShaderPrecompilePlan.ts`. The current list covers:

- `story.gate-dissolve`
- `story.hologram-scanline`
- `cinematic.vignette`

Precompile policy:

1. Build the smallest scene that instantiates the known production material or postprocess pass through the existing Three runtime/factory path.
2. Use `renderer.compileAsync(scene, camera)` when available.
3. Fall back to `renderer.compile(scene, camera)` when async compile is unavailable.
4. Render once after compile so browser shader errors and output-path failures are observable.
5. Record structured diagnostics with material/effect id, source path, stage, runtime context, browser/GPU context where available, entity id, slot, and fixture name.
6. Keep production precompile fixtures inside `tests/smoke/**` or Three runtime tests; do not expose Three renderer, `ShaderMaterial`, `EffectComposer`, or pass classes through `WebRuntime`, data, timeline, action, or editor contracts.

Current Chromium smoke coverage already precompiles or renders the production material/postprocess paths:

- `production gate dissolve ShaderMaterial compiles and changes pixels`
- `production hologram scanline ShaderMaterial compiles in Chromium`
- `postprocess vignette pass changes edge pixels in Chromium`
- `postprocess vignette matches deterministic visual baselines`

If a browser does not support `compileAsync`, the fixture must still run synchronously with `renderer.compile` and keep the same diagnostics and fallback behavior. A fallback render is not a passing production shader compile result; CI should fail when a known production shader cannot compile.

### Mobile / Low-End Shader Baseline

The current local low-end shader gate is a Playwright Chromium fixture, not a real mobile hardware certification. It exists to catch obvious shader/postprocess regressions before LOD, instancing, compact world, and gameplay phases depend on the visual stack.

Current local baseline:

- viewport: `360x640`
- pixel ratio: `1`
- browser: Chromium through Playwright
- materials: `story.gate-dissolve` and `story.hologram-scanline`
- postprocess: `cinematic.vignette`
- metrics: fixture duration, `renderer.info.programs`, `renderer.info.memory.geometries`, `renderer.info.memory.textures`, visible pixels, and vignette edge darkening

Accepted local budgets:

- duration: `<= 2500 ms`
- shader programs: `<= 8`
- geometries: `<= 6`
- textures: `<= 6`

These budgets are intentionally broad for local stability. They are not a frame-rate promise and should be tightened only after dedicated mobile hardware or a more complete performance harness exists. If a real device test is unavailable, reports must say so explicitly and cite this local Chromium baseline instead.

### Shader Production Quality Checklist

Every production shader material or postprocess pass added after Phase 21 must ship with the same quality-gate shape, scaled to the risk of the effect:

- Renderer-neutral public contract in `src/runtime/materials/**` or `src/runtime/postprocess/**`.
- GLSL source under `src/shaders/**` for material shaders; no GLSL in JSON, React, or TypeScript strings.
- Three-only mapping, pass setup, renderer counters, and fallback behavior under `src/runtime/three/**`.
- Schema/reference validation for public material ids, effect ids, slots, parameters, and texture asset ids.
- Browser compile smoke in `tests/smoke/shader-material.spec.ts` or an equivalent Playwright fixture.
- Deterministic visual regression coverage for demo-critical output using fixed viewport, camera, globals, parameters, samples, and tolerance.
- Structured diagnostics that identify material/effect id, source path or runtime owner, shader stage when applicable, runtime context, browser/GPU context when available, affected entity or slot when practical, and public parameter name when relevant.
- Explicit fallback behavior that keeps the editor visible while still failing CI for production compile or validation failures.
- Precompile inventory and guidance updates for known production targets.
- Low-end Chromium baseline consideration, including renderer memory counters, program count, visible pixels, postprocess output where applicable, and documented limitations when no real mobile hardware is available.

Do not approve a new production shader or postprocess path if it only renders visually once in the editor. It must be covered by compile, visual, diagnostics/fallback, precompile, and low-end evidence appropriate to its scope.

## Actions

Current action types:

- `flag.set`
- `flag.toggle`
- `entity.setVisible`
- `entity.setEnabled`
- `entity.setTransform`
- `entity.animateTransform`
- `switch.setState`
- `door.open`
- `door.close`
- `timeline.play`
- `timeline.stop`
- `camera.playShot`
- `material.setParameter`
- `animation.play`
- `animation.stop`
- `sound.play`
- `subtitle.show`
- `function.call`

When adding an action:

1. Add or update the discriminated union entry in `src/schemas/action.schema.ts`.
2. Register the behavior in `src/events/actionRegistry.ts`.
3. Assign the correct side-effect class: `none`, `previewSafe`, `runtimeOnly`, or `destructive`.
4. Add tests proving schema and registry coverage stay aligned.
5. Update editor forms when the action should be authorable through `EventInspector`.
6. Run `npm run check-boundaries`, `npm run validate-data`, and `npm run test`.

`function.call` is only for explicitly whitelisted custom functions registered through `ActionRegistry.registerCustomFunction`. Do not use script strings, dynamic evaluation, or global lookup dispatch.

## Conditions

Current condition types:

- `flag.equals`
- `flag.exists`
- `inventory.hasItem`
- `quest.stateEquals`
- `entity.stateEquals`
- `distance.lessThan`
- `custom.condition`
- Recursive groups: `{ "all": [...] }`, `{ "any": [...] }`, and `{ "not": ... }`.

When adding a condition:

1. Add or update the schema in `src/schemas/condition.schema.ts`.
2. Register the evaluator in `src/events/conditionRegistry.ts`.
3. Add coverage tests in `src/events/events.test.ts`.
4. Update editor forms when the condition should be authorable.
5. Run data validation so event JSON and registry coverage stay synchronized.

`custom.condition` is only for explicitly whitelisted evaluators registered through `ConditionRegistry.registerCustomCondition`.

## Timelines

Timelines live in `data/timelines/*.json`. A timeline has `schemaVersion`, stable `id`, optional `name`, positive `duration`, optional `settings`, and a `tracks` array.

Supported track types:

- `action`: dispatches a schema-backed action at `time`.
- `animation.play`: plays a named entity animation clip.
- `camera.shot`: samples a camera shot over a duration.
- `material.parameter`: samples a public material parameter and routes it through the runtime material parameter path.
- `property`: samples keyframes such as `Door.openAmount`.
- `subtitle`: shows viewport subtitle HUD text.
- `sound`: routes an audio asset through the editor-safe audio bridge.
- `wait`: reserves duration in the timeline.

Authoring rules:

- Track ids must be stable and unique inside the timeline.
- Action tracks respect side-effect classification. Preview scrub skips unsafe runtime-only/destructive effects.
- Property keys should be time-sorted by authoring tools; runtime sampling also sorts keys defensively.
- Timeline references to assets, entities, camera shots, and action schemas are checked by `validate-data`.

## Camera Shots

Camera shots live in `data/cameraShots/*.json`.

Supported shot types:

- `static`: one fixed pose.
- `keyframed`: timed pose keys with optional easing.
- `follow`: target entity plus offset.
- `lookAt`: fixed position looking at an entity id or vector.

Rules:

- Use a stable shot id, for example `cam_gate_reveal`.
- `lookAt` can be either an entity id or a `[x, y, z]` vector.
- Keyframed shots need positive `duration` and at least one key.
- Timeline `camera.shot` tracks reference the shot by `shotId`.
- Camera sampling goes through `DirectorCameraSystem` and `WebRuntime`; director code must not import Three.js.

## Editor Authoring Workflow

Common editing paths are available in the UI:

- Select entities in Hierarchy or the viewport.
- Edit known components through Inspector forms.
- Inspect and edit selected entity public material parameters through the Inspector Materials section.
- Edit event names, conditions, and actions in Event Inspector.
- Add, reorder, apply, and remove property timeline keys.
- Add, reorder, apply, remove, preview, and save camera shot keys.
- Save level, event, timeline, and camera shot data through schema-validated save commands.

Editor mutations are command-backed so undo/redo, dirty state, save state, and tests remain reliable. Unknown component payloads are visible as read-only JSON until a schema-backed form is added.

## Architecture Boundaries

- Keep Three.js imports inside `src/runtime/three/**`.
- Keep game semantics renderer-neutral in schemas, data loading, events, director systems, and migrations.
- Keep high-frequency runtime state out of React state. React owns editor panels, HUD, selection, dirty status, and sampled UI state.
- Keep `data/**/*.json` as the source of truth.
- Do not add dynamic code execution to JSON DSL paths.
- Keep Phase 17 asset budgets, compression metadata, Draco/meshopt/KTX2 loading, LOD, and instancing out of Phase 16 render style work.
