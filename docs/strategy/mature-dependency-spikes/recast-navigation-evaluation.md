# recast-navigation-js Evaluation

Date: 2026-06-20
Candidate: recast-navigation-js
Package(s): `recast-navigation@0.43.1`
Official docs: https://www.npmjs.com/package/recast-navigation
License: MIT
Install command: `npm install recast-navigation`
Environment tested: Node 24.13.1, TypeScript 6.0.3, Vitest 4.1.9, Vite 8.0.16

## 1. Summary

Decision: hold-for-phase-21-5-rfc

recast-navigation-js passed an isolated install/import/init/navmesh/query smoke, but it should not become a hard dependency until Sinan defines a NavigationAdapter contract and bundle/WASM policy. It is a strong P1 candidate, not a P0 mainline requirement.

## 2. What Was Tested

- Package import.
- Async WASM init.
- High-level `generateSoloNavMesh`.
- Simple plane fixture.
- `NavMeshQuery.computePath`.
- `NavMeshQuery.findClosestPoint`.
- Vite production browser bundle.

## 3. Results

- Node: passed after the test fixture used a larger plane, explicit bounds, zero agent radius, and low region thresholds.
- Vite dev: not started. No port 5174 usage.
- Vite build: passed with `optimizeDeps.exclude: ["recast-navigation"]` in the isolated spike config.
- Browser: production build emitted `recast-navigation.wasm-compat` chunk of 726,299 bytes.
- Playwright: blocked by missing Chromium 1228 and install timeout.

## 4. Integration Boundary

Sinan-owned:

- Navigation schema.
- Agent size/slope/climb policy.
- Path query contract.
- Area semantics.
- Debug visualization.
- Fallback waypoint/grid navigation.

Candidate-owned:

- Recast navmesh generation.
- Detour navmesh query.
- WASM implementation details.

Adapter boundary:

```txt
Sinan NavigationAdapter contract
  -> recast-navigation-js adapter
  -> Recast/Detour WASM
```

## 5. Risks

- License: MIT, clear.
- Bundle size: WASM compat chunk is large for early runtime.
- WASM/native: requires explicit browser bundler and distribution policy.
- Browser support: Vite may need dependency prebundle exclusion.
- Maintenance: active enough, but package README also points to a newer pure JS navcat alternative.
- Data/source-of-truth: generated navmesh must not replace Sinan navigation source data.
- Fallback: grid/waypoint fallback should remain first-class until gameplay demand justifies navmesh.

## 6. Required Follow-up

- Phase 21.5 must decide NavigationAdapter contract and whether navmesh is needed before showcase.
- Decide offline versus runtime navmesh generation.
- Add browser Playwright smoke after Chromium 1228 is available.
- Compare recast-navigation-js against simpler fallback and navcat before hard dependency.

## 7. Recommendation

Hold for Phase 21.5 RFC. Keep this spike as evidence that recast-navigation-js works, but do not introduce it to mainline runtime now.
