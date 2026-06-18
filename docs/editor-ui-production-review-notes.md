# Sinan Editor Production UI Review Notes

Date: 2026-06-18

Audience: the AI/session currently implementing the main editor logic/UI.

This review compares the current production editor at `http://127.0.0.1:5174/` with the static reference prototype:

- Reference: `docs/ui-reference/sinan-editor-static-prototype.html`
- Current review screenshot: `docs/ui-reference/main-editor-current-review.png`
- Style guide: `docs/editor-ui-ux-variant-style-guide.md`
- Interaction audit: `docs/editor-ui-ux-interaction-audit.md`
- Art handoff: `docs/editor-ui-art-adjustment-handoff.md`
- Detailed commercial UX checklist: `docs/editor-ui-commercial-ux-checklist.md`
- Design parity requirements: `docs/editor-ui-design-parity-requirements.md`

## Verdict

The production page has started moving in the right direction. It already uses the dark token palette, fixed editor shell, left/center/right/bottom layout, right rail tabs, status pills, real Three viewport, and timeline clips.

It is not yet visually equivalent to the reference prototype. The current page feels like the reference was approximated from memory: the broad layout exists, but the final editor quality is weaker in density, hierarchy rhythm, viewport overlay treatment, right rail composition, and timeline sequencing polish.

Do not replace the production editor by importing the static prototype wholesale. The prototype is fake DOM state and fake interaction logic. The production editor already has real project data, Three runtime, save paths, validation, dirty state, and timeline callbacks. Direct replacement would throw those away.

The correct path is to port the prototype's visual language and component shapes into the existing React components, module by module.

## What Already Matches

- Shell structure is close: toolbar, left rail, viewport, right rail, timeline.
- Color tokens are mostly present in `src/styles.css`.
- Toolbar has mode, tool, history, helper, save/status groups.
- Right rail has Inspector/Event/Camera/Debug tabs with warning/error dots.
- Timeline has track lanes, playhead, clip blocks, and edge handle elements.
- Document-level scrolling is contained; the app uses the full viewport.
- The production viewport correctly keeps the real Three canvas instead of the prototype's fake DOM scene.

## Major Gaps To Fix

### 1. Toolbar Branding And Status Density

Current issue:

- Brand reads `SINAN SCENE DIRECTOR`; the selected direction uses `SINAN DIRECTOR`.
- The toolbar feels busier and slightly heavier than the reference. The active mode styling currently uses a full-width bottom glow on the topbar, which was not part of the selected direction.
- Status area only shows `Save` + `Clean`; it does not separate level/timeline/event/camera/live status as clearly as the prototype.

Requested adjustment:

- Use compact brand treatment closer to the prototype: yellow triangle mark + `SINAN DIRECTOR`.
- Remove or soften the topbar mode underline/glow; active state should live inside segmented controls.
- Keep project save as a command, but expose domain-specific status pills where relevant: level, timeline, event/camera dirty indicators, live/preview state.
- Keep toolbar text compact and uppercase; avoid increasing button height beyond the 40px bar.

Files:

- `src/editor/EditorApp.tsx`
- `src/styles.css`
- `src/editor/editorStatus.ts`

### 2. Viewport Visual Hierarchy

Current issue:

- The real 3D viewport is functional, which is good, but it visually dominates with bright flat geometry. The reference page reads more like an editor surface: muted grid, selected tag, helper telemetry, and subtitle/runtime HUD are clearly layered.
- The production `EDITOR VIEWPORT / Level loaded` badge in the bottom-left feels like a placeholder label rather than runtime/editor telemetry.

Requested adjustment:

- Keep the real Three canvas.
- Add or strengthen editor overlays: selected tag, mode/tool/timeline telemetry, helper state, runtime subtitle/audio HUD.
- Reduce placeholder wording. Prefer technical telemetry like `FPS`, `runtime`, `helpers`, `timeline @ time`, or actual runtime state.
- Ensure selection highlight and trigger helper rendering use the same yellow/green/blue vocabulary as the reference.

Files:

- `src/editor/EditorApp.tsx`
- `src/editor/Viewport.tsx`
- `src/styles.css`
- runtime viewport glue under the existing allowed boundary.

### 3. Left Rail Needs Prototype-Level Row Semantics

Current issue:

- Hierarchy row styling is close, but the current row truncation makes names look cramped and less intentional.
- Hierarchy rows do not expose the reference's tree-like affordance or reorder behavior yet.
- Asset rows are close, but not selectable in the same explicit visual way as the reference.

Requested adjustment:

- Keep compact rows, selected yellow left rail, prefab badge, and monospace ids.
- Add keyboard/focus states matching the prototype.
- Add hierarchy reorder only when a real command/data path exists. Do not fake reorder with DOM-only mutation.
- Asset selection should have a blue focus/selection outline and metadata preview when backed by state.

