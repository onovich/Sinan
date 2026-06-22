# AudioSystem Browser Smoke Results

Date: 2026-06-22
Branch: `codex/mature-dependency-audio-system-spike`

## Summary

Status: PASS

Browser evidence is produced through the Sinan-shaped `AudioSystem` adapter path, not through the raw Web Audio prerequisite smoke.

Primary artifacts:

- `spikes/mature-dependencies/src/browser-smoke/audio-system-adapter.pw.ts`
- `spikes/mature-dependencies/src/audio-system/audio-system-browser-smoke.ts`
- `spikes/mature-dependencies/reports/browser-smoke/audio-system-summary.json`
- `spikes/mature-dependencies/reports/audio-system/audio-system-validation-summary.json`

## Browser Smoke Coverage

The Playwright smoke validates:

- browser audio output is supported
- adapter boot and unlock reach running lifecycle
- generated buffer preload succeeds
- play starts through `WebAudioSystemAdapter`
- declared-duration completion event is emitted
- spatial position intent creates the adapter path
- bus gain and mute commands complete
- listener transform command completes
- decode failure falls back through silent fallback diagnostics
- scene disposal closes adapter-owned resources
- public result/snapshot JSON does not expose Web Audio object names

Current JSON summary records:

- `status`: `PASS`
- `decision`: `PASS`
- `consoleErrors`: `[]`
- `boot/unlock/preload/play`: `true/true/true/true`
- `completion/spatial/bus/listener`: `true/true/true/true`
- `fallback/dispose/contract-clean`: `true/true/true`

## Commands

Latest successful browser command:

```powershell
npm --prefix spikes\mature-dependencies run smoke:browser
```

Latest successful aggregate command:

```powershell
npm --prefix spikes\mature-dependencies run smoke:audio-system
```

The full browser harness currently runs 10 Playwright tests and includes the AudioSystem adapter smoke entry in the catalog baseline.
