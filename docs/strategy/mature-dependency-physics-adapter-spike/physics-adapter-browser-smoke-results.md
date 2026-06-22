# PhysicsAdapter Browser Smoke Results

Date: 2026-06-22
Branch: `codex/mature-dependency-physics-adapter-spike`

## Command Results

```powershell
npm --prefix spikes\mature-dependencies run smoke:browser
```

Result: PASS.

Observed Playwright result:

- 11 tests passed.
- PhysicsAdapter browser smoke passed through the browser catalog entry `physicsAdapter`.
- Console errors: 0.

```powershell
npm --prefix spikes\mature-dependencies run smoke:physics-adapter
```

Result: PASS.

Aggregate report:

- `spikes/mature-dependencies/reports/browser-smoke/physics-adapter-summary.json`
- `spikes/mature-dependencies/reports/physics-adapter/physics-adapter-validation-summary.json`

## Browser Coverage

The browser smoke exercises `PhysicsAdapter` through `RapierPhysicsAdapter`, not the raw `runRapierSmoke` baseline.

Covered behavior:

- Browser catalog entry availability
- Rapier compat WASM initialization through the adapter
- World creation through Sinan `PhysicsWorldConfig`
- Body and collider creation through normalized Sinan specs
- Fixed-step world stepping
- Collision and trigger event normalization
- Raycast and overlap query mapping
- Deterministic fake fallback boot
- Disposal
- Contract cleanliness scan for dependency-owned details in public results

## Current Summary

The committed browser summary records:

- `supported`: true
- `bootOk`: true
- `worldOk`: true
- `bodyColliderOk`: true
- `stepOk`: true
- `eventOk`: true
- `queryOk`: true
- `fallbackOk`: true
- `disposeOk`: true
- `contractClean`: true

## Artifact Policy

`smoke:physics-adapter` removes ignored Playwright artifact directories before its generated artifact guard.

Explicit artifact absence after aggregate smoke:

- `spikes/mature-dependencies/test-results`: absent
- `spikes/mature-dependencies/playwright-report`: absent

Only small JSON summaries are intended for commit. Traces, videos, screenshots, browser binaries, `dist`, and coverage remain uncommitted.
