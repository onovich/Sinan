# Phase 12 Authoring And Data Safety Notes

This document tracks Phase 12 authoring workflow and data safety behavior.

## Inspector Component Authoring

- The Inspector now exposes a structured Transform form for selected entity position, rotation, and scale.
- Known components use schema-backed forms instead of raw JSON editing:
  - `Renderable`
  - `Door`
  - `Switch`
  - `Interactable`
  - `Collider`
  - `TriggerZone`
  - `PlayerSpawn`
- Unknown component payloads remain visible as read-only JSON so future data can be inspected without inventing unsafe generic editors.
- Component edits go through `UpdateEntityComponentCommand`, so they participate in undo/redo and level dirty state.
- Invalid form submissions surface inline validation issues and do not call the component update command.

## Event Authoring

- Event names, actions, and conditions are edited through a single schema-backed draft.
- Applying an event draft still goes through `UpdateEventCommand`, so action and condition changes participate in undo/redo and event dirty state.
- The Event Inspector supports structured add, remove, reorder, and field editing for common registry-backed actions, including flags, switches, doors, timelines, camera shots, audio, subtitles, animation commands, and entity transform commands.
- The Event Inspector supports condition creation, `all`/`any` grouping, typed condition field edits, and condition add, remove, and reorder for common registry-backed conditions.
- Event drafts are validated with `EventSchema`; invalid action or condition data is shown inline and cannot be applied.
- Trigger editing remains read-only in this checkpoint.

## Timeline And Camera Key Authoring

- Property timeline tracks expose keyframe selection plus add, move earlier/later, apply, and remove commands.
- Property keyframe operations go through timeline item commands, so undo/redo and timeline dirty state remain consistent.
- Camera shot keyframed shots expose key selection plus add, move earlier/later, apply, remove, look-at-selected, set-from-view, and preview commands.
- Camera key operations go through `UpdateCameraShotCommand`, so undo/redo and camera-shot dirty state remain consistent.
- Key move commands swap neighboring key times instead of only swapping array order, because runtime sampling sorts property and camera keys by time.

## Save-Time Validation And Dirty State

- The editor validates level, event, timeline, and camera shot data with the matching Zod schema before sending it to the dev save API.
- The dev save API validates every registered writable `data/**/*.json` target before writing. It supports the asset manifest, prefabs, levels, events, timelines, and camera shots, and rejects unknown data paths.
- Save failures from local schema validation or the dev save API are surfaced in the top project toolbar or the selected event, timeline, and camera shot panels.
- Dirty state is derived from last-saved JSON snapshots for level, event, timeline, and camera shot data. Undoing or redoing back to saved content returns the affected domain to `Clean`; successful saves refresh only the saved snapshot for that domain.

## Migration Workflow

- Data migrations live under `src/migrations/**`; the first migration adds `schemaVersion: 1` to pre-versioned project JSON.
- `npm run migrate-data -- --check` verifies all known `data/**/*.json` files are already at the current schema version without writing.
- `npm run migrate-data -- --write` applies pending migrations and writes pretty JSON with a trailing newline.
- Migration output is validated with the destination Zod schema before it is reported or written.
- New migrations must be deterministic, data-only, renderer-neutral, and covered by tests before use on repository data.

## Stronger Validation Reports

- `validate-data` now checks asset URLs are root-relative public paths, use type-appropriate extensions, and point to files under `public/`.
- Prefab, entity renderable, sound action, and sound track references check asset type as well as asset id existence.
- Timeline tracks, action references, condition entity references, camera shot targets, duplicate timeline track ids, duplicate camera shot ids, and animation clip metadata are validated.
- Animation clip checks are metadata-aware: they only reject a clip when the referenced model asset declares `metadata.clips` and the clip is absent.
- Registry coverage compares action and condition schema types against the default registries, and still validates `function.call` and `custom.condition` whitelist names when those JSON hooks are used.

## Current Smoke Coverage

- Browser smoke selects `switch_a`, edits the `Interactable.prompt` field, checks the level dirty state, and verifies undo/redo restores the prompt value.
- Browser smoke edits event conditions and actions through structured controls, checks the event dirty state, and verifies undo/redo restores the event action/condition counts.
- Browser smoke adds, reorders, removes, undoes, and redoes a property timeline keyframe.
- Browser smoke adds, reorders, removes, undoes, and redoes a camera shot keyframe.
- Browser smoke verifies the dev save API rejects a schema-invalid event payload and that undoing event and level edits back to saved content restores `Clean` status.

## Phase 12 Gate Status

- Phase 12 implementation work is complete once validation, smoke, and architecture boundary checks pass for this checkpoint.
- Phase 13 should begin with expanded browser smoke and automated boundary checks.
