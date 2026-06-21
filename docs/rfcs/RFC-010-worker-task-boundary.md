# RFC-010: Worker Task Boundary

Date: 2026-06-21
Status: `adapter-spike-ready`
Related matrix row: `WorkerTaskAdapter` / Comlink

## Background And Evidence

The mature dependency spike validated Comlink in isolation for worker RPC ergonomics and error propagation. The useful evidence is that worker transport can simplify long-running task calls, but it does not define Sinan task semantics, cancellation policy, or editor/runtime ownership.

This RFC accepts a `WorkerTaskAdapter` contract. Comlink may be an implementation candidate behind that adapter; it cannot become the task registry or message schema.

## Sinan-Owned Contract

Sinan owns:

- Task registry with stable task ids, capability flags, input schema, output schema, and diagnostics schema.
- Serialization policy for JSON-compatible payloads and approved transferable objects.
- Timeout, cancellation, retry, and stale-result policy.
- Scheduling policy for task priority, queue limits, and main-thread fallback.
- Diagnostic vocabulary for unsupported worker, failed task, timeout, cancellation, serialization failure, and stale world/editor snapshot.
- Ownership rule that workers receive snapshots or copies, not live editor store or runtime world objects.

The contract must let Sinan run the same task through a worker transport, a fake adapter, or a main-thread fallback.

## Candidate-Owned Responsibilities

Comlink may own:

- Worker proxy creation and method invocation ergonomics.
- MessageChannel and structured clone mechanics as exposed through its API.
- Transferable passing where the task contract explicitly allows it.
- Low-level proxy disposal.
- Candidate-specific stack traces before they are normalized into Sinan diagnostics.

The candidate cannot decide which tasks exist, what data they accept, or how failures affect editor/runtime state.

## Forbidden Leakage

The following are forbidden:

- No Comlink import from task callers outside the worker adapter implementation.
- No worker code that reads editor store, React state, runtime world singletons, Three.js objects, or project truth directly.
- No task payload containing functions, class instances, DOM nodes, Three.js objects, Rapier handles, Web Audio nodes, or Dexie objects.
- No task result that mutates editor state directly.
- No JSON DSL condition or action that calls a worker transport API.

## Adapter Inputs And Outputs

Inputs:

- `WorkerTaskConfig` with worker URL policy, queue limit, timeout defaults, transfer policy, and diagnostics level.
- `TaskRequest` with task id, correlation id, serialized payload, optional transferable ids, timeout, and cancellation token id.
- `TaskRegistryEntry` with input/output validators and fallback capability.

Outputs:

- `TaskResult` with success payload, failed diagnostic, canceled status, timeout status, or stale status.
- `TaskProgressEvent` with correlation id, phase, percent if known, and diagnostic metadata.
- `WorkerDiagnostic` with unsupported worker, load failure, serialization failure, timeout, cancellation, queue overflow, or transport crash.

## Lifecycle, Errors, Diagnostics, And Fallback

Lifecycle states:

- `unavailable`: browser or bundler cannot create the worker.
- `booting`: worker module is loading.
- `ready`: worker can accept registered tasks.
- `busy`: queue or active task count is above a configured threshold.
- `degraded`: worker exists but a capability is disabled.
- `disposed`: worker and proxies are released.

Errors:

- Worker module failed to load.
- Task id is unknown.
- Input or output validation failed.
- Payload is not serializable.
- Transferable ownership was invalid.
- Timeout or cancellation occurred.
- Result was stale because the source snapshot version changed.

Fallback:

The main-thread fallback may execute small or dev-only tasks with a performance warning. It must obey the same input/output validation, timeout, cancellation, and diagnostics contract.

## Validation Strategy

Before implementation can enter mainline, validation must include:

- Contract tests for task registry validation, timeout, cancellation, stale-result handling, and diagnostics.
- Fake adapter tests proving fallback and worker paths produce the same `TaskResult` shape.
- Isolated Comlink smoke for worker load, RPC success, thrown error normalization, transferable payload, timeout, cancellation, and disposal.
- Browser smoke for bundler worker URL behavior and reload cleanup.
- Guard proving worker task code cannot import editor store, runtime world singletons, or Comlink outside the adapter boundary.

## Future Implementation Gate

Future implementation may proceed only when:

- RFC-010 is accepted.
- The compatibility matrix still marks `WorkerTaskAdapter` as `adapter-spike-ready` or stronger.
- The target task family has registered input/output schemas.
- Browser smoke proves worker URL, timeout, cancellation, and transferable behavior.
- The implementation guide lists which tasks are allowed in workers and which remain main-thread only.

## Hold, Reject, And Blocker Rules

Hold if:

- Task registry ownership is not defined.
- A task needs live runtime or editor objects instead of snapshots.
- Cancellation and stale-result policy is missing.

Reject if:

- The transport requires callers to depend on Comlink directly.
- Worker results mutate editor state outside the caller's reducer or command path.

Block if:

- Bundler worker URLs cannot be made deterministic in local and production builds.
- Transferable payload behavior cannot be validated in the browser.
