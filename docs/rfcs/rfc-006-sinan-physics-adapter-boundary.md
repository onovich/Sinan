# RFC-006: Sinan Physics Adapter Boundary

> Status: Draft for Phase 21.5 contract gate
> Date: 2026-06-21
> Related strategy: `docs/strategy/engine-maturity-gap-and-sourcing-strategy.md`
> Applicable mature dependencies: Rapier or another browser-capable physics engine

---

## 1. Summary

Sinan should not hand-write a full production physics engine. It should own the physics contract and allow mature physics libraries to sit behind a replaceable adapter.

```txt
Sinan Physics Contract
  collider authoring, layers, triggers, queries, gameplay policy, validation, fallback

Physics Backend / Mature Dependency
  broadphase, narrowphase, raycast, sweep, overlap, rigid body or character solving
```

Physics integration is a future implementation phase. Phase 21.5 only defines the source-of-truth and adapter boundary so later phases can evaluate Rapier or another library without letting dependency details leak into game data, events, director, or editor state.

## 2. Background

Future Sinan gameplay will need:

- trigger zones
- interaction volumes
- ground and obstacle queries
- camera collision and line-of-sight queries
- simple kinematic character or vehicle controller support
- deterministic diagnostics for missing or invalid colliders
- fallback behavior when a physics backend is unavailable

These problems are common engine infrastructure. A mature library may solve them better than a custom implementation, but Sinan must own the semantic contract and validation surface.

## 3. Goals

This RFC defines:

- Sinan Physics Source Of Truth ownership.
- The future adapter seam for mature physics libraries.
- Data and runtime concepts that must remain backend-neutral.
- POC Plan stages for isolated evaluation.
- Acceptance criteria for fallback, diagnostics, and contract tests.

## 4. Non-goals

This RFC does not:

- Install Rapier or any physics dependency.
- Implement `PhysicsSystem`.
- Add collider authoring UI.
- Migrate existing gameplay to physics queries.
- Add vehicle, ragdoll, cloth, or fluid simulation.
- Let physics handles enter JSON source data.
- Permit direct Three.js imports from physics, gameplay, world, events, director, data, schemas, or migrations.

## 5. Source Of Truth

Sinan-owned source data will define physics semantics. Future data may live in prefab, level, or dedicated physics schema files, but backend handles and engine-native objects must never become source-of-truth.

Candidate source-of-truth concepts:

```txt
ColliderId
ColliderShape
ColliderLayer
CollisionMask
TriggerPolicy
PhysicsMaterialRef
PhysicsQueryRef
CharacterControllerPolicy
```

Rules:

- JSON data stores stable semantic IDs, shape descriptors, layers, masks, and policy names.
- Runtime physics handles are transient and not saved.
- Backend-specific classes, WASM handles, pointers, or world IDs do not enter data files.
- Events and actions reference semantic query or trigger IDs, not backend objects.
- Fallback behavior must be deterministic when the adapter is disabled or unavailable.

## 6. Contract Concepts

### 6.1 PhysicsAdapter

A backend-neutral interface owned by Sinan.

Responsibilities:

- create and dispose a physics world from validated Sinan data
- register colliders and triggers
- run fixed-step or externally stepped simulation when enabled
- answer raycast, sweep, overlap, and ground queries
- report trigger enter, stay, and exit events
- expose diagnostics

Limits:

- The adapter must not own gameplay policy.
- The adapter must not write official JSON data.
- The adapter must not expose backend handles to Event, Director, Timeline, or editor panels.

### 6.2 PhysicsWorldSnapshot

A deterministic diagnostic snapshot for tests and reports.

Contents:

- loaded collider count
- trigger count
- layer and mask table
- backend name and version
- disabled/fallback status
- warnings and blocking errors

### 6.3 PhysicsQuery

A backend-neutral query request.

Examples:

```txt
raycast(world, origin, direction, maxDistance, mask)
overlapBox(world, center, halfExtents, mask)
sweepCapsule(world, from, to, radius, height, mask)
```

Rules:

- Query results return semantic entity and collider IDs.
- Backend handles stay internal.
- Missing backend behavior must be defined by fallback policy.

### 6.4 PhysicsEvent

Trigger and collision events emitted through Sinan-owned routing.

Rules:

- Events are generated from adapter output.
- Gameplay code consumes Sinan event records, not backend callbacks.
- Event ordering and dedupe policy must be testable.

## 7. Boundary

Recommended flow:

```txt
data/prefabs + data/levels
  -> Sinan physics schema validation
  -> PhysicsSystem facade
  -> PhysicsAdapter
  -> mature physics backend
  -> semantic query results and events
  -> Sinan gameplay/event routing
```

Sinan keeps:

- collider schema and validation
- layer and mask policy
- trigger semantics
- gameplay event routing
- fallback policy
- contract tests
- diagnostics and reports

Physics backend may provide:

- broadphase and narrowphase
- shape intersection
- raycast, sweep, overlap
- rigid body or kinematic solving
- WASM or worker-backed execution

## 8. Physics POC Plan

### POC-1: Contract Fixture Without Dependency

Define a small fixture with boxes, triggers, layers, masks, and expected query results.

Acceptance:

- fixture can be represented without a physics library
- expected raycast, overlap, and trigger results are deterministic
- fallback behavior is documented

### POC-2: Isolated Rapier Or Mature Backend Spike

Run the same fixture outside Sinan mainline source with a candidate backend.

Acceptance:

- license, bundle size, browser support, WASM distribution, and async init are recorded
- backend handles do not leak into fixture expectations
- results can be compared against the contract fixture

### POC-3: Adapter Dry Run

Add a future adapter candidate behind Sinan's contract in a branch or spike.

Acceptance:

- data validation remains Sinan-owned
- query results use semantic IDs
- backend can be disabled and fallback still runs
- contract tests and smoke checks prove the adapter is removable

### POC-4: Gameplay Slice

Only after adapter dry-run passes, connect one small gameplay query such as an interaction trigger or camera obstruction query.

Acceptance:

- no broad gameplay migration
- failure produces deterministic diagnostics
- editor save and undo are not affected

## 9. Acceptance Criteria

A physics backend can enter future Sinan planning only if:

- Sinan keeps Source Of Truth ownership for collider data, layers, triggers, queries, and gameplay policy.
- The backend is hidden behind `PhysicsAdapter` or an equivalent Sinan-owned facade.
- Backend handles never enter JSON, editor save state, Director, Timeline, Event, or action contracts.
- Fallback behavior exists for disabled or failed backend initialization.
- Contract tests cover at least raycast, overlap, trigger enter/exit, and disabled backend behavior.
- Browser support, license, bundle size, WASM loading, and worker compatibility are documented.
- Boundary checks prevent Three.js and backend-specific imports from semantic layers.

## 10. Rejected Approaches

Rejected:

- storing Rapier handles or backend body IDs in Sinan data
- letting backend callbacks mutate gameplay state directly
- requiring physics initialization before editor data can load
- replacing Sinan event routing with physics callback routing
- adding a hard dependency before contract fixtures exist
- importing Three.js inside physics semantics

## 11. Open Questions For Future Implementation

- Should the first implementation use a fixed-step simulation or query-only mode?
- Which Phase 23 gameplay slice should justify the first physics adapter POC?
- Should physics diagnostics be folded into the existing validation report or a dedicated runtime report?
- What fallback should camera collision use when the adapter is disabled?
