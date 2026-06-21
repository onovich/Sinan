# RFC-007: Audio System Boundary

Date: 2026-06-21
Status: `accept-for-contract`
Related matrix row: `AudioSystem` / Web Audio API

## Background And Evidence

The mature dependency spike validated an audio command pipeline with a fake `AudioContext`. That evidence is useful for sequencing, cue normalization, and diagnostic shape, but it does not prove browser unlock, autoplay, decode, latency, or spatial behavior.

The contract therefore accepts Web Audio API as the first implementation candidate behind a Sinan-owned `AudioSystem`. Optional wrappers such as howler or Tone may only be reconsidered after this boundary is stable; they cannot become the authored semantic layer.

## Sinan-Owned Contract

Sinan owns:

- `AudioCue` ids, source asset references, start policy, stop policy, loop intent, gain intent, and timeline binding.
- Bus and mixer model: master, music, effects, ambience, dialogue, and per-scene override semantics.
- Timeline completion behavior: audio failure cannot deadlock director or event playback.
- Spatial audio intent: attach-to-entity id, position source, distance model intent, and listener source.
- User preference policy: mute, volume, accessibility captions, and persisted settings.
- Diagnostics vocabulary for locked context, unsupported browser, missing asset, decode failure, interrupted cue, and silent fallback.

Sinan data describes intent. It does not describe Web Audio node graphs.

## Candidate-Owned Responsibilities

The Web Audio implementation may own:

- `AudioContext` creation, resume, suspend, and close behavior.
- GainNode, PannerNode, AudioBufferSourceNode, AudioWorklet, and analyser internals.
- Decode scheduling and browser-specific media format behavior.
- Autoplay unlock handshake after a user gesture.
- Low-level clock alignment between Web Audio time and the runtime timeline.
- Resource disposal for buffers and active nodes.

The candidate must report state through Sinan diagnostics instead of exposing browser objects.

## Forbidden Leakage

The following are forbidden:

- No `AudioContext`, node classes, browser media element references, or decoded buffers in JSON, editor state, event actions, or director state.
- No event DSL that calls Web Audio methods directly.
- No timeline action that depends on a browser node id.
- No persisted save or project data that stores decoded audio buffers.
- No production dependency on a third-party audio wrapper before an RFC update.

## Adapter Inputs And Outputs

Inputs:

- `AudioSystemConfig` with sample-rate preference, bus defaults, unlock policy, and diagnostics level.
- `AudioCueSpec` with Sinan cue id, asset id, bus id, gain, loop, spatial intent, and timeline binding.
- Runtime commands: preload, play, stop, pause bus, resume bus, set bus gain, set listener transform, and dispose scene audio.

Outputs:

- `AudioCommandResult` with accepted, queued, ignored, failed, or fallback status.
- `AudioCueEvent` with cue started, cue ended, cue interrupted, cue looped, or cue failed.
- `AudioDiagnostic` with locked context, unsupported browser, missing asset, decode failure, autoplay denied, latency warning, or silent fallback reason.
- `AudioSnapshot` for editor/HUD display using Sinan cue and bus ids only.

## Lifecycle, Errors, Diagnostics, And Fallback

Lifecycle states:

- `locked`: browser has not allowed playback.
- `running`: context can play scheduled cues.
- `suspended`: context exists but is paused.
- `degraded`: some features such as spatial audio or decode format are unavailable.
- `silent`: fallback mode accepts commands but produces no sound.
- `disposed`: scene audio resources are released.

Errors:

- Unlock denied or never attempted.
- Unsupported format or failed decode.
- Asset missing from the asset registry.
- Cue scheduled after scene disposal.
- Spatial target missing or stale.
- Browser latency or clock drift outside tolerance.

Fallback:

The silent audio system must accept timeline commands, emit diagnostics, and complete cues according to declared duration or immediate failure policy. This keeps scene review deterministic when a browser cannot play sound.

## Validation Strategy

Before implementation can enter mainline, validation must include:

- Contract tests for `AudioCue` normalization and bus routing.
- Fake `AudioContext` tests for command sequencing and fallback completion.
- Browser smoke for unlock/autoplay, decode success/failure, mute/volume persistence, spatial panner update, and scene disposal.
- Regression guard proving no Web Audio browser object leaks into JSON or editor state.
- Timeline tests proving an audio failure does not stall director progression.

## Future Implementation Gate

Future implementation may proceed only when:

- RFC-007 is accepted.
- Browser smoke policy is satisfied for unlock/autoplay and decode behavior.
- Audio assets have a registry contract that does not require Web Audio details in authored data.
- The compatibility matrix still marks `AudioSystem` as `accept-for-contract` or stronger.
- Any optional wrapper is evaluated as an implementation detail, not as a data model.

## Hold, Reject, And Blocker Rules

Hold if:

- Browser unlock/autoplay behavior has not been smoked in a real browser.
- Audio asset registry ownership is unresolved.
- Timeline semantics require Web Audio node ids.

Reject if:

- A wrapper requires authored cues to use wrapper-specific options.
- The implementation cannot provide a silent fallback that preserves director completion.

Block if:

- Production packaging cannot exclude dev-only audio diagnostics.
- Browser support makes required baseline playback impossible for the target platform.
