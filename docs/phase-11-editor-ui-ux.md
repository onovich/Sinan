# Phase 11 Editor UI/UX Notes

This document records the current editor shell layout conventions.

For the next redesign brief, Variant exploration prompt, and implementation handoff, see
`docs/editor-ui-ux-redesign-brief.md`.
For the selected Variant visual direction, local reference image, and derived style rules, see
`docs/editor-ui-ux-variant-style-guide.md`.
For the interaction audit, engine-standard behavior matrix, and production handoff constraints, see
`docs/editor-ui-ux-interaction-audit.md`.
For the art adjustment task sheet aimed at the logic-layer implementation session, see
`docs/editor-ui-art-adjustment-handoff.md`.

## Layout

- The editor shell is constrained to `100vh`.
- The top toolbar, workbench, and timeline occupy fixed grid rows; the timeline row keeps a practical `220px` minimum for editing controls.
- Whole-page vertical scrolling is disabled; scrolling is contained inside side panels and the timeline.
- The timeline remains visible in the first desktop viewport.
- The viewport, hierarchy/assets column, inspector column, and timeline use `minmax(0, 1fr)`/`min-height: 0` constraints to avoid layout expansion.
- Narrow viewports stack the hierarchy, viewport, and inspector vertically while keeping the timeline in its own contained bottom row.
- On phone-width screens, the top toolbar wraps into compact command clusters instead of relying on horizontally clipped controls.

## Toolbar And Modes

- The top toolbar is grouped into brand, mode, tool, history, and project command clusters.
- The editor shell carries `data-mode` so Edit, Play, and Preview modes can be styled and smoked as distinct states.
- Mode buttons use `aria-pressed` and separate visual accents.
- Transform tools are disabled outside Edit mode to make Preview/Play affordances clearer.
- Save state is displayed as a compact status pill.

## Panel Density

- Hierarchy and asset panels show compact count pills in their headings.
- Entity rows separate display name, stable id, and prefab badge for faster scanning.
- Asset rows show the stable asset id, source URL, and type badge.
- Inspector empty and selected states share the same heading summary pattern.
- Event debug shows fired event, flag, and director command counts before detailed records.

## Status And Validation

- Editor save state uses shared status pills for `Clean`, `Unsaved`, `Saving`, `Saved`, `Save failed`, and validation issue counts.
- The top project toolbar shows the current level save/dirty state.
- Event, timeline, and camera shot panels show selected-item dirty/save/validation state in their title rows.
- Timeline and camera preview messages use the same compact status pill treatment.
- Validation alerts use a consistent red treatment and remain next to the form that produced them.
- Dirty state is intentionally conservative in Phase 11: command-backed edits mark the affected data domain dirty, while exact disk-equality cleanup is deferred to Phase 12 save-time data safety work.

## Smoke Coverage

- Browser smoke asserts that the page does not create document-level vertical scroll.
- Browser smoke asserts that the timeline shell is contained in the viewport and owns its internal scroll area.
- Browser smoke asserts that phone-width layout keeps the shell, canvas, timeline, and top toolbar controls contained without document-level or toolbar-level horizontal scroll.
- Browser smoke asserts hierarchy/asset summaries, asset URL visibility, selected entity state, and inspector component counts.
- Browser smoke asserts initial clean status, event validation issue status, timeline preview status, and level dirty status after an inspector transform edit.
- Browser smoke covers mode switching, mode shell state, transform tool disabled/enabled state, and save status visibility.
- Existing smoke still covers GLB-backed rendering, trigger helper toggling, timeline scrub, timeline playback, subtitle/audio HUD state, and switch interaction.

## Remaining Phase 11 Work

- Run the Phase 11 gate after responsive smoke, validation, and visual screenshot review complete.
