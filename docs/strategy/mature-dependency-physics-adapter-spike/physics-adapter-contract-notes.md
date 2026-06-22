# PhysicsAdapter Contract Notes

Date: 2026-06-22
Branch: `codex/mature-dependency-physics-adapter-spike`

## Contract Shape

The isolated spike defines a Sinan-owned `PhysicsAdapter` contract in `spikes/mature-dependencies/src/physics-adapter/physics-adapter-types.ts`.

Public contract values are limited to:

- Stable Sinan ids: `worldId`, `sceneId`, `bodyId`, `colliderId`, `queryId`, `eventId`
- Sinan-authored descriptors: body kind, mass intent, collider shape intent, layer/mask policy, material intent, fixed-step policy
- World-space snapshots: transforms, velocities, sleeping state
- Normalized events: `collision-start`, `collision-end`, `trigger-enter`, `trigger-exit`
- Normalized query results: raycast/overlap hits with Sinan ids, point, optional normal, optional distance
- Stable diagnostics and statuses

The contract intentionally does not expose Rapier handles, classes, package paths, WASM paths, solver details, contact manifolds, or dependency enum values.

## Ownership Boundary

Sinan owns:

- Descriptor normalization and validation
- Layer and query mask policy
- Fixed-step accumulator policy and catch-up clamp diagnostics
- Result status and diagnostic envelopes
- Fallback/degraded behavior
- Event and query semantics
- Disposal semantics visible to the engine

Rapier owns:

- WASM initialization
- Internal `World` allocation
- Rigid body and collider handle allocation
- Solver, broadphase, narrowphase, contact, sensor, and raycast internals
- Internal disposal of dependency resources

## Implemented Adapters

- `FakePhysicsAdapter` is deterministic and dependency-free. It supports fallback lifecycle, fixed-step sequencing, transform snapshots, unknown-id diagnostics, query misses, and disposal.
- `RapierPhysicsAdapter` uses `@dimforge/rapier3d-compat` inside the adapter boundary only. It maps Sinan ids to internal handles, steps a Rapier world using Sinan fixed-step policy, normalizes collision/trigger events, maps raycast/overlap hits, and frees the world on dispose.

## Validation

Most recent recorded validation for this evidence set:

- `npm --prefix spikes\mature-dependencies run check`: PASS, 24 test files / 93 tests, build PASS with existing large chunk warning.
- `npm --prefix spikes\mature-dependencies run smoke:browser`: PASS, 11 Playwright tests.
- `npm --prefix spikes\mature-dependencies run smoke:physics-adapter`: PASS.
- `git diff --check`: PASS with LF/CRLF warnings only.

## Mainline Gate

This document does not approve Sinan mainline production integration. Mainline adoption still requires a separate architecture gate for authored physics schema, runtime scheduling, persistence/migration, gameplay event consumers, performance budget, and fallback UX.
