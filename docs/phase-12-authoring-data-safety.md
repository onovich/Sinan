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

## Current Smoke Coverage

- Browser smoke selects `switch_a`, edits the `Interactable.prompt` field, checks the level dirty state, and verifies undo/redo restores the prompt value.

## Remaining Phase 12 Work

- Event action/condition add/remove/reorder authoring.
- Timeline marker/keyframe and camera keyframe add/remove/reorder improvements.
- Save-time validation before writing JSON through the dev save API.
- Dirty-state exactness after save/reload comparisons.
- Migration scaffolding and migration tests.
- Stronger asset/reference/registry validation reports.
