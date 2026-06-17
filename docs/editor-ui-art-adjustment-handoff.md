# Sinan Editor Art Adjustment Handoff

Audience: the AI/session currently implementing editor logic and data behavior.

Goal: after the logic layer stabilizes, replace the current editor presentation with the selected compact dark game-editor direction without breaking Sinan's data-first architecture.

## Read First

Use these files as the source package:

- `docs/ui-reference/sinan-editor-static-prototype.html` - standalone visual/interaction reference. Do not import it into the app.
- `docs/ui-reference/variant-selected-editor-reference.png` - selected Variant style reference.
- `docs/editor-ui-ux-variant-style-guide.md` - tokens, layout rules, visual vocabulary.
- `docs/editor-ui-ux-interaction-audit.md` - interaction matrix and production mapping.
- `docs/phase-11-editor-ui-ux.md` - current editor shell expectations and smoke coverage.

## Implementation Rule

Treat the static prototype as a design specimen, not application code.

Do:

- Port design tokens, spacing, panel density, status styles, lane visuals, and interaction semantics into the existing React editor.
- Keep existing data loading, editor store, command paths, save paths, validation, timeline preview, runtime picking, and Three.js boundaries.
- Preserve module ownership: panels stay panels, runtime viewport stays runtime/editor viewport glue, per-frame systems stay out of React state.

Do not:

- Import the prototype HTML/CSS/JS wholesale.
- Replace logic-layer work with DOM-only prototype behavior.
- Move Three.js imports into `src/editor` panels, `src/game`, `src/events`, `src/director`, `src/world`, `src/schemas`, `src/data`, or migrations.
- Collapse level/event/timeline/camera dirty state into one generic flag.
- Add decorative UI that has no current Sinan data or workflow mapping.

## Target Visual Direction

The editor should feel like a compact game/DCC workstation:

- Near-black chrome, slightly lighter viewport, thin mechanical separators.
- Dense panel layout, no marketing-style cards, no oversized hero treatment.
- Yellow/gold for brand, selected entity, warnings, and unsaved state.
- Green for saved/playback/runtime-positive state.
- Blue for preview, camera, selected timeline clip, and active technical focus.
- Red for invalid/error state.
- Monospace for ids, coordinates, timecode, track bindings, file-ish paths.
- Uppercase compact labels for toolbar, panels, tabs, status chips.
- Cards only for repeated inspector/debug/timeline items, not for page sections.

Core token reference from the prototype:

```css
--sinan-bg-chrome: #141518;
--sinan-bg-panel: #1c1d21;
--sinan-bg-active: #2a2b2f;
--sinan-bg-viewport: #252528;
--sinan-bg-field: #111216;
--sinan-border: #3f4247;
--sinan-border-soft: #303338;
--sinan-text-primary: #e0e0e0;
--sinan-text-secondary: #a0a0a5;
--sinan-text-muted: #747982;
--sinan-accent-green: #72b053;
--sinan-accent-yellow: #d4b24c;
--sinan-accent-blue: #4a9eff;
--sinan-accent-red: #cc5a5a;
```

## Layout Target

Desktop shell:

- Top toolbar: brand, mode switch, transform tools, history, helper toggle, save/status.
- Left rail: Hierarchy above Project Assets.
- Center: viewport is the dominant workspace.
- Right rail: tabbed Inspector / Event / Camera / Debug.
- Bottom: lane-based sequencer/timeline, always visible on desktop.
- Whole editor constrained to the viewport. Internal panels scroll; the document should not become a long page.

Narrow shell:

- Keep text readable; do not shrink fonts with viewport units.
- Allow contained horizontal scroll for toolbar/workbench/timeline when needed.
- Stack rails only at small widths, preserving viewport and timeline usability.

## Module Mapping

