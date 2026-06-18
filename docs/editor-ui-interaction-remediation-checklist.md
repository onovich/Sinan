# Sinan Editor UI Interaction Remediation Checklist

Date: 2026-06-18
Scope: current main project editor at `http://127.0.0.1:5174/`, compared against the local static reference prototype in `docs/ui-reference/sinan-editor-static-prototype.html`.

This document is for the implementation session that is currently changing the production editor. It focuses on interaction quality, not visual parity alone. The goal is a commercial-grade game-engine editor feel: direct manipulation, immediate feedback while dragging, predictable commit/cancel semantics, and traceable mapping to Sinan data modules.

## Executive Summary

The main editor already has the right high-level modules: top toolbar, hierarchy/assets rail, Three viewport, inspector/event/camera/debug rail, and bottom timeline. It also has real project data and real runtime integration, which the static prototype does not.

The current gap is interaction depth. Several operations technically exist but feel unfinished because the UI only updates after mouse release, uses form-style inputs instead of editor scrub controls, or lacks standard viewport navigation. This creates the impression that the UI is less capable than the prototype even when the data layer exists.

Do not replace the production editor with the static prototype wholesale. Instead, port the prototype's interaction contract into the real React/runtime modules.

## P0: Must Fix Before Design Parity Review

### 1. Timeline Clip Move And Resize Are Not Live During Drag

Observed issue:

- Dragging a Timeline clip body or edge does not continuously update the visible clip position/width.
- The update is applied only on pointer release, so resize/move feels delayed.
- This matches code in `src/editor/panels/TimelinePanel.tsx`: `updateTimelinePointerDrag` only handles `scrub`, while `move` and `resize-left/right` are calculated in `finishTimelinePointerDrag`.

Relevant code:

- `src/editor/panels/TimelinePanel.tsx`
  - `startClipDrag`
  - `updateTimelinePointerDrag`
  - `finishTimelinePointerDrag`
  - `moveTrackByDelta`
  - `resizeTrackByDelta`

Required solution:

- Add a transient Timeline drag preview state, separate from committed project data.
- On `pointerdown`, store drag context:
  - `timelineId`
  - `trackId`
  - original track
  - mode: `move`, `resize-left`, `resize-right`, or `scrub`
  - start pointer X
  - timeline duration
  - lane element rect
- On `pointermove`, compute the preview track and render it immediately.
- Throttle visual preview with `requestAnimationFrame`, not with command commits.
- On `pointerup`, commit exactly one command if the final preview differs from the original.
- On `Escape` or `pointercancel`, discard the preview.
- Dirty state should turn `Unsaved` on commit, not on every pointer move.
- Selected track details should read from the preview track while dragging.

Implementation shape:

```ts
type TimelineDragPreview = {
  timelineId: string;
  trackId: string;
  mode: 'move' | 'resize-left' | 'resize-right';
  originalTrack: TimelineTrackData;
  previewTrack: TimelineTrackData;
  startX: number;
};
```

Rendering rule:

- `selectedTimeline.tracks.map(track => preview.trackId === track.id ? preview.previewTrack : track)`
- Do not mutate `project.timelines` until pointer release.

Acceptance tests:

- Start a clip resize with `mouse.down`.
- Move the mouse halfway without `mouse.up`.
- Assert the clip width/left has already changed.
- Assert dirty state is still either `Preview edit` or unchanged until commit, depending on chosen UI policy.
- Release mouse.
- Assert one command is added to history and Timeline dirty becomes `Unsaved`.
- Press `Escape` during drag and assert the clip returns to original dimensions.

### 2. Timeline Playback Updates At 10Hz And Feels Stepped

Observed issue:

- Timeline playback uses `window.setInterval(..., 100)`.
- The playhead and timecode update in coarse 0.1s steps instead of feeling continuous.

Relevant code:

- `src/editor/EditorApp.tsx`
  - `scheduleTimelinePlaybackFrame`
  - current loop calls `session.director.update(0.1, ...)` every 100ms.

Required solution:

- Use `requestAnimationFrame` for UI playback ticks.
- Compute `dt` from `performance.now()`.
- Keep director sampling deterministic by clamping or accumulating dt as needed, but render playhead/timecode every frame.
- Continue to round display values, but do not round the underlying preview cursor before rendering position.

Acceptance tests:

- During 800ms playback, sample playhead left position at least three times and assert monotonic motion.
- Assert the Play button changes to Pause immediately.
- Assert Stop resets time and playhead to zero.

