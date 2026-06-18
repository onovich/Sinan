# Sinan Editor Commercial UX Checklist

Date: 2026-06-18

Audience: mainline editor implementation session.

Reviewed target: `http://127.0.0.1:5174/`

Evidence captured:

- Screenshot: `docs/ui-reference/main-editor-commercial-ux-review.png`
- DOM/interaction probe: `docs/ui-reference/main-editor-commercial-ux-review.json`
- Visual reference: `docs/ui-reference/sinan-editor-static-prototype.html`
- Style guide: `docs/editor-ui-ux-variant-style-guide.md`
- Interaction audit: `docs/editor-ui-ux-interaction-audit.md`
- Design parity requirements: `docs/editor-ui-design-parity-requirements.md`

## Summary Verdict

The mainline UI has adopted the broad visual shell: compact dark toolbar, left hierarchy/assets rail, real Three viewport, right rail tabs, and bottom timeline. This is the correct production direction.

It is not yet commercial-grade editor UX. The current page still has many controls that are visually present but not fully discoverable, command-backed, stateful, or ergonomic. The next pass should focus on complete interaction loops per module, not only matching colors.

Commercial-grade here means:

- Every visible control has an obvious affordance, hover/focus state, disabled state, command path, feedback state, and keyboard/mouse behavior.
- Editing actions are domain-specific and undo/save/dirty aware.
- Preview-only interactions do not mark data dirty.
- Panels feel like engine tools, not generic forms.
- Timeline and viewport support direct manipulation, not only form editing.

## Global Acceptance Rules

- Keep the real React/editor/runtime architecture. Do not import the static HTML prototype as production code.
- Use the prototype as visual and interaction reference only.
- Keep Three.js isolated to existing runtime/editor viewport boundaries.
- Keep dirty state split by domain: level, event, timeline, camera.
- Do not expose a visual affordance unless the interaction is implemented or intentionally disabled with clear state.
- Use contained panel scrolling. The document must not become a long page.
- Cursor style must match behavior: pointer for clickable controls, grab for draggable clips, `ew-resize` for clip edges, text for pure text fields, scrub cursor for numeric drag fields.

## Current Evidence From Probe

Probe findings from `main-editor-commercial-ux-review.json`:

- Toolbar: 40px high, visually close.
- Shell: left 240px, right 300px, timeline 220px, viewport fills center.
- Status pills: 6, including `Clean`, `TL`, `EV`, `CAM`.
- Timeline clips: 6, resize handles: 12.
- Transform numeric input cursor is still `text`.
- Hierarchy row cursor is `default`.
- Asset rows are plain `li` elements with no role, no selection, no click affordance.
- Viewport cursor is `auto`.
- Timeline clip body cursor is `grab`; edge handles are `ew-resize`.

## P0: Interaction Completeness

These are required before the UI can be considered a serious editor surface.

### 1. Toolbar And Global Commands

Current shortcomings:

- Toolbar commands mostly exist, but some do not expose enough status feedback.
- Mode/tool buttons use `aria-pressed`, but the toolbar has no clear command bus feedback beyond save/status pills.
- `Undo`/`Redo` are visible but disabled initially; ensure they become active after command-backed edits.

Required behavior:

- Edit/Play/Preview switch must update mode state, viewport behavior, timeline preview behavior, and disabled/enabled state for editing tools.
- Select/Move/Rotate/Scale tools must be visually exclusive.
- Tools must be disabled outside Edit mode.
- Trigger Bounds must toggle helper visibility and update helper status text.
- Save must save only the level domain and update level status.
- TL/EV/CAM status pills must reflect timeline/event/camera dirty/save/error state.
- Undo/Redo must become active after command-backed mutations and must restore UI state visibly.

Acceptance checklist:

- `Edit`, `Play`, `Preview` all change mode and are visibly active.
- Tool state survives tab switches and selection changes.
- Trigger helper toggle visibly changes viewport helpers.
- Save gives immediate saving/saved/failed feedback.
- Domain pills update independently.
- Keyboard focus outline is visible on toolbar controls.

### 2. Hierarchy Panel

Current shortcomings:

- Rows can select entities, but cursor is `default`, which hides clickability.
- Rows lack tree/reorder affordance and drag/reparent semantics.
- No keyboard reorder support.
- No visible hover/focus treatment strong enough for engine UX.

Required behavior:

- Click or Enter/Space selects entity and syncs Inspector and Viewport.
- Selected entity uses yellow left rail and active background.
- Hover and focus states must be visible and layout-stable.
- Entity row cursor should be `pointer`; if reorder is implemented, drag handle or row should show `grab`.
- Reorder should be command-backed before enabling drag reorder.
- Reorder must mark level hierarchy dirty, not transform dirty.
- Reparent should wait until level hierarchy data supports it.

Acceptance checklist:

- Mouse hover clearly identifies row target.
- Keyboard can move focus through rows.
- Enter/Space selects row.
- Selection syncs to viewport and inspector.
- Drag reorder works only when backed by command/data.
- Dragging a hierarchy row never changes world coordinates.

### 3. Assets Panel

Current shortcomings:

