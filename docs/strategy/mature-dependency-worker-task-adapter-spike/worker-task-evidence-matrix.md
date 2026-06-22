# WorkerTaskAdapter Evidence Matrix

Date: 2026-06-22

## Verdict

PASS after repair validation.

This matrix maps the planner/checker expected evidence lanes to committed artifacts. It is isolated spike evidence only and does not approve mainline integration.

| Evidence lane | Status | Primary artifact | Notes |
| --- | --- | --- | --- |
| Contract vocabulary | PASS | `spikes/mature-dependencies/src/worker-task/worker-task-types.ts` | Defines lifecycle, result statuses, diagnostics, queue policy, transfer policy, snapshot refs, cancellation tokens, and adapter surface. |
| Fixture registry and validators | PASS | `spikes/mature-dependencies/src/worker-task/task-registry.ts` | Fixture tasks are validator-owned and transport-free. |
| Fake/main-thread fallback adapter | PASS | `spikes/mature-dependencies/src/worker-task/fake-worker-task-adapter.ts` | Uses shared executor and returns normalized `TaskResult` fallback evidence. |
| Comlink/Web Worker adapter | PASS | `spikes/mature-dependencies/src/worker-task/comlink-worker-task-adapter.ts` | Comlink usage is isolated to adapter and worker module. |
| Worker host | PASS | `spikes/mature-dependencies/src/worker-task/comlink-worker-task-host.ts` | Host delegates task semantics to the shared registry executor. |
| Failure semantics | PASS | `spikes/mature-dependencies/src/worker-task/registry-task-executor.ts` | Covers timeout, cancellation, stale snapshot, queue overflow, invalid input/output, and handler diagnostics. |
| Transfer and serialization policy | PASS | `spikes/mature-dependencies/src/worker-task/registry-task-executor.ts` | Payloads must be JSON-serializable; binary movement is declared through transferable descriptors. |
| Browser smoke through adapter | PASS | `spikes/mature-dependencies/reports/browser-smoke/worker-task-adapter-summary.json` | Real Playwright Chromium evidence through `WorkerTaskAdapter`, not raw Comlink. |
| Aggregate smoke and guards | PASS | `spikes/mature-dependencies/reports/worker-task-adapter/worker-task-adapter-validation-summary.json` | Runs typecheck, worker-task tests, boundary guard, browser summary validation, ignored Playwright artifact cleanup, and artifact guard. |
| Scope guard | PASS | `docs/strategy/mature-dependency-worker-task-adapter-spike/final-worker-task-adapter-spike-report.md` | Changed files stay under `spikes/mature-dependencies/**` and this docs directory. |

## Validation Commands

```powershell
npm --prefix spikes\mature-dependencies run check
npm --prefix spikes\mature-dependencies run smoke:browser
npm --prefix spikes\mature-dependencies run smoke:worker-task
git diff --check
```

## Repeatability Note

`smoke:browser` may create the ignored Playwright directory `spikes/mature-dependencies/test-results`. `smoke:worker-task` now removes ignored Playwright artifact directories before the generated artifact guard, so the documented final validation order is repeatable.
