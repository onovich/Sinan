# AudioSystem Contract Notes

Date: 2026-06-22
Branch: `codex/mature-dependency-audio-system-spike`

## Contract Boundary

The spike keeps Sinan-owned AudioSystem state data-first:

- `AudioCueSpec`, bus specs, timeline bindings, spatial intent, listener state, preferences, command results, cue events, snapshots, and diagnostics are JSON-shaped contract values.
- Web Audio objects are owned only by `WebAudioSystemAdapter`.
- Silent fallback accepts commands and returns deterministic diagnostics/events so timeline/director callers do not wait forever when browser audio is unavailable, locked, or decode fails.
- Reports and snapshots expose cue ids, bus ids, lifecycle states, diagnostic codes, and event types; they do not expose `AudioContext`, node graphs, decoded buffers, browser node ids, or DOM handles.

## Adapter Ownership

`src/audio-system/audio-system-types.ts` defines the public surface. It intentionally has no Web Audio types.

`src/audio-system/audio-cue-registry.ts` normalizes AudioCue and bus policy without browser imports.

`src/audio-system/silent-audio-system-adapter.ts` is deterministic fallback infrastructure for tests, unsupported browsers, locked contexts, and decode fallback.

`src/audio-system/web-audio-system-adapter.ts` owns the browser audio context, gain graph, panner graph, buffer decode/cache, source lifecycle, listener updates, and low-level disposal.

## Guard Evidence

`npm run smoke:audio-system` runs:

- `npm run typecheck`
- `npm run test -- audio-system`
- production boundary guard for forbidden imports, dynamic code, and browser object leakage outside WebAudio-owned files
- browser summary validation from `reports/browser-smoke/audio-system-summary.json`
- generated artifact cleanup for ignored Playwright directories: `test-results` and `playwright-report`
- generated artifact guard proving those directories are absent after cleanup

The aggregate result is written to `reports/audio-system/audio-system-validation-summary.json`.
