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

## Current Smoke Coverage

- Browser smoke selects `switch_a`, edits the `Interactable.prompt` field, checks the level dirty state, and verifies undo/redo restores the prompt value.
- Browser smoke edits event conditions and actions through structured controls, checks the event dirty state, and verifies undo/redo restores the event action/condition counts.
- Browser smoke adds, reorders, removes, undoes, and redoes a property timeline keyframe.
- Browser smoke adds, reorders, removes, undoes, and redoes a camera shot keyframe.

## Remaining Phase 12 Work

- Save-time validation before writing JSON through the dev save API.
- Dirty-state exactness after save/reload comparisons.
- Migration scaffolding and migration tests.
- Stronger asset/reference/registry validation reports.