| Surface | Existing target | Art adjustment |
| --- | --- | --- |
| Toolbar | `src/editor/EditorApp.tsx`, editor store/status | Group controls into compact clusters; show mode/tool/history/helper/save/status as status pills and segmented controls. |
| Hierarchy | `src/editor/panels/HierarchyPanel.tsx`, `data/levels/level_01.json` | Compact rows with selected gold rail, prefab/type badge, keyboard selection, drag reorder affordance when command-backed. |
| Assets | `src/editor/panels/AssetPanel.tsx`, `data/assets.manifest.json` | Compact id/type/url rows with blue focus/selection outline. |
| Viewport | editor viewport glue, `src/runtime/three/**` | Keep real canvas; add grid/selection/status overlays above it. Preserve helper toggle and runtime HUD placement. |
| Inspector | `src/editor/panels/InspectorPanel.tsx` | Summary header, transform triplets, component cards, compact actions, advanced JSON as secondary disclosure. |
| Event | `src/editor/panels/EventInspector.tsx`, `src/events/**`, `data/events/*.json` | Schema-backed trigger/condition/action cards, validation beside the field/action causing it, event dirty/invalid state. |
| Camera | `src/editor/panels/CameraShotPanel.tsx`, camera shot data | Shot selector, keyframe fields, camera preview status, Set From View / Look At / Save Shot commands. |
| Debug | `src/editor/panels/EventDebugPanel.tsx` | Read-only sampled runtime dashboard and selectable log rows. No per-frame React state. |
| Timeline | `src/editor/panels/TimelinePanel.tsx`, `src/director/**`, timeline data | Lane sequencer, ruler, playhead, colored clips by track type, selected track detail strip, resize handles with `ew-resize`. |

## Interaction Requirements

These should be implemented only when backed by the real editor state/commands:

- Hierarchy click/keyboard select syncs with viewport and Inspector.
- Hierarchy drag reorders entity rows only; it must not edit world transform.
- Viewport left-click selects an object through real picking.
- Viewport transform edits route through transform commands.
- Viewport navigation: right-drag pan, wheel zoom/dolly, Shift+wheel horizontal pan, Ctrl+wheel vertical pan.
- Numeric fields scrub horizontally without visible sliders.
- Timeline Start/Play/Pause/Stop/End drives timecode and playhead.
- Timeline scrub changes preview time, not persisted data.
- Timeline clip body drag moves the clip.
- Timeline clip edge handles resize duration and show a distinct `ew-resize` cursor.
- Component/action/debug rows may be selected for details; selection alone should not mark dirty.

## Dirty And Save Semantics

Keep dirty state domain-specific:

- Transform, hierarchy reorder, entity metadata: level dirty.
- Event identity/trigger/condition/action edits: event dirty.
- Timeline clip move/resize/track edits: timeline dirty.
- Camera key, FOV, duration, look-at edits: camera dirty.
- Timeline scrub/playback and debug log selection are preview/read-only state, not dirty edits.

Status vocabulary:

- Clean / Saved: green dot.
- Unsaved / Dirty / Warning: yellow dot.
- Preview / Focus / Camera: blue dot.
- Invalid / Failed: red dot.
- Playing: green accent with clear playback label.

## Suggested Work Order

1. Add shared CSS variables and low-level UI primitives: panels, tabs, status pills, chips, segmented controls, compact rows, field triplets.
2. Restyle the editor shell without changing data flow: toolbar, rails, viewport frame, right rail, timeline container.
3. Restyle individual panels one at a time, preserving existing props and callbacks.
4. Add reusable numeric scrub input behavior where the current command path exists.
5. Add timeline clip affordances: body move cursor, edge resize handles, selected track strip.
6. Add hierarchy reorder only after the command/data layer supports reordering.
7. Refresh smoke tests and screenshots after each surface-level tranche.

## Acceptance Checklist

- First viewport resembles `variant-selected-editor-reference.png`: compact dark chrome, left hierarchy, central viewport, right tabs, bottom sequencer.
- Static prototype and production editor share the same visual vocabulary, but production does not contain prototype-only text or handoff sections.
- Every visible command maps to an existing callback, command, or intentionally disabled future affordance.
- No unrelated refactors, no data schema changes unless required by the logic task.
- `npm run typecheck`, relevant tests, and smoke checks pass after the UI port.
- Dirty indicators update the correct domain.
- Timeline edge resize has a visible handle/cursor distinct from body drag.
- Document-level scrolling does not replace contained editor scrolling.
