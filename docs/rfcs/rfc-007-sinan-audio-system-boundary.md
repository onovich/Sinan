# RFC-007: Sinan Audio System Boundary

> Status: Draft for Phase 21.5 contract gate
> Date: 2026-06-21
> Related strategy: `docs/strategy/engine-maturity-gap-and-sourcing-strategy.md`
> Applicable mature dependencies: Web Audio wrappers, spatial audio helpers, or browser audio utilities

---

## 1. Summary

Sinan needs an audio system for cues, music, ambience, timeline sync, gameplay feedback, mixer policy, browser unlock, diagnostics, and fallback. The source-of-truth and scheduling contract should belong to Sinan, while mature audio libraries may provide implementation detail behind a removable adapter.

```txt
Sinan Audio Contract
  AudioCue, AudioBus, mix policy, timeline/event actions, unlock policy, diagnostics

Audio Backend / Mature Dependency
  Web Audio graph, decode/cache, playback, spatialization, ducking, effects
```

Phase 21.5 defines the boundary only. It does not add sound assets, runtime playback, mixer UI, dependency installation, or production audio behavior.

## 2. Background

Future Sinan gameplay and showcase work will need:

- interaction sound effects
- ambience and music
- timeline-synchronized cues
- subtitle and audio alignment
- pause and ducking behavior
- browser autoplay unlock handling
- asset fallback for missing audio
- deterministic diagnostics in tests and smoke runs

Browser audio has enough platform-specific behavior that Sinan should not casually scatter `AudioContext` usage across gameplay or UI. The engine needs a first-party contract and a replaceable backend.

## 3. Goals

This RFC defines:

- Audio Source Of Truth ownership.
- A backend-neutral audio adapter boundary.
- Browser unlock and fallback policy.
- POC Plan stages for headless and browser audio validation.
- Acceptance criteria for future implementation.

## 4. Non-goals

This RFC does not:

- Add audio assets.
- Implement `AudioSystem`.
- Install Howler, Tone, WebAudio wrappers, or any other dependency.
- Add mixer UI or authoring panels.
- Add spatial audio or DSP effects.
- Replace Timeline, Event, Director, or Runtime UI contracts.
- Allow arbitrary script callbacks in audio actions.

## 5. Source Of Truth

Sinan source-of-truth audio concepts should be data-first and backend-neutral.

Candidate future data:

```txt
data/audioCues/*.json
data/audioMixes/*.json
data/timelines/*.json
data/events/*.json
data/assets.manifest.json
```

Candidate semantic concepts:

```txt
AudioCueId
AudioAssetRef
AudioBusId
AudioMixSnapshot
AudioPlaybackPolicy
AudioTimelineCue
AudioUnlockPolicy
```

Rules:

- AudioCue IDs are stable Sinan IDs.
- Audio assets are referenced through the asset manifest, not direct backend URLs.
- Timeline and Event actions reference cue IDs and mix policy names.
- Browser `AudioContext`, nodes, buffers, and backend handles are runtime-only.
- Missing audio must produce deterministic diagnostics and fallback or mute behavior.
- Audio actions must route through Sinan registries, not arbitrary callbacks.

## 6. Contract Concepts

### 6.1 AudioSystem

A future Sinan-owned facade that receives gameplay, event, timeline, and UI audio requests.

Responsibilities:

- resolve AudioCue IDs
- apply mix and ducking policy
- schedule playback
- coordinate pause and resume
- expose diagnostics
- decide fallback behavior

Limits:

- It must not be owned by React editor state.
- It must not expose backend nodes to gameplay or data.
- It must not replace Timeline or Event source-of-truth.

### 6.2 AudioAdapter

A backend implementation hidden behind the Sinan contract.

Responsibilities:

- initialize browser audio backend
- decode and cache audio assets
- play, stop, fade, and loop cues
- report backend errors
- expose unlock status

Limits:

- It does not own AudioCue data.
- It does not write project data.
- It does not decide gameplay policy.

