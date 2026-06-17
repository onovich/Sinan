# Sinan Editor UI/UX Redesign Brief

This document is a design handoff for the next editor UI/UX pass. It is intentionally code-free so it can be used while feature work continues in parallel.

Selected Variant direction and derived implementation style guide:
`docs/editor-ui-ux-variant-style-guide.md`.

## Purpose

Sinan Scene Director should feel like a compact, professional scene direction tool, not a generic web dashboard or a prototype page. The editor must help the author understand:

- Where they are: Edit, Play, or Preview mode.
- What is selected: entity, event, camera shot, timeline, or track.
- What can be done now: transform, interact, scrub, preview, save, undo, redo.
- What changed: dirty data, validation issues, save state, preview state.
- What will affect runtime: timeline actions, camera shots, triggers, debug state.

The redesign should improve clarity and speed without weakening the existing data-first architecture.

## Product Positioning

Sinan is a project-specific 3D scene director/editor for data-driven game scenes. It is not a Unity clone, not a marketing website, and not a general-purpose admin panel.

Desired feel:

- Quiet, dense, and work-focused.
- Cinematic enough to support scene direction and timeline authoring.
- Legible under repeated daily use.
- Technical, but not raw JSON-first.
- Professional tool surface with restrained visual polish.

Avoid:

- Landing-page composition.
- Oversized decorative hero sections.
- Card-heavy SaaS dashboard styling.
- Decorative gradients, floating blobs, or ornamental backgrounds.
- A one-note purple, beige, slate, or brown/orange theme.
- Letting generated prototype code replace existing editor architecture.

## Existing Architecture Constraints

Any future implementation should preserve these constraints:

- `data/**/*.json` remains the source of truth for levels, prefabs, events, timelines, camera shots, and game semantics.
- React owns editor shell, panels, HUD, selection, tabs, forms, and slow state.
- Runtime transforms, animation, physics, AI, timeline sampling, and camera sampling stay outside React.
- Three.js stays isolated to `src/runtime/three/**` and thin viewport glue.
- Editor mutations go through command objects so undo, redo, dirty state, save, and tests stay tractable.
- JSON DSL actions and conditions go through schemas plus registries; no arbitrary script/eval UI path.

Variant or other design tools may produce useful visual or component ideas, but their generated code must be treated as reference material until adapted to these constraints.

## Target Information Architecture

Keep the stable editor shell:

- Top toolbar: brand, mode switch, tool controls, history, save/status, preview/play controls where appropriate.
- Left rail: Hierarchy and Assets.
- Center: 3D Viewport as the dominant workspace.
- Right rail: task-focused panel area.
- Bottom: Timeline / Sequencer.

Recommended right rail structure:

- Tabs: `Inspector`, `Event`, `Camera`, `Debug`.
- Only one primary task panel is open at a time.
- Shared title row pattern: title, selected item, status pill, action menu where needed.
- Advanced/raw JSON views should be collapsible, not the default first read.

Recommended bottom timeline structure:

- Timeline selector and summary in a compact header.
- Playback controls near the ruler/playhead.
- Tracks as lanes on a time ruler, not only as disconnected cards.
- Selected track/item editor either in the right rail or a focused lower details strip.
- Markers should visually encode type: action, camera, sound, subtitle, animation, property.

## Core User Flows

### 1. Select And Adjust Scene Objects

Goal: select an entity, understand what it is, adjust transform, save the level.

Expected UX:

- Hierarchy makes selected entity obvious.
- Viewport shows selection highlight and current tool state.
- Inspector shows identity, prefab, transform, components, and actions.
- Transform editing has numeric fields and nudge controls.
- Dirty state appears near level save and selected entity context.

### 2. Test A Triggered Sequence

Goal: interact with a switch/trigger, play or preview the result, inspect debug state.

Expected UX:

- Play/Preview/Edit mode differences are visually clear.
- Runtime subtitle/audio/camera feedback is visible without covering authoring controls.
- Debug state is readable as a compact event log and summary, not only raw records.
- Timeline playback state and runtime side effects are understandable.

### 3. Author A Timeline Moment

Goal: pick a timeline, scrub time, add/edit a track, preview a camera/sound/subtitle/action marker.

Expected UX:

- Timeline looks and behaves like a lightweight sequencer.
- Playhead, ruler, selected track, and preview status are visible at all times.
- Add track workflow is direct and typed.
- Track editing uses structured controls before raw JSON.
- Validation issues are close to the fields that caused them.

### 4. Author A Camera Shot

Goal: create/select a camera shot, edit key time/FOV/position/look-at, preview through it.

Expected UX:

- Camera panel feels like an authoring tool, not just a form.
- Keyframes have clear current key selection and time.
- `Set Key From View`, `Look At Selected`, and `View Through Camera` are prominent.
- Camera preview state is visually distinct from edit/play state.

## Visual Direction

Suggested baseline:

- Dark professional tool UI with strong viewport contrast.
- Neutral surfaces: charcoal, graphite, near-black viewport.
- Accent colors by semantic role, not decoration:
  - Edit: green/teal.
  - Play: blue.
  - Preview: amber.
  - Invalid/error: red/coral.
  - Dirty/unsaved: amber/orange.
  - Saved/clean: muted green.