### 3. Viewport Navigation Is Missing Engine-Grade Controls

Observed issue:

- The viewport supports picking through `SelectionTool`, and TransformControls exists for move/rotate/scale.
- There is no clear editor camera navigation controller for wheel zoom/dolly, right-drag pan/orbit, Shift+wheel horizontal pan, Ctrl+wheel vertical pan, frame selected, or reset view.
- Code search shows no `OrbitControls`, `MapControls`, `wheel`, `contextmenu`, `pan`, `dolly`, or equivalent controller in `src/editor` / `src/runtime`.

Relevant code:

- `src/editor/Viewport.tsx`
- `src/runtime/three/ThreeRuntime.ts`
- `src/editor/tools/SelectionTool.ts`

Required solution:

- Add an `EditorCameraController` inside `src/runtime/three/**` or equivalent runtime boundary.
- Keep Three.js isolated in runtime code, per project rules.
- Recommended controls:
  - Wheel: dolly/zoom toward cursor.
  - Shift + wheel: horizontal pan.
  - Ctrl + wheel: vertical pan.
  - Right-drag: pan for the current authoring view.
  - Alt + left-drag or middle-drag: orbit, if perspective editing is needed.
  - `F`: frame selected entity.
  - `Home`: frame whole level.
  - Disable browser context menu over the canvas.
- Picking must distinguish click from drag:
  - select only when pointer movement is under a small threshold.
  - do not select while panning/orbiting or while TransformControls is active.

Acceptance tests:

- Wheel changes camera distance or zoom and visibly changes canvas screenshot.
- Shift+wheel changes horizontal camera center.
- Ctrl+wheel changes vertical camera center.
- Right-drag pans without changing selected entity.
- Left-click selects entity; left-drag over gizmo transforms entity.

### 4. Transform Gizmo Does Not Feed Live Inspector/HUD Preview

Observed issue:

- `ThreeRuntime` emits `objectChange` and `mouseUp`.
- `Viewport` currently passes only `onCommit` to `attachTransformGizmo`.
- Scene object may move while dragging, but Inspector values, selected overlay coordinates, and dirty state update only after commit.

Relevant code:

- `src/runtime/three/ThreeRuntime.ts`
  - `transformControls.addEventListener('objectChange', ...)`
  - `transformControls.addEventListener('mouseUp', ...)`
- `src/editor/Viewport.tsx`
  - `runtime.attachTransformGizmo(selectedEntityId, { onCommit })`

Required solution:

- Pass both `onChange` and `onCommit`.
- Use `onChange` to update a transient transform preview in editor state.
- Inspector and viewport overlay should read preview transform while a gizmo drag is active.
- Use `onCommit` to issue one `TransformEntityCommand`.
- `Escape` should cancel preview and restore original transform if TransformControls supports cancellation, or at least provide a cancel path in editor state.

Acceptance tests:

- Start dragging the move gizmo.
- Before mouse release, assert Inspector position/HUD position changes.
- Release mouse and assert only one command is recorded.

### 5. Inspector And Camera Numeric Fields Are Plain Forms, Not Editor Scrub Inputs

Observed issue:

- Transform fields are ordinary `type="number"` inputs with `defaultValue`.
- Camera key fields are ordinary controlled `type="number"` inputs.
- There is no horizontal drag scrub behavior on numeric fields.
- Transform changes require `Apply Transform`, which feels like a form, not an editor inspector.

Relevant code:

- `src/editor/panels/InspectorPanel.tsx`
  - `VectorField`
- `src/editor/panels/CameraShotPanel.tsx`
  - key time/FOV/position inputs
- `src/editor/panels/TimelinePanel.tsx`
  - track time/duration/key time fields

Required solution:

- Create a reusable `NumericScrubInput`.
- Behavior:
  - Click/focus: normal text/number edit.
  - Horizontal drag on input label or value field: increment/decrement.
  - Small movement threshold before entering scrub mode.
  - Shift = coarse step, Alt = fine step, Ctrl = snap if useful.
  - Enter commits typed edit.
  - Escape cancels typed or scrub edit.
  - Pointer release commits one command for command-backed values.
- Use the same component for:
  - Transform triplets.
  - Collider center/size.
  - Camera key time/FOV/position.
  - Timeline track time/duration.
  - Timeline key time/value when numeric.

Acceptance tests:

- Drag `Position X` horizontally by 40px and assert the displayed value changes before release.
- Release and assert entity transform command is committed.
- Press Escape during scrub and assert original value is restored.