- Asset rows are static `li` elements, not interactive controls.
- No selected asset state.
- No details preview or usage action.
- Cursor is `auto`, so the panel feels decorative.

Required behavior:

- Asset rows should be selectable by click and keyboard.
- Selected asset should show blue outline/focus treatment.
- Selecting an asset should show metadata or preview target, not mutate scene data.
- Drag-to-place or create-entity affordance should remain disabled until prefab placement command exists.
- Asset type badges should remain compact and readable.

Acceptance checklist:

- Asset row has button/role and keyboard focus.
- Selected asset state is visible.
- Status/metadata panel updates on selection.
- No fake drag-to-create unless command-backed.
- Audio/model assets have distinct but consistent badges.

### 4. Viewport

Current shortcomings:

- Real Three viewport is present, which is good.
- Viewport cursor is `auto`; navigation and picking affordances are not discoverable.
- Overlay text exists but is sparse compared with engine tools.
- It is unclear which tool supports which pointer behavior.

Required behavior:

- Left-click selects an entity through runtime picking.
- Move/Rotate/Scale direct manipulation should be implemented only if command-backed; otherwise disable those tools or show unavailable state.
- Right-drag pans/orbits according to chosen editor navigation model.
- Wheel zooms/dollies.
- Shift+wheel pans horizontally.
- Ctrl+wheel pans vertically.
- Selected entity highlight must be visible in 3D.
- Trigger helper toggle must update helper geometry.
- Viewport overlay should show selected entity, mode/tool, helper state, timeline time, and runtime status.

Acceptance checklist:

- Viewport cursor changes for pick/move/pan states.
- Selection from viewport syncs to hierarchy and inspector.
- Selection from hierarchy syncs to viewport highlight.
- Navigation works without selecting/dragging scene objects by accident.
- Preview/play mode prevents accidental edit commits.
- Runtime subtitle/audio HUD is visible when events play.

### 5. Inspector Panel

Current shortcomings:

- Inspector is functional but form-heavy.
- Numeric inputs are normal text/number fields; no horizontal scrub.
- Transform editing requires Apply Transform, but dirty/preview feedback is not strong enough.
- Component cards expose forms directly, making the panel taller and less scannable.

Required behavior:

- Summary card at top: entity id/name, prefab, components, dirty/validation state.
- Transform triplets support:
  - direct text entry,
  - horizontal scrub,
  - keyboard stepping,
  - validation,
  - Apply/Revert if draft-based.
- Numeric scrub should mark level dirty only after command-backed change.
- Component cards should be selectable and collapsed by default; detailed editing appears in focused detail area.
- Advanced JSON stays secondary.

Acceptance checklist:

- Transform X/Y/Z fields have scrub cursor/behavior.
- Editing transform updates viewport preview or draft state.
- Apply commits through transform command.
- Invalid values are blocked or clearly marked.
- Component selection does not dirty data until a field changes.
- Undo/redo works for transform edits.

### 6. Event Panel

Current shortcomings:

- Event tab exists but must behave like a schema authoring tool, not a generic form.
- Validation and dirty state must be tied to event fields/actions.

Required behavior:

- Event selector and summary: id/name, dirty/save status, validation issue count.
- Trigger, conditions, and actions are cards with type-specific editors.
- Add/remove/reorder actions must be command-backed.
- Validation messages must appear near the offending field/card.
- Apply Event and Save Event must be distinct:
  - Apply updates in-memory draft/preview if applicable.
  - Save persists event data.

Acceptance checklist:

- Changing event field marks event dirty only.
- Saving event clears event dirty state.
- Event invalid state appears on tab and status pill.
- Action order can be changed if command-backed.
- Event preview/play does not silently save.

### 7. Camera Panel

Current shortcomings:

- Camera tab exists but needs complete camera-shot editing UX.
- Camera numeric fields should match transform field interactions.

Required behavior:

- Shot selector and summary card.
- Keyframe list/selector with current key details.
- Duration/FOV/position/look-at fields support numeric scrub where appropriate.
- Set From View captures current editor camera transform.
- Look At Selected uses selected entity.
- Preview Shot drives camera preview and status, not dirty state.
- Save Shot persists camera data and clears camera dirty state.

Acceptance checklist:

- Camera edits mark camera dirty only.
- Preview does not mark dirty.
- Set From View creates/updates a key and is undoable.
- Save Shot status is visible.
- Invalid key times/durations are validated.

### 8. Debug Panel

Current shortcomings:

- Debug must remain read-only but inspectable.
- Runtime logs need filtering/selection affordance.

Required behavior:

- Show fired events, command count, flags, entities affected.
- Runtime log rows selectable by click/keyboard.
- Selecting a log updates detail/metadata view.
- Add filter/search only if useful; it must not mutate runtime state.
- Replay/jump commands must be explicit buttons, not accidental row clicks.

Acceptance checklist:

- Debug log selection is visible.
- Debug rows are keyboard reachable.
- No debug action marks data dirty.
- Debug panel does not pull per-frame state through React.

### 9. Timeline / Sequencer

Current shortcomings:

