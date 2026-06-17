# Phase 10 Runtime Effects Notes

This document records the current runtime/editor effect integration.

## Subtitle HUD Bridge

- `DirectorSystem` continues to emit `subtitle.show` as a renderer-neutral `DirectorCommand`.
- `EditorApp` consumes `subtitle.show` commands into slow React HUD state.
- The HUD is rendered over the viewport as `data-testid="runtime-subtitle"`.
- Timeline scrub shows a subtitle only when the scrub time is inside the subtitle track range.
- Timeline stop and out-of-range scrub clear the subtitle HUD.

## Side-Effect Boundary

- The subtitle bridge does not mutate runtime transforms, scene objects, or game state.
- Preview scrub still uses `previewMode: true`, so destructive action tracks are not executed during unsafe scrub.
- `sound.play` commands are consumed by an editor-safe audio bridge that creates an `Audio` element from the asset manifest URL.
- Audio playback surfaces a short viewport status for queued, played, blocked, or missing sounds, so browser autoplay failures are visible instead of silent.
- Camera and transform action effects are still pending Phase 10 follow-up work.
