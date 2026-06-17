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
npm run migrate-data -- --check
npm run test:smoke
```

`check-boundaries` rejects forbidden Three.js imports in renderer-neutral layers and dynamic-code execution patterns in project code/data. `validate-data` checks schemas, references, public asset URLs, registry coverage, custom whitelist usage, duplicate ids, timeline references, camera shot references, and animation clip metadata.

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
- Put known animation clip names in `metadata.clips`. `validate-data` rejects timeline/action clip references only when metadata declares a clip list and the referenced clip is absent.
- Generated blockout assets come from `npm run generate:dev-assets`; replace them with real art by keeping ids and URLs stable or updating all references together.

GLB export guidance:

- Export binary glTF 2.0 (`.glb`) where practical.
- Keep object scale consistent with the existing room demo; the runtime assumes ordinary meter-like editor units.
- Name animation clips deliberately, for example `Open`, and reference those exact names from actions or timeline tracks.
- Keep the useful mesh origin and transform clean before export. Entity placement should still live in `data/levels/*.json`, not be baked into every scene file.
- If an asset is missing or invalid, `ThreeRuntime` falls back to deterministic placeholder geometry and logs a warning.

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
