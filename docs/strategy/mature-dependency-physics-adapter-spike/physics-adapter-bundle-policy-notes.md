# PhysicsAdapter Bundle Policy Notes

Date: 2026-06-22
Branch: `codex/mature-dependency-physics-adapter-spike`

## RFC-011 Position

RFC-011 requires mature WASM/browser dependencies to be isolated behind adapter boundaries, measured through browser smoke, and paired with fallback and artifact policy.

This spike follows that policy by keeping Rapier usage inside `RapierPhysicsAdapter` and browser smoke evidence only. It does not authorize direct imports from Sinan game/runtime/editor mainline modules.

## Package Choice

Selected browser path:

- `@dimforge/rapier3d-compat`

Reason:

- Existing raw Rapier browser smoke already proves compat package WASM init, world step, raycast, contact event, and trigger event in Playwright Chromium.
- The raw smoke intentionally skips forcing the base `@dimforge/rapier3d` package into the Vite browser graph.

Policy note:

- Base package import remains a bundle risk and must not be used as the browser implementation path without a separate RFC-011 review.

## Bundle Impact

Latest `npm --prefix spikes\mature-dependencies run check` build output:

- Build PASS.
- Existing large chunk warning remains present.
- The main bundle grew after adding PhysicsAdapter browser smoke because the isolated spike catalog includes multiple mature dependency demos in one test app.

This is acceptable for the isolated spike. It is not acceptable evidence that production Sinan should put Rapier into a monolithic mainline bundle.

Future mainline gate must decide:

- dynamic import boundary
- route or feature-level loading
- fallback when WASM init fails
- browser compatibility messaging
- memory and disposal lifecycle
- CI browser binary and cache policy

## Fallback Strategy

The spike includes `FakePhysicsAdapter` for deterministic fallback and tests:

- Lifecycle: `degraded`
- Result status: `fallback`
- Diagnostics: `fallback-used`
- Fixed-step sequencing without WASM
- Stable snapshots and query misses
- Disposal behavior

This fallback is a contract and diagnostics proof, not a production gameplay physics substitute.

## Boundary Guard

`smoke:physics-adapter` runs a boundary guard that checks:

- forbidden runtime imports are absent from physics adapter files
- Rapier imports remain in the Rapier adapter ownership file
- dynamic code execution is absent
- dependency-owned terms do not leak outside allowed adapter/smoke verifier files
- Playwright artifact directories are cleaned before final guard

Current result: PASS.

## Navigation Hold

Navigation remains outside this spike. RFC-013 still holds NavigationAdapter and recast-navigation work. No PhysicsAdapter result should be interpreted as NavigationAdapter approval.