## P1: Important Engine UX Improvements

### 6. Timeline Playhead Itself Is Not A Draggable Handle

Observed issue:

- The playhead is inside `.timeline-playfield` with `pointer-events: none`.
- Scrubbing works through ruler/lane area, but the green playhead is not a direct manipulation target.

Required solution:

- Keep a visual playhead line, but add an interactive handle layer.
- Cursor should be `ew-resize` over the playhead handle.
- Dragging the handle should scrub time continuously.
- The handle should remain usable even when it overlaps clips.

Acceptance tests:

- Drag the playhead handle from 0s to 2s and assert timecode and runtime preview update during drag.

### 7. Timeline Selection Drawer Causes Layout/Reflow Risk

Observed issue:

- Selecting a track opens detail/editor content below the lanes.
- During testing, selecting the property track opened a large detail section and shifted the bottom layout.
- Reflow during a drag can make pointer interactions feel unstable.

Required solution:

- Reserve fixed height for selected track details, or place details in a non-reflowing split panel.
- Do not open/close large sections during pointer drag.
- Keep lane geometry stable from pointerdown to pointerup.

Acceptance tests:

- Start dragging a clip; selected track details may update, but `.timeline-content` bounding rect must not change during the drag.

### 8. Timeline Needs Snap, Zoom, Auto-Scroll, And Better Edge Affordance

Observed issue:

- There is no visible snap/grid policy beyond the static ruler.
- Dragging near the edge of the scrollable timeline does not advertise auto-scroll.
- Non-resizable clips still show edge handles with `not-allowed`; this creates visual noise.

Required solution:

- Add snap grid:
  - default snap to 0.05s or ruler tick.
  - hold Alt to temporarily disable snap.
  - show snapped time tooltip.
- Add horizontal timeline zoom:
  - Ctrl + wheel over timeline zooms timeline scale.
  - preserve time under cursor.
- Add auto-scroll while dragging near timeline left/right edges.
- For non-resizable marker clips, hide resize handles or make them visually distinct as marker pins rather than disabled resize bars.
- On resizable clips, edge zones should be 10-12px wide with visible hover highlight.

Acceptance tests:

- Drag with default snap and assert time aligns to snap increment.
- Drag with Alt and assert free movement.
- Drag near edge and assert `scrollLeft` changes while pointer is held.

### 9. Hierarchy Supports Selection But Not Reorder/Reparent

Observed issue:

- Current `HierarchyPanel` renders rows as buttons only.
- There is no drag/drop reorder or reparent interaction.

Relevant code:

- `src/editor/panels/HierarchyPanel.tsx`

Required solution:

- Add command-backed reorder first.
- Reparent can wait until hierarchy data supports it clearly.
- Dragging hierarchy rows must never change world transform.
- During drag:
  - show insertion line.
  - auto-scroll rail.
  - preserve selection.
  - mark level hierarchy dirty only on drop.
- Add keyboard support:
  - ArrowUp/ArrowDown changes active row.
  - Enter/Space selects.
  - Ctrl+Up/Ctrl+Down reorders if command exists.

Acceptance tests:

- Drag one entity row above another and assert order changes.
- Assert transform values do not change.
- Assert level dirty state changes, not timeline/event/camera dirty state.

### 10. Assets Are Selectable But Not Authoring-Interactive

Observed issue:

- Asset list can select assets and show metadata.
- It does not support drag-to-place or drag-to-assign.

Required solution:

- Short term:
  - Add search/filter.
  - Add type grouping.
  - Add stronger selected asset preview.
- Later, when prefab creation commands exist:
  - drag model asset to viewport to instantiate prefab/entity.
  - drag sound asset onto Timeline to create sound track.
  - drag model/clip references into Inspector fields where valid.

Acceptance tests:

- Search filters assets.
- Dragging sound to timeline creates a draft sound track only through a command-backed path.

### 11. Event Editor Is Functional But Too Form-Like

Observed issue:

- Event actions can be added, edited, moved by buttons, and removed.
- It still reads like a form editor, not a node/card authoring panel.

Required solution:

- Use compact action cards with:
  - action type icon/color.
  - target binding.
  - validation/error chip.
  - move handle.
  - duplicate/remove controls.
- Support drag reorder of actions.
- Show trigger/condition/action as a readable event chain.
- Keep raw JSON only as an advanced fallback.

Acceptance tests:

- Drag an action card to reorder and assert event dirty state.
- Invalid action field shows inline validation without breaking the rest of the panel.