- Typography: compact system sans, no negative letter spacing, no viewport-scaled font sizes.
- Panel density: readable but efficient; avoid large empty marketing spacing.
- Border radius: 4-8px for panels and controls.
- Buttons: icon or icon+text for common tools; text buttons for explicit commands.
- Inputs: aligned fields, stable widths, clear focus rings, disabled states that remain legible.
- Status: small consistent pills/dots, not large banners unless blocking.

## Interaction Patterns

- Use segmented controls for mutually exclusive modes and tools.
- Use icon buttons with tooltips for familiar commands:
  - Select, Move, Rotate, Scale.
  - Undo, Redo.
  - Save.
  - Play, Pause, Stop, Step/Start/End.
  - Toggle trigger bounds/helper layers.
- Use tabs for right rail task switching.
- Use collapsible sections for advanced data and raw JSON.
- Use inline validation near fields.
- Keep hover and focus states visible.
- Avoid controls changing size on hover, selection, or validation.

## Variant Design Exploration Brief

Use Variant after the information architecture above is accepted, before implementation starts.

Variant should explore visual and layout directions only. It should not be asked to reproduce the full existing data model or runtime behavior.

Recommended prompt:

```text
Design a professional dark UI for "Sinan Scene Director", a project-specific Web 3D scene direction editor for games.

It is not a landing page. It is a dense authoring tool for selecting 3D scene objects, editing inspector properties, previewing camera shots, testing events, and authoring timeline sequences.

Primary layout:
- Top toolbar with brand, Edit/Play/Preview mode segmented control, transform tools, undo/redo, helper toggle, save/status.
- Left rail with Hierarchy and Assets.
- Center full viewport for a 3D scene, with subtle overlay showing selected object, current mode/tool, and runtime subtitle/audio status.
- Right rail with tabs: Inspector, Event, Camera, Debug.
- Bottom timeline/sequencer with ruler, playhead, track lanes, playback controls, and selected track details.

Design goals:
- Quiet, professional, compact, and work-focused.
- Cinematic scene-director feeling, but not decorative or marketing-like.
- Strong visual hierarchy and readable dense panels.
- Clear semantic status treatment for clean, unsaved, saving, saved, failed, invalid, previewing.
- Edit, Play, and Preview modes should be visually distinct.
- Timeline should feel like a lightweight sequencer, not a list of cards.
- Inspector and Camera panels should look like authoring tools, not raw JSON editors.

Avoid:
- Landing page layout.
- Decorative blobs, generic SaaS cards, huge hero typography.
- Overly colorful gradients.
- A single dominant purple/blue, beige, slate, or brown/orange palette.
- Mobile-first social app styling.

Output requested:
- 3-5 distinct desktop UI directions.
- Include one main editor screen for each direction.
- Include close-up variants for the right rail and bottom timeline.
- Include visual treatment for status pills, selected entity, selected track, validation error, and dirty/unsaved state.
- If code is generated, provide React/HTML/CSS as reference only, with class names and design tokens kept readable.
```

## Variant Output Checklist

When receiving Variant output, capture these items for Codex implementation:

- Screenshot or rendered image of each proposed direction.
- Exported HTML/React/CSS, if available.
- Any design tokens: colors, spacing, radii, shadows, font sizes.
- Toolbar layout details.
- Right rail tab treatment.
- Timeline lane/ruler/playhead treatment.
- Viewport overlay treatment.
- Button/icon style.
- Form/input style.
- Status/validation/dirty state style.
- Responsive or narrow viewport suggestion, if generated.

## Selection Criteria

Choose a Variant direction only if it satisfies most of these:

- The viewport remains the dominant center of gravity.
- The timeline looks like an authoring sequencer.
- The UI can support dense real project data without feeling cramped or broken.
- The style is visually better than the current prototype without becoming ornamental.
- Mode and state differences are clear at a glance.
- It can be implemented with scoped React/CSS changes.
- It does not require replacing the editor store, command system, data schemas, or runtime boundaries.

Reject or heavily adapt outputs that:

- Look like a marketing page or portfolio page.
- Hide the timeline or make it secondary.
- Depend on generated fake data structures that conflict with Sinan JSON.
- Overuse decorative gradients or card stacks.
- Make raw JSON the primary editing experience.
- Require a component library migration before value is visible.

## Codex Implementation Plan After Variant

Once a Variant direction is selected:

1. Extract design tokens into CSS variables.
2. Refactor editor shell layout only as needed.
3. Add right rail tabs while keeping existing panel components and props.
4. Rework toolbar controls and mode/tool affordances.
5. Improve panel composition in place.
6. Redesign timeline visual structure without changing timeline data contracts.
7. Add or update smoke tests for layout, mode switching, status visibility, validation, and timeline interaction.
8. Verify with browser screenshots at desktop and narrow viewport sizes.

Do not import generated Variant code wholesale. Treat it as design reference and selectively port patterns that fit the existing architecture.

## Open Questions

- Should the right rail selected tab persist across reloads?
- Should timeline selected track details live in the bottom panel or right rail?
- Should Debug be a right rail tab, bottom drawer, or viewport overlay log?
- Should Play mode temporarily hide authoring rails for a cleaner showcase path?
- Should raw JSON be available per panel as an advanced drawer?

## References

- Public Variant site: https://variant.com/
- Project UI/UX plan: `docs/phase-11-editor-ui-ux.md`
- Post-MVP plan Phase 11: `docs/post-mvp-development-plan.md`
