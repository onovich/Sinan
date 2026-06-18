# Sinan Editor UI Design Parity Requirements

Audience: mainline UI/logic implementation session.

Purpose: make the production editor visually and interactively match the approved static reference as closely as possible, while preserving the real React/data/runtime architecture.

Reference files:

- Static reference page: `docs/ui-reference/sinan-editor-static-prototype.html`
- Selected Variant reference image: `docs/ui-reference/variant-selected-editor-reference.png`
- Current commercial UX checklist: `docs/editor-ui-commercial-ux-checklist.md`
- Style guide: `docs/editor-ui-ux-variant-style-guide.md`
- Interaction audit: `docs/editor-ui-ux-interaction-audit.md`

## Non-Negotiable Rule

Do not freehand the redesign from memory.

The current production page should be judged against the static reference through fixed-state screenshots and module-level visual comparison. The goal is not “similar dark UI”; the goal is parity in shell geometry, density, status vocabulary, row rhythm, panel hierarchy, timeline feel, and interaction affordance.

## Can The Static Page Be Used Directly?

Do not replace the production editor with the static HTML page wholesale.

Reason:

- The static page uses fake DOM state.
- It bypasses React state, editor store, command history, save paths, validation, runtime picking, and the Three canvas.
- It would regress real logic already implemented in the main project.

Allowed:

- Copy visual tokens.
- Copy CSS patterns.
- Copy layout geometry.
- Copy component structure as a reference.
- Copy interaction semantics and cursor/affordance rules.

Required approach:

> Visuals should be ported from the static reference into the existing React components; logic must remain in the production editor.

## Required Design Parity Mode

Add a development-only design review mode to the production app.

Recommended URL:

```text
http://127.0.0.1:5174/?designReview=1
```

When enabled, the production app must force a deterministic UI state:

- Mode: `Edit`
- Active tool: `Move` or `Select`, whichever is used by the current reference capture
- Selected entity: `switch_a`
- Right rail tab: `Inspector`
- Timeline: `tl_open_gate`
- Timeline time: `2.25s` if possible, otherwise a documented fixed time
- Trigger/helper bounds: enabled
- Timeline selected clip: `track_camera_gate_reveal`
- Dirty/status sample: level clean, timeline dirty/preview state visible, event/camera status visible
- Runtime overlays visible where applicable

The purpose is to make screenshot comparison stable. Without this mode, visual review becomes subjective and state-dependent.

## Golden Screenshot Baseline

Use the static page as the golden reference.

Minimum viewports:

- `1440x960`
- `1256x900`
- `1024x768`

Minimum screenshot regions:

- Full shell
- Toolbar
- Left rail
- Viewport overlay region
- Right rail
- Timeline/sequencer

The real Three canvas does not need pixel-perfect content parity with the fake static viewport. However, these must match:

- viewport frame geometry
- overlay placement
- selected tag style
- telemetry style
- runtime HUD placement
- helper/status treatment

If using visual diff, mask the inner canvas if necessary, but do not mask the viewport overlays.

## Exact Geometry Targets

Match the static reference unless a real runtime constraint prevents it.

Desktop:

- Toolbar height: `40px`
- Left rail width: `240px`
- Right rail width: `300px`
- Timeline height: `220px`
- Toolbar/rails/timeline use 1px separators
- Document-level scroll should be disabled
- Panels scroll internally

Typography:

- UI font: Inter/system sans
- Technical ids/time/coordinates: monospace
- Toolbar labels: uppercase, compact
- Panel headings: uppercase, compact
- No viewport-scaled font sizes