### 6.3 AudioCommand

A serializable or testable request from Sinan systems to the audio facade.

Examples:

```txt
playCue(cueId, sourceEntityId, policy)
stopCue(instanceId, fadeOut)
setBusVolume(busId, value, duration)
applyMixSnapshot(snapshotId, transition)
```

Rules:

- Commands reference semantic IDs.
- Commands can be logged for diagnostics.
- Commands can be consumed by a headless adapter in tests.

### 6.4 BrowserUnlockPolicy

Browser audio playback must handle user gesture requirements.

Rules:

- Runtime can report locked, unlocking, unlocked, and failed states.
- Gameplay can request audio before unlock, but playback behavior must be deterministic.
- The fallback policy must choose queue, drop, muted playback, or diagnostic-only behavior per cue type.

## 7. Boundary

Recommended flow:

```txt
Timeline / Event / Gameplay / Runtime UI
  -> AudioCommand
  -> Sinan AudioSystem
  -> AudioAdapter
  -> Web Audio or mature backend
  -> diagnostics and playback state
```

Sinan keeps:

- AudioCue schema
- asset reference policy
- mix bus policy
- timeline/event command semantics
- browser unlock policy
- fallback and mute policy
- validation and diagnostics

Audio backend may provide:

- decode and cache
- Web Audio node graph
- playback scheduling
- spatialization
- ducking and fade helpers
- effects implementation

## 8. Audio POC Plan

### POC-1: Headless Audio Command Fixture

No browser audio dependency. Produce commands from a small event or timeline fixture and capture a deterministic log.

Acceptance:

- AudioCue references resolve through Sinan-owned IDs
- missing cue and missing asset diagnostics are deterministic
- fallback or mute behavior is recorded
- no `AudioContext` is required

### POC-2: Browser Unlock And Playback Spike

Use a candidate backend or direct Web Audio in an isolated branch or spike to test unlock, playback, stop, loop, and fade behavior.

Acceptance:

- browser support and autoplay behavior are documented
- license and bundle size are documented if a dependency is used
- backend can run behind an `AudioAdapter`
- failed initialization falls back without breaking gameplay

### POC-3: Timeline Sync Fixture

Connect a future audio facade to a small timeline cue fixture.

Acceptance:

- Timeline remains the source of cue timing
- audio backend does not own timeline state
- pause/resume behavior is deterministic
- headless tests can verify command order

### POC-4: Runtime UI And Subtitle Coordination

Only after the first three POCs pass, coordinate one prompt, subtitle, or objective cue with audio.

Acceptance:

- Runtime UI receives state through its own ViewModel contract
- audio does not drive UI source-of-truth
- fallback remains visible in diagnostics

## 9. Acceptance Criteria

An audio backend can enter future Sinan planning only if:

- Sinan keeps Source Of Truth ownership for AudioCue data, mix policy, timeline/event references, unlock policy, and fallback behavior.
- The backend is hidden behind `AudioAdapter` or an equivalent Sinan-owned facade.
- Backend handles never enter JSON, editor save state, Timeline, Event, Director, or Runtime UI contracts.
- Headless command tests exist before browser playback is required.
- Browser unlock behavior is explicit and testable.
- Missing assets and failed initialization produce deterministic diagnostics.
- License, bundle size, browser support, and asset loading behavior are documented.

## 10. Rejected Approaches

Rejected:

- scattering `AudioContext` calls across gameplay systems
- letting a library own cue IDs or timeline state
- requiring audio initialization before data validation
- putting arbitrary callbacks in audio data
- using direct URLs instead of asset manifest references
- treating missing audio as a hard crash in normal editor or smoke flows

## 11. Open Questions For Future Implementation

- Should audio cues share the asset budget report or have a dedicated audio report?
- What is the minimum cue schema for Phase 24 gameplay?
- Which browser unlock behavior should be used during automated smoke tests?
- Should spatial audio wait until spherical world and camera systems mature?
