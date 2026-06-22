# WorkerTaskAdapter Round 09 Aggregate Smoke Report

Date: 2026-06-22

## Verdict

PASS for isolated WorkerTaskAdapter aggregate smoke.

This is evidence for the isolated spike only. It does not approve mainline integration or production use.

## Scope

Included:

- WorkerTaskAdapter contract and fixture registry under `spikes/mature-dependencies/src/worker-task/**`.
- Fake/main-thread fallback adapter.
- Comlink/Web Worker adapter and worker host.
- Browser smoke through WorkerTaskAdapter, not raw Comlink.
- Boundary guard for worker-task imports and dynamic code usage.

Excluded:

- Mainline `src/**`, `data/**`, `tests/**`, `public/**`.
- Root package/config changes.
- Browser binaries, `dist`, `coverage`, `test-results`, traces, screenshots, and videos.

## Commands

```powershell
npm --prefix spikes\mature-dependencies run check
npm --prefix spikes\mature-dependencies run smoke:browser
npm --prefix spikes\mature-dependencies run smoke:worker-task
```

## Results

- `npm --prefix spikes\mature-dependencies run check`: PASS
  - 16 Vitest files passed.
  - 51 tests passed.
  - Vite build passed with the existing large chunk warning.
- `npm --prefix spikes\mature-dependencies run smoke:browser`: PASS
  - 9 Playwright tests passed.
  - `worker-task-adapter.pw.ts` passed through real Chromium.
- `npm --prefix spikes\mature-dependencies run smoke:worker-task`: PASS
  - Typecheck passed.
  - Worker-task unit tests passed.
  - Worker-task boundary guard passed.
  - WorkerTaskAdapter browser summary was PASS with zero console errors.
  - Generated artifact guard passed for `test-results`, `playwright-report`, and `coverage`.

## Evidence

- `spikes/mature-dependencies/reports/browser-smoke/worker-task-adapter-summary.json`
- `spikes/mature-dependencies/reports/worker-task-adapter/worker-task-adapter-validation-summary.json`

WorkerTaskAdapter browser summary confirms:

- catalog entry available
- Worker supported
- boot/load success
- echo task success
- sum task success with transfer policy
- invalid-input path
- timeout path
- cancellation path
- dispose path
- adapter boundary: `Sinan WorkerTaskAdapter contract -> Comlink RPC -> Web Worker`

## Boundary Check

The aggregate smoke script scans `spikes/mature-dependencies/src/worker-task/**`.

Allowed Comlink import sites:

- `comlink-worker-task-adapter.ts`
- `comlink-worker-task.worker.ts`

The scan found no forbidden `three`, `dexie`, `rapier`, mainline runtime/data imports, `eval`, or `Function` usage in the worker-task spike.

## Debug Notes

The first browser smoke attempt failed only because the baseline catalog-key assertion had not been updated for `workerTaskAdapter`. After adding the expected key, the second browser smoke run passed all 9 tests.

Playwright created `test-results` during the failed/pass runs; the directory was removed and is not part of committed artifacts.
