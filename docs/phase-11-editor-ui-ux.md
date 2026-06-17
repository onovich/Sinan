# Phase 11 Editor UI/UX Notes

This document records the current editor shell layout conventions.

## Layout

- The editor shell is constrained to `100vh`.
- The top toolbar, workbench, and timeline occupy fixed grid rows; the timeline row keeps a practical `220px` minimum for editing controls.
- Whole-page vertical scrolling is disabled; scrolling is contained inside side panels and the timeline.
- The timeline remains visible in the first desktop viewport.
- The viewport, hierarchy/assets column, inspector column, and timeline use `minmax(0, 1fr)`/`min-height: 0` constraints to avoid layout expansion.

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

## Smoke Coverage

- Browser smoke asserts that the page does not create document-level vertical scroll.
- Browser smoke asserts that the timeline shell is contained in the viewport and owns its internal scroll area.
- Browser smoke asserts hierarchy/asset summaries, asset URL visibility, selected entity state, and inspector component counts.
- Browser smoke covers mode switching, mode shell state, transform tool disabled/enabled state, and save status visibility.
- Existing smoke still covers GLB-backed rendering, trigger helper toggling, timeline scrub, timeline playback, subtitle/audio HUD state, and switch interaction.

## Remaining Phase 11 Work

- Validation, dirty, save, and preview state treatment.
- Narrow viewport/responsive pass.