Color/token source:

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
--sinan-radius-sm: 2px;
--sinan-radius-md: 4px;
```

## Component Mapping

Port the static visual shape into the current React modules.

| Static reference surface | Production target |
| --- | --- |
| `.prototype-frame` | `.editor-shell` |
| `.toolbar` | `.editor-topbar` |
| `.brand` | `.topbar-brand` |
| `.segmented` / `.segmented-button` | `.segmented-control` / mode/tool buttons |
| `.status-pill` | production status pills |
| `.left-rail` | `.editor-panel-left` |
| `.tree-row` | hierarchy row button |
| `.asset-row` | asset row/selectable control |
| `.viewport` / `.viewport-overlay` | `.viewport-region` overlays around real canvas |
| `.right-rail` | `.editor-panel-right` |
| `.tabs-header` / `.tab-label` | `.right-rail-tabs` / `.right-rail-tab` |
| `.panel-inspector` | `InspectorPanel` |
| `.panel-event` | `EventInspector` |
| `.panel-camera` | `CameraShotPanel` |
| `.panel-debug` | `EventDebugPanel` |
| `.sequencer` | `.timeline-shell` / `TimelinePanel` |
| `.clip` / `.clip-resize-handle` | `.timeline-clip` / `.clip-resize-handle` |
| `.track-details` | selected track detail strip |

## Module Requirements

### Toolbar

Must match:

- Yellow triangle mark.
- Brand text: `SINAN DIRECTOR`.
- Compact segmented controls.
- Mode and tool active state inside controls, not as oversized page decoration.
- Status pills use dot + text.
- TL / EV / CAM status pills visible when relevant.

Must not:

- Add large mode banners.
- Let toolbar exceed 40px on desktop.
- Hide dirty/save status inside panels only.

### Left Rail

Hierarchy:

- Rows must have clear hover/focus/selected states.
- Selected row uses yellow left rail and active background.
- Click/keyboard selection syncs Viewport and Inspector.
- Cursor must communicate interactivity.
- Reorder may be enabled only if command-backed.

Assets:

- Asset rows must be selectable, not static list items.
- Selected asset uses blue/focus treatment.
- Selection shows metadata or detail state.
- Drag-to-place should remain unavailable until placement command exists.

### Viewport

Must keep real Three canvas.

Must match reference overlays:

- selected entity tag
- mode/tool/timeline telemetry
- helper/runtime line
- runtime subtitle/audio HUD when active

Required interactions:

- left-click picking
- right-drag viewport navigation where supported
- wheel zoom/dolly
- Shift+wheel horizontal pan
- Ctrl+wheel vertical pan
- tool-specific cursor feedback

### Right Rail

Tabs:

- Inspector/Event/Camera/Debug must visually match reference density.
- Dirty/invalid dots must appear on tab labels.
- Tab focus and keyboard navigation must be visible.

Panels:

- Use summary cards.
- Use compact sections.
- Keep Advanced JSON secondary.
- Avoid generic form-page feel.

Inspector:

- Transform triplets must support text entry and numeric scrub.
- Apply/Revert or immediate command behavior must be clear.
- Component cards should be selectable and compact.

Event:

- Trigger/condition/action cards.
- Validation adjacent to offending field/card.
- Event dirty/save state isolated from other domains.

Camera:

- Shot/key summary.
- Camera numeric scrub.
- Preview Shot does not mark dirty.
- Save Shot clears camera dirty state.

Debug:

- Read-only but inspectable.
- Log rows selectable.
- No debug selection marks data dirty.

### Timeline / Sequencer

The timeline must feel like a sequencer, not a form plus a list.

Required layout:

- compact controls/status row
- ruler/playhead/lane area
- selected track detail strip

Required interactions:

- Play/Pause/Stop/Start/End drive playhead/status.
- Ruler click/drag scrubs time.
- Playhead drag scrubs time.
- Empty lane click/drag scrubs time.
- Clip body drag moves start time.
- Clip left/right edge drag resizes duration.
- Clip body cursor: `grab`.
- Clip edge cursor: `ew-resize`.
- Selected clip updates selected track details.
- Clip move/resize marks timeline dirty only.

If clip move/resize is not implemented yet:

- Do not make clip body look draggable.
- Keep resize handles visually muted/disabled.
- Or implement the command-backed interaction first.

## Visual Diff Gate

Before declaring the UI pass complete, run region-level screenshot comparison.

Suggested thresholds:

- Toolbar: very strict
- Left rail: strict
- Right rail: strict
- Timeline: strict
- Viewport canvas: mask inner canvas if needed
- Viewport overlays: strict

Failure examples:

- Toolbar height differs.
- Row rhythm differs.
- Timeline clip height/spacing differs.
- Right rail tabs differ in density.
- Status pills use different colors or shape.
- A region is visually close but interactions/cursors are missing.

## Required Tests

Add or update smoke tests for:

- Design review mode loads deterministic state.
- Toolbar mode switch updates mode.
- Tool switch disables outside Edit.
- Hierarchy selection syncs Inspector and Viewport.
- Asset selection updates selected asset state.
- Transform numeric scrub changes value and marks level dirty.
- Event edit marks event dirty only.
- Camera edit marks camera dirty only.
- Timeline scrub does not dirty data.
- Timeline clip body drag marks timeline dirty.
- Timeline edge resize marks timeline dirty.
- Play/Pause/Stop/Start/End update playhead and playback state.
- Viewport helper toggle changes helper rendering.
- No document-level scroll on desktop.

## Completion Definition

This task is complete only when:

- The production app in `?designReview=1` visually matches the static reference by region.
- The real app keeps all production logic and data flow.
- Each module has complete interaction affordance and feedback.
- The checklist in `docs/editor-ui-commercial-ux-checklist.md` has no P0 gaps remaining.
- Screenshot evidence is stored under `docs/ui-reference/`.
- Smoke tests cover the major interaction loops.

