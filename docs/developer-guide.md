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
- `data/timelines/*.json`: director tracks for action, animation, camera, property, subtitle, sound, and wait behavior.
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

Low-end mode is deterministic: open `http://127.0.0.1:5174/?styleQuality=low-end` or pass `low-end` to `loadProjectIntoRuntime` in tests. Low-end mode keeps palette readability, uses a lighter palette material, and disables outline/highlight helper boxes.

When adding a new render style profile:

1. Extend `src/schemas/renderStyle.schema.ts` and add schema tests.
2. Extend renderer-neutral runtime types in `src/runtime/RuntimeTypes.ts` only if the contract changes.
3. Add validation for any new referenced data in `src/data/ReferenceResolver.ts` or adjacent validators.
4. Implement the Three-specific behavior under `src/runtime/three/**`.
5. Add runtime tests and a browser smoke assertion if the visible output should change.
6. Run `npm run validate-data`, `npm run test`, `npm run check-boundaries`, and `npm run test:smoke`.

## Shader Material Authoring

Phase 18 adds the Shader GLSL Material Runtime Foundation for Shader MVP S0. It is separate from `Renderable.renderStyle`: use `renderStyle` for the high-level built-in style path, and use `Renderable.materials` only when an entity explicitly needs a shader/runtime material slot.

Current S0 material files:

- `src/runtime/materials/**`: renderer-neutral material contracts, definitions, public parameter validation, and the default registry.
- `src/runtime/materials/BuiltInMaterials.ts`: registers the S0 debug material id `debug.uv-gradient`.
- `src/shaders/materials/debug/*.glsl`: GLSL source imported with `.glsl?raw`.
- `src/runtime/three/materials/**`: Three-only `ShaderMaterial` factory, runtime binding, fallback material, and public-parameter-to-uniform mapping.
- `tests/smoke/shader-material.spec.ts`: Chromium smoke test that compiles the debug shader through the real Three renderer path.

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

Rules:

- S0 supports the `main` material slot only. Multi-material GLB slot authoring is deferred.
- Public parameter names are data/editor names such as `baseColor`, `accentColor`, `strength`, and `uvScale`.
- Do not put raw uniform names such as `uBaseColor` in JSON, timelines, events, or editor-facing contracts.
- Do not put GLSL source in JSON, React components, or TypeScript template strings. Shader source belongs in `.glsl` files imported with `?raw`.
- Add renderer-neutral definitions before adding a Three material factory. The Three backend is the only layer that maps public parameter names to uniforms.
- Invalid material ids, unsupported slots, unknown parameters, wrong value types, and invalid texture asset references should fail through schema/reference validation before runtime.
- Runtime material creation failures must return a visible fallback material and structured errors; failures should not be silently swallowed.

When adding the next shader material:

1. Add or update a renderer-neutral `MaterialDefinition` under `src/runtime/materials/**`.
2. Add GLSL files under `src/shaders/**` and import them with `.glsl?raw`.
3. Add a Three-only factory path under `src/runtime/three/materials/**`.
4. Add schema/reference validation tests for public parameters and texture asset ids.
5. Add or extend a Chromium smoke test when shader compilation behavior changes.
6. Run `npm run validate-data`, `npm run test -- src/runtime/materials src/runtime/three src/data src/schemas`, `npm run build`, `npm run check-boundaries`, and `npm run test:smoke`.

Phase 18 S0 does not include the production dissolve material, material timeline tracks, material actions, shader globals such as `uTime`, postprocessing, or a Material Inspector UI. Those are Phase 19+ work.

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