Files:

- `src/editor/panels/HierarchyPanel.tsx`
- `src/editor/panels/AssetPanel.tsx`
- `src/styles.css`

### 4. Right Rail Still Feels Like Forms, Not Tool Panels

Current issue:

- Inspector panel is functional, but the visual grouping is heavier than the prototype. It reads as nested forms rather than compact editor property sections.
- Component cards include form controls directly and occupy more vertical space than the reference.
- Event and Camera tabs need the same summary-card and command-row polish as Inspector.

Requested adjustment:

- Use compact summary cards at the top of each tab.
- Use section headers and dense field rows, not large form blocks.
- Keep Advanced JSON/details secondary.
- Validation should sit next to the field/action that caused it.
- Component/action cards should be selectable/detail-oriented; editing controls can appear in the selected card detail area.

Files:

- `src/editor/panels/InspectorPanel.tsx`
- `src/editor/panels/EventInspector.tsx`
- `src/editor/panels/CameraShotPanel.tsx`
- `src/editor/panels/EventDebugPanel.tsx`
- `src/styles.css`

### 5. Timeline Is Structurally Right But Visually Not There Yet

Current issue:

- The current timeline is a hybrid of form controls and sequencer lanes. It works, but visually it does not yet feel like the reference's compact sequencer.
- Header consumes too much attention with form controls.
- Track editor appears as a large right block inside the timeline and competes with lanes.
- Clip colors are present, but lane/clip rhythm is not as precise as the prototype.
- Edge handles exist, but ensure they show a distinct `ew-resize` cursor and can later drive duration updates.

Requested adjustment:

- Rebalance timeline into three clear zones:
  - controls/status row
  - ruler + lanes
  - selected track detail strip
- Keep add/save/edit controls compact and secondary.
- Make clip body drag and edge resize affordances visually distinct.
- Track detail should look like the prototype's selected-track strip, not a full form-first editor unless expanded.
- Scrub and playback should be preview state, not dirty edits.

Files:

- `src/editor/panels/TimelinePanel.tsx`
- `src/styles.css`
- timeline smoke tests

### 6. Interaction Parity Is Incomplete

Current issue:

- Production has more real data plumbing than the prototype, but not all reference interactions are visible or complete.
- Numeric fields still look like ordinary inputs; they should support horizontal scrub when command-backed.
- Timeline direct manipulation needs to go beyond clip-looking buttons. If move/resize is not implemented yet, do not visually imply full direct manipulation without a working path.

Requested adjustment:

- Add a reusable numeric scrub input behavior for transform/camera/timeline numeric fields.
- Add viewport navigation parity: right-drag pan, wheel zoom/dolly, Shift+wheel horizontal pan, Ctrl+wheel vertical pan, where supported by the viewport controller.
- Timeline clip body/edge direct manipulation should route to timeline commands.
- Hierarchy reorder should route to a level/hierarchy command if supported. If not supported, leave it as future work but do not imply it is complete.

## Can We Directly Use The Static Prototype?

Short answer: no, not as a direct replacement for production.

Why:

- It uses fake DOM state and fake data.
- It bypasses React state, editor store, commands, save paths, validation, runtime picking, and Three canvas integration.
- It contains prototype-only interaction shortcuts that would regress real logic.
- It is intentionally in `docs/ui-reference`, not `src`.

What can be reused directly:

- Design tokens and color values.
- CSS patterns for compact panels, tabs, rows, status pills, timeline clips, resize handles, and field triplets.
- Markup shape as a component reference.
- Interaction semantics from `docs/editor-ui-ux-interaction-audit.md`.

Recommended compromise:

- Do not copy the whole HTML page.
- Port one surface at a time:
  1. Toolbar/status shell.
  2. Left rail rows.
  3. Right rail tab/card styling.
  4. Timeline sequencer polish.
  5. Numeric scrub and direct-manipulation behaviors.
- When a prototype behavior has no production command/data path, either defer it or implement the command first.

## Acceptance Checklist For The Next Revision

- First viewport visually resembles the reference: compact dark chrome, left hierarchy, real viewport, right tabs, bottom sequencer.
- No prototype-only handoff text appears in production UI.
- Toolbar remains 40px and does not feel crowded.
- Right rail reads as a tool inspector, not a generic form panel.
- Timeline reads as a sequencer, not a form plus a list.
- Clip body and edge resize cursor/handles are distinct.
- Dirty state is domain-specific: level, event, timeline, camera.
- Selection stays synced between hierarchy, viewport, and inspector.
- All visible interactions map to real callbacks/commands or are intentionally disabled.
- Smoke tests cover layout containment, status visibility, mode/tool state, and timeline playback/scrub.
