# Phase 11 Editor UI/UX Notes

This document records the current editor shell layout conventions.

## Layout

- The editor shell is constrained to `100vh`.
- The top toolbar, workbench, and timeline occupy fixed grid rows.
- Whole-page vertical scrolling is disabled; scrolling is contained inside side panels and the timeline.
- The timeline remains visible in the first desktop viewport.
- The viewport, hierarchy/assets column, inspector column, and timeline use `minmax(0, 1fr)`/`min-height: 0` constraints to avoid layout expansion.

## Smoke Coverage

- Browser smoke asserts that the page does not create document-level vertical scroll.
- Browser smoke asserts that the timeline panel starts within the viewport.
- Existing smoke still covers GLB-backed rendering, trigger helper toggling, timeline scrub, timeline playback, subtitle/audio HUD state, and switch interaction.

## Remaining Phase 11 Work

- Toolbar mode affordance and icon treatment.
- Panel density and visual hierarchy pass.
- Validation, dirty, save, and preview state treatment.
- Narrow viewport/responsive pass.
