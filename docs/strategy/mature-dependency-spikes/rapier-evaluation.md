# Rapier JS Evaluation

Date: 2026-06-20
Candidate: Rapier JS
Package(s): `@dimforge/rapier3d@0.19.3`, `@dimforge/rapier3d-compat@0.19.3`
Official docs: https://rapier.rs/docs/user_guides/javascript/getting_started_js/
License: Apache-2.0
Install command: `npm install @dimforge/rapier3d`; compat follow-up `npm install @dimforge/rapier3d-compat`
Environment tested: Node 24.13.1, npm 11.8.0, TypeScript 6.0.3, Vitest 4.1.9, Vite 8.0.16

## 1. Summary

Decision: accept-for-adapter-spike

Rapier is viable as a future PhysicsAdapter backend, but this run found a packaging difference that must be handled by Phase 21.5 policy. The base `@dimforge/rapier3d` package installed, but direct Node ESM import failed because package internals import extensionless module paths. The official compat package initialized and passed the automated smoke.

## 2. What Was Tested

- Base package import diagnostic.
- Compat package import and async init.
- World step with fixed and dynamic rigid bodies.
- Collider creation.
- Collision event path.
- Sensor/trigger event path.
- Raycast query.
- Vite browser production bundle with the base package probe excluded from the bundle graph.

## 3. Results

- Node: compat package passed world step, collision, trigger, and raycast smoke. Base package import produced `ERR_MODULE_NOT_FOUND` in Node ESM.
- Vite dev: not started. No port 5174 usage.
- Vite build: passed after the base package probe was marked `@vite-ignore`. Before that, Vite attempted to bundle base Rapier WASM and failed.
- Browser: production bundle generated. Runtime browser interaction was not launched.
- Playwright: blocked. Playwright 1.61 expected Chromium 1228, and browser install timed out after 304s.

## 4. Integration Boundary

Sinan-owned:

- Physics schema.
- Collision layers.
- Trigger/contact event mapping.
- Raycast query contract.
- Timestep policy.
- Fallback AABB trigger path.

Candidate-owned:

- Broadphase/narrowphase.
- Rigid body simulation.
- Collider shape math.
- Raycast implementation.
- Contact/intersection calculation.

Adapter boundary:

```txt
Sinan PhysicsAdapter contract
  -> Rapier adapter
  -> Rapier world
```

## 5. Risks

- License: Apache-2.0, clear.
- Bundle size: compat package materially increases browser bundle size. The spike bundle main chunk was 2,375,080 bytes before gzip.
- WASM/native: base package requires a WASM asset strategy; compat inlines compatibility behavior but is larger.
- Browser support: requires async init and explicit fallback diagnostics.
- Maintenance: official Rapier JS bindings, acceptable.
- Data/source-of-truth: Rapier handles must never enter Sinan JSON or entity data.
- Fallback: AABB trigger fallback should remain available.

## 6. Required Follow-up

- Phase 21.5 must decide base package plus WASM asset policy versus compat package.
- Define a Sinan-owned `PhysicsAdapter` contract before production integration.
- Keep Rapier object handles internal to the adapter.
- Add real browser Playwright smoke after Chromium 1228 can be installed.

## 7. Recommendation

Proceed to a future adapter spike. Do not wire Rapier into mainline runtime until WASM distribution, async init, and adapter contract decisions are written down.

