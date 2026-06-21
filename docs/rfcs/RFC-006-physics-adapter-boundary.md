# RFC-006: Physics Adapter Boundary

Date: 2026-06-21
Status: `accept-for-contract`
Related matrix row: `PhysicsAdapter` / Rapier JS/WASM

## Background And Evidence

The mature dependency spike evaluated Rapier JS/WASM in isolation. The useful evidence is that Rapier can step a world, move rigid bodies, model colliders, answer raycast and shape queries, and produce contact/trigger-style events without needing Sinan JSON to name Rapier classes.

The evidence is not an approval to add Rapier to the main package. It supports a Sinan-owned `PhysicsAdapter` contract that can later be tested in a narrow adapter spike.

## Sinan-Owned Contract

Sinan owns the authored physics semantics:

- Body descriptors: stable Sinan ids, body kind, mass intent, damping, gravity participation, initial transform, sleep preference, and scene ownership.
- Collider descriptors: shape, trigger flag, material intent, collision layer, query layer, and local transform.
- Fixed-step policy: accumulator, step size, max catch-up steps, and deterministic sampling point used by director/runtime systems.
- Query API: raycast, overlap, sweep, and nearest-hit results expressed in Sinan ids and world-space data.
- Event API: collision start/end, trigger enter/exit, sensor hit, and diagnostic events using Sinan ids.
- Fallback contract: a null or simple kinematic adapter may report unsupported dynamic solving while preserving scene load and timeline completion.

The runtime world can depend on the `PhysicsAdapter` interface, but game data, event conditions, timeline actions, editor state, and migrations cannot depend on Rapier types or handles.

## Candidate-Owned Responsibilities

Rapier may own only the implementation details behind the adapter:

- WASM module initialization and internal world allocation.
- Rigid body, collider, joint, raycast, and narrow-phase/broad-phase handles.
- Step execution and contact manifold calculations.
- Internal memory disposal and handle recycling.
- Numeric solver details and performance characteristics.

Any Rapier handle returned by the candidate must be mapped to an opaque Sinan-side handle before leaving the adapter implementation.

## Forbidden Leakage

The following are forbidden:

- No Rapier import from `src/game`, `src/events`, `src/director`, `src/world`, `src/schemas`, `src/data`, `src/migrations`, or JSON authoring files.
- No Rapier class names, collider names, enum values, WASM paths, or raw handles in `data/**/*.json`.
- No editor panel state that stores Rapier instances.
- No event condition or action that calls Rapier directly.
- No migration that rewrites authored data into Rapier-specific structures.

## Adapter Inputs And Outputs

Inputs:

- `PhysicsWorldConfig` with gravity, fixed-step policy, unit scale, and diagnostics level.
- `PhysicsBodySpec` and `PhysicsColliderSpec` arrays derived from canonical Sinan data.
- Runtime commands for add/remove/update body, set transform, apply impulse, set velocity, and query.

Outputs:

- `PhysicsStepResult` with transforms by Sinan body id.
- `PhysicsEventBatch` with collision/trigger events by Sinan ids.
- `PhysicsQueryResult` with hit id, point, normal, distance, and query diagnostic metadata.
- `PhysicsDiagnostic` with unsupported feature, WASM init, solver, or adapter lifecycle reason.

## Lifecycle, Errors, Diagnostics, And Fallback

Lifecycle states:

- `uninitialized`: adapter has not loaded code or WASM.
- `ready`: adapter can create worlds and step.
- `degraded`: adapter loaded but one feature is unavailable.
- `unsupported`: browser or packaging prevents use.
- `disposed`: world and native resources were released.

Errors must be converted into Sinan diagnostics:

- WASM load failure.
- Body or collider creation failure.
- Invalid layer/query mask.
- Step timeout or max catch-up clamp.
- Query against a disposed world.

Fallback behavior must keep the scene playable enough for editor review. The fallback adapter may ignore dynamic collision, return no query hits, and emit diagnostics, but it must not mutate authored data.

## Validation Strategy

Before any implementation guide may approve mainline work, validation must include:

- Contract tests for body/collider spec conversion using only Sinan data.
- Adapter fake tests for fixed-step sequencing, event normalization, and fallback diagnostics.
- Isolated Rapier smoke for WASM init, rigid body motion, collider query, trigger event, and disposal.
- Browser smoke for bundler output, WASM asset loading, and reload behavior.
- `rg` guard proving no Rapier imports outside the adapter implementation folder.

## Future Implementation Gate

Future implementation may proceed only when:

- RFC-006 is accepted.
- RFC-011 approves the WASM/bundle/dependency policy for Rapier.
- The adapter spike stays outside mainline or has a dedicated implementation guide.
- The compatibility matrix still marks the candidate as `accept-for-contract` or stronger.
- Browser smoke passes on the intended local development environment.

## Hold, Reject, And Blocker Rules

Hold if:

- WASM packaging or dynamic import behavior is unresolved.
- Physics semantics require authoring new Rapier-specific JSON.
- Runtime systems need direct access to Rapier handles.

Reject if:

- The adapter cannot map events and queries back to stable Sinan ids.
- The dependency forces editor or game modules to import Rapier directly.

Block if:

- Browser smoke cannot load the WASM bundle.
- License or distribution constraints conflict with Sinan packaging.