### 12. Camera Shot Editing Needs Timeline And Viewport Coupling

Observed issue:

- Camera key editing exists through select + numeric fields.
- It lacks camera key mini-timeline, live viewport preview, and numeric scrub.

Required solution:

- Add keyframe strip for selected camera shot.
- Scrubbing a camera shot key should preview the camera instantly.
- `Look At Selected` should show what entity will be used before commit.
- Numeric fields should use `NumericScrubInput`.
- Camera dirty state should remain separate from Timeline dirty unless a timeline camera track changes.

Acceptance tests:

- Drag camera key time on a strip and assert key marker moves live.
- Change FOV by scrub and assert viewport/camera preview changes before commit.

### 13. Debug Panel Is Read-Only

Observed issue:

- Debug panel displays fired events, flags, doors, and director queue.
- There are no useful runtime debug actions.

Required solution:

- Add explicit debug controls:
  - clear fired events.
  - toggle/set flag.
  - fire selected event.
  - replay selected timeline in preview mode.
  - copy debug snapshot.
- Keep destructive runtime actions clearly separated from data edits.

Acceptance tests:

- Toggle a flag in Debug and assert Event panel condition preview responds.
- Clear debug state without changing project JSON dirty states.

## P2: Polish And Commercial-Grade Standards

### 14. Cursor And Hover States Must Communicate The Operation

Required policy:

- Timeline clip body: `grab` / `grabbing`.
- Timeline clip edge: `ew-resize`, visible handle glow on hover.
- Non-resizable marker: marker cursor/shape, not disabled resize handles.
- Viewport pan/orbit: cursor changes during navigation.
- Numeric scrub input: horizontal resize/scrub cursor only after hover target is clear.

Acceptance tests:

- Playwright checks computed cursors for body, left edge, right edge, ruler, playhead handle, and numeric scrub target.

### 15. Undo/Redo Should Treat Drag Gestures As One Command

Required policy:

- One continuous drag = one command.
- Pointermove preview must not spam command history.
- Undo after a resize should return to the pre-drag track exactly.
- Redo reapplies final state.

Acceptance tests:

- Resize clip with many pointer moves.
- Click Undo once and assert clip returns to original.
- Click Redo once and assert clip returns to final.

### 16. Design Review Mode Needs Interaction Gates

Required policy:

- Keep `?designReview=1` for deterministic visual/interaction review.
- In design review mode:
  - selected entity/timeline/track/shot should be deterministic.
  - viewport camera should start at a known pose.
  - helper visibility should be deterministic.
  - timeline time should be deterministic.

Acceptance tests:

- Launch `/?designReview=1`.
- Compare screenshots for shell regions against reference.
- Run interaction smoke against deterministic default selection.

## Required Test Additions

Add tests that verify interaction during the gesture, not only after release:

- Timeline clip move live preview before mouseup.
- Timeline clip resize live preview before mouseup.
- Timeline drag cancel with Escape.
- Timeline auto-scroll near edges.
- Playhead handle drag.
- Playback continuous motion with multiple sampled positions.
- Viewport wheel zoom/pan/right-drag navigation.
- Transform gizmo live Inspector/HUD preview.
- Numeric scrub live value change and cancel.
- Hierarchy reorder command and dirty-domain separation.

Current smoke tests already cover some final states, such as clip left/width changing after drag. That is not enough for commercial editor UX.

## Implementation Order

1. Timeline drag preview state and mid-drag tests.
2. Playback loop from `setInterval` to `requestAnimationFrame`.
3. Transform gizmo `onChange` preview path.
4. Reusable `NumericScrubInput`.
5. Viewport editor camera controller.
6. Hierarchy reorder.
7. Timeline playhead handle, snap, zoom, and auto-scroll.
8. Event/Camera/Debug panel interaction polish.

## Definition Of Done

The other implementation session should not mark the UI/UX work complete until all of these are true:

- Timeline move/resize visibly updates while the mouse is still down.
- Transform gizmo updates Inspector/HUD while dragging.
- Numeric fields support horizontal scrub and keyboard-safe text entry.
- Viewport supports standard editor navigation and selection does not conflict with navigation.
- Timeline playback is visually smooth.
- Drag gestures commit one undoable command.
- Dirty state remains domain-specific: level, timeline, event, camera.
- Playwright tests assert at least one mid-drag visual state for each direct manipulation feature.
- The production UI remains mapped to real Sinan modules and data commands, not static prototype-only DOM state.
