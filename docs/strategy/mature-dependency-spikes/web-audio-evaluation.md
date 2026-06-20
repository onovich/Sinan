# Web Audio API Evaluation

Date: 2026-06-20
Candidate: Web Audio API
Package(s): browser native API, no npm runtime dependency
Official docs: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
License: Web standard / browser platform API
Install command: none
Environment tested: Node 24.13.1 with fake AudioContext, TypeScript 6.0.3, Vitest 4.1.9, Vite 8.0.16

## 1. Summary

Decision: accept-for-adapter-spike

Web Audio API is the correct low-level browser audio foundation. Sinan should still own AudioCue semantics, mixer/bus policy, unlock diagnostics, timeline sync, fallback, and validation.

## 2. What Was Tested

- AudioContext support detection.
- Unlock/resume path with fake AudioContext.
- One-shot buffer source scheduling.
- GainNode master and SFX mixer route.
- PannerNode spatial route.
- Unsupported-environment diagnostic path.

## 3. Results

- Node: passed with a fake AudioContext test double.
- Vite dev: not started. No port 5174 usage.
- Vite build: passed.
- Browser: native AudioContext runtime requires a real user gesture and was not launched in this run.
- Playwright: blocked by missing Chromium 1228 and install timeout.

## 4. Integration Boundary

Sinan-owned:

- `AudioCue` schema.
- Audio bus and mixer policy.
- Timeline cue scheduling semantics.
- Unlock state and diagnostic surface.
- Missing asset fallback.

Candidate-owned:

- AudioContext.
- GainNode.
- PannerNode.
- AudioBufferSourceNode.
- Browser autoplay policy behavior.

Adapter boundary:

```txt
Sinan AudioSystem contract
  -> WebAudioAdapter
  -> browser Web Audio API
```

## 5. Risks

- License: browser platform API, no package license issue.
- Bundle size: no runtime dependency added.
- WASM/native: none.
- Browser support: autoplay and user gesture unlock must be first-class diagnostics.
- Maintenance: browser standard, stable.
- Data/source-of-truth: no audio semantics should be stored as Web Audio node graph state.
- Fallback: missing asset and locked context states need non-crashing fallback.

## 6. Required Follow-up

- Define Sinan-owned AudioCue, bus, volume, mute, spatial, and timeline sync contracts.
- Add real browser unlock smoke after Playwright browser install is available.
- Decide how decode failures and missing assets appear in asset reports.

## 7. Recommendation

Proceed to a future AudioSystem adapter spike. Do not introduce howler.js or Tone.js as the primary game audio semantic layer in this phase.
