# WorkerTaskAdapter Browser Smoke Results

Date: 2026-06-22

## Verdict

PASS for browser smoke through `WorkerTaskAdapter`.

This browser smoke exercises the adapter boundary:

```txt
Sinan WorkerTaskAdapter contract -> Comlink RPC -> Web Worker
```

It is not raw Comlink-only evidence.

## Command

```powershell
npm --prefix spikes\mature-dependencies run smoke:browser
```

## Result Summary

- Playwright Chromium suite: PASS.
- Browser smoke tests: 9 passed.
- WorkerTaskAdapter browser summary: `PASS`.
- Console errors: 0.
- Evidence file: `spikes/mature-dependencies/reports/browser-smoke/worker-task-adapter-summary.json`.

## Covered Adapter Behaviors

- Catalog entry exists as `workerTaskAdapter`.
- Worker support is available.
- Adapter boot and load estimation succeed.
- `echo-json` fixture task succeeds.
- `sum-float32` fixture task succeeds with transfer policy evidence.
- Invalid input returns `invalid-input`.
- Slow task returns `timeout`.
- Cancellation returns `cancelled`.
- Dispose returns `disposed`.

## Related Aggregate Evidence

`spikes/mature-dependencies/reports/worker-task-adapter/worker-task-adapter-validation-summary.json` validates this browser summary as part of `smoke:worker-task`.

`smoke:worker-task` also cleans ignored Playwright artifact directories before checking generated artifacts, making the documented final validation sequence repeatable after `smoke:browser`.
