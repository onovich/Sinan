# Sinan Editor UI Interaction Audit

Date: 2026-06-18

This audit reviews `docs/ui-reference/sinan-editor-static-prototype.html` as a front-end reference for the existing Sinan editor. The prototype is useful only if its interactions map back to current project concepts: level entities, event schemas, timelines, camera shots, runtime debug state, editor commands, dirty state, and save paths.

Do not import the prototype HTML directly into the app. Port the behavior into React/editor state in small pieces after the active feature session finishes.

## Engine-Standard Baseline

The target interaction model follows common modern editor expectations from Unity, Unreal, and Godot, while keeping Sinan's data-first architecture:

- Selection is synchronized between Hierarchy, Viewport, and Inspector.
- World transform changes happen through viewport picking/gizmo behavior or Inspector numeric scrub, not by dragging Hierarchy rows.
- Hierarchy row drag means reorder/reparent only. The prototype supports reorder; reparent should wait for real hierarchical level commands.
- Numeric inputs support horizontal value scrub without exposing slider UI.
- Viewport navigation supports right-drag pan, wheel dolly/zoom, Shift+wheel horizontal pan, and Ctrl+wheel vertical pan.
- Timeline playback controls drive timecode and playhead.
- Timeline scrub, clip move, and clip resize are direct manipulation interactions.
- Dirty state is domain-specific: level, event, timeline, and camera changes must not share one ambiguous dirty flag.
- Read-only runtime/debug UI can be selectable and inspectable, but should not mutate data.

## Interaction Matrix

| UI area | Prototype support | Production mapping | Notes |
| --- | --- | --- | --- |
| Top toolbar modes | Edit, Play, and Preview update shell state and live status. Transform tools disable outside Edit. | `EditorApp` mode state and preview/playback commands. | Keep the visible disabled state. It prevents false affordances during preview. |
| Transform tools | Select, Move, Rotate, Scale are mutually exclusive. | Editor tool state consumed by the viewport controller. | Prototype moves objects only; rotate/scale are visual mode references until production gizmos exist. |
| History | Undo/Redo buttons are present and show preview-only feedback. | Command history stack. | Do not fake undo in production. Wire only after command-backed edits exist. |
| Helper toggle | Trigger bounds can be shown/hidden in the viewport. | Viewport helper visibility state. | Good candidate for early implementation because it is low risk. |
| Save/status | Save Level clears level dirty state. Level, timeline, event, and camera dirty states are separated. | `editorStatus.ts`, level/event/timeline/camera save paths. | This was corrected so transform edits no longer mark timeline dirty. |
| Hierarchy | Click or Enter/Space selects an entity, updates viewport highlight, and updates Inspector summary. Drag entity rows to reorder them; child/component rows move with the owning entity block. | `HierarchyPanel`, `selectedEntityId`, `InspectorPanel`, viewport selection, future reorder command. | Hierarchy drag-to-move is intentionally rejected. Dragging here changes order only and marks level hierarchy dirty. |
| Assets | Click or Enter/Space selects an asset and reports it in live status. | `AssetPanel` selected asset metadata. | Asset drag-to-create should wait until entity creation and prefab placement commands are real. |
| Viewport picking | Left-click a scene object selects it and syncs Hierarchy/Inspector. | Runtime picking through the editor viewport boundary. | Replace DOM hit testing with runtime picking. Keep Three.js isolated at the allowed boundary. |
| Viewport transform | Left-drag selected/movable object changes mock X/Z position and Inspector position fields. | `TransformEntityCommand` or equivalent command-backed transform update. | Prototype math is illustrative only. Production needs camera-plane/gizmo math. |
| Viewport navigation | Right-drag pans, wheel zooms, Shift+wheel pans horizontally, Ctrl+wheel pans vertically. | Editor camera/navigation controller. | This matches common editor muscle memory and should be preserved. |
| Right rail tabs | Inspector, Event, Camera, and Debug tabs switch without layout jump. | Right rail state or existing panel composition. | Keep tabs as a stable module boundary. |
| Inspector numeric fields | Transform numeric fields support horizontal scrub and mark level dirty. | Reusable numeric scrub input plus level transform command. | No visible slider. This should feel like Unity Inspector numeric drag. |
| Component cards | Component cards can be selected by click or keyboard. | Selected component/action detail state. | Selection alone should not mark dirty. |
| Advanced JSON | Native `details` disclosure expands raw JSON. | Advanced/debug JSON panel. | Keep it secondary; schema forms are primary. |
| Event tab | Event fields mark event dirty; Apply Event marks event dirty; Save Event clears the mock validation issue. | Event schema editing, validation, and event save path. | Validation display should come from schema/Zod issues in production. |
| Camera tab | Camera numeric scrub marks camera dirty; Set From View marks camera dirty; Save Shot clears the camera dirty marker. | `CameraShotPanel` and camera shot save path. | Do not route camera key edits into timeline dirty unless the timeline item itself changes. |
| Debug tab | Runtime log rows are selectable and update live status. | `EventDebugPanel` sampled read-only runtime state. | Debug UI should remain read-only unless a replay/jump/filter command is explicitly implemented. |
| Timeline playback | Start, Play/Pause, Stop, and End drive timecode and playhead. | `TimelinePanel` preview controls and `DirectorSystem` preview/playback. | Playback should not commit timeline data. |
| Timeline scrub | Dragging ruler, empty lane area, or playhead changes current time. | Timeline seek/scrub state. | Scrub should be preview state, not an edit. |
| Timeline clip edit | Clip body drag moves; left/right edge handles show `ew-resize` cursor and resize clip duration; selected track details update. | Track/item update commands. | Clip edits mark timeline dirty only. Edge affordance must be visually distinct from body move. |
| Responsive shell | Desktop, narrow, and interaction screenshots are stored in `docs/ui-reference`. | CSS/layout implementation pass. | Keep dimensions stable; allow scroll rather than shrinking text with viewport units. |

## Remaining Gaps Before Production Port

- Real 3D picking and transform gizmos need implementation against the runtime/editor viewport boundary.
- Rotate and scale tools need real gizmo behavior before they should be treated as complete.
- Undo/redo should remain visual until the affected edit paths are command-backed.
- Hierarchy reparent should wait for hierarchical level data and commands. Reorder is represented in the prototype and should be command-backed in production.
- Asset drag-to-place should wait for prefab/entity creation commands and placement validation.
- Timeline snapping, multi-select, copy/paste, and keyboard shortcuts are useful later, but should not block this visual replacement.
- The static prototype should not become a separate product surface. It is a reference for tokens, layout, interaction semantics, and handoff mapping.

## Acceptance For Handoff

This design reference is usable for later replacement work if the production port preserves these constraints:

- Keep `data-design-id` or equivalent stable mapping while porting so UI regions remain traceable.
- Replace prototype DOM state with existing React/editor state.
- Route edits through command objects and domain save paths.
- Preserve domain-specific dirty state.
- Keep generated Variant code as reference only.
- Avoid decorative interactions that do not map to current Sinan data or editor workflows.