- Visual structure is close, but direct manipulation is incomplete.
- Clip body has `grab` cursor and handles have `ew-resize`, but clips are still buttons; dragging/moving/resizing must be command-backed to be complete.
- Timeline uses a native range scrubber; commercial engines usually allow ruler/playhead/lane scrub directly.
- Track editor takes over the bottom strip and feels form-first rather than sequencer-first.

Required behavior:

- Timeline layout should have three zones:
  - compact controls/status row,
  - ruler + lanes,
  - selected track detail strip.
- Ruler, playhead, and empty lane area should scrub time.
- Start/Play/Pause/Stop/End must drive playhead and runtime preview.
- Clip body drag moves clip start time.
- Clip left/right handles resize duration.
- Clip selection updates selected track details immediately.
- Clip edit commands mark timeline dirty only.
- Track detail editing should be compact; expand advanced fields only when needed.
- Add/remove track must be command-backed.

Acceptance checklist:

- Playhead can be dragged, not only range input.
- Empty lane/ruler click seeks time.
- Clip body drag changes start time through timeline command.
- Clip edge drag changes duration through timeline command.
- Selected clip has strong visual state.
- Track type colors match reference vocabulary.
- Timeline dirty state updates independently from level/event/camera.
- Undo/redo works for clip movement/resizing.

## P1: Commercial Polish

### 10. Cursor And Affordance Pass

Current evidence:

- Toolbar buttons report `default` cursor.
- Hierarchy row reports `default` cursor.
- Assets report `auto` cursor.
- Viewport reports `auto`.
- Transform input reports `text`.

Required behavior:

- Clickable buttons: `pointer`.
- Disabled controls: `not-allowed`.
- Hierarchy selectable rows: `pointer`; reorder handle: `grab`.
- Asset selectable rows: `pointer`.
- Timeline clip body: `grab`, dragging: `grabbing`.
- Timeline edge handles: `ew-resize`.
- Numeric scrub fields: `ew-resize` or split label-handle with `ew-resize`, while text entry remains possible.
- Viewport: tool-specific cursor for select/move/pan.

### 11. Keyboard And Accessibility

Required behavior:

- Tabs use proper `role="tab"` with selected state and keyboard navigation.
- Hierarchy/assets/debug/timeline rows have keyboard focus and selection behavior.
- Toolbar segmented controls expose pressed state.
- All icon-only future controls must have labels/tooltips.
- Focus rings are visible in dark theme.

Acceptance checklist:

- Can operate major panels without a mouse.
- Focus order follows visual order.
- No invisible focus.
- Disabled controls explain why via title/status where useful.

### 12. Responsive And Containment

Required behavior:

- Toolbar should scroll or wrap only at narrow widths.
- Workbench should preserve viewport/timeline usability.
- Right rail and left rail should scroll internally.
- Timeline should maintain lane readability and horizontal scroll where needed.
- No text overlaps inside controls.

Acceptance checklist:

- 1440x960, 1256x900, 1024x768, and mobile/narrow smoke screenshots are acceptable.
- Document scroll remains contained.
- Timeline remains accessible.
- Long ids truncate cleanly.

## P2: Advanced Editor UX

These can follow after P0/P1.

- Multi-select hierarchy and viewport selection.
- Context menus for entity, asset, clip, track.
- Snapping and grid controls.
- Timeline zoom and horizontal pan.
- Clip copy/paste/duplicate.
- Track mute/solo/lock.
- Prefab placement from asset drag.
- Command palette or shortcut hints.
- Save All if multiple domains are dirty.
- Per-panel collapse/resize if workflow demands it.

## Do Not Do

- Do not replace mainline React with the static prototype page.
- Do not use prototype DOM state as source of truth.
- Do not mark all edits as level dirty.
- Do not use Hierarchy drag to move world transforms.
- Do not show direct manipulation affordances if they do not execute real commands.
- Do not add large decorative panels or marketing-style layout.
- Do not push per-frame runtime state into React panels.

## Suggested Revision Order

1. Cursor/affordance pass for all existing controls.
2. Asset selection and metadata preview.
3. Numeric scrub input primitive, then Transform and Camera fields.
4. Timeline direct manipulation: ruler/playhead scrub, clip move, clip edge resize.
5. Viewport navigation/picking tool parity.
6. Hierarchy reorder only after command/data support.
7. Right rail card/detail polish.
8. Accessibility and keyboard pass.
9. Responsive smoke screenshots.
10. Update smoke tests for each interaction loop.

## Test Checklist

Add or update browser smoke tests for:

- Mode switch disables/enables tools.
- Hierarchy selection syncs Inspector and Viewport.
- Asset selection updates asset detail state.
- Transform numeric scrub marks level dirty and changes selected entity.
- Event edit marks event dirty only.
- Camera key edit marks camera dirty only.
- Timeline scrub changes playhead without dirty state.
- Timeline clip body drag marks timeline dirty.
- Timeline clip edge resize marks timeline dirty.
- Play/Pause/Stop/Start/End update playhead/status.
- Viewport helper toggle changes helper rendering.
- No document-level scroll in desktop viewport.
