# Web Workers + Comlink Evaluation

Date: 2026-06-20
Candidate: Web Workers + Comlink
Package(s): `comlink@4.4.2`
Official docs: https://github.com/GoogleChromeLabs/comlink
License: Apache-2.0
Install command: `npm install comlink`
Environment tested: Node 24.13.1 worker_threads, TypeScript 6.0.3, Vitest 4.1.9, Vite 8.0.16

## 1. Summary

Decision: accept-for-adapter-spike

Comlink is viable for a future WorkerTaskAdapter spike. It should be treated as RPC ergonomics only, not as a plugin SDK or direct editor-store access path.

## 2. What Was Tested

- Worker RPC through Comlink.
- Transferable `ArrayBuffer` payload.
- Worker error surfaced as structured diagnostic text.
- Worker terminate/release path.
- Browser worker bundle generation.

## 3. Results

- Node: passed using `worker_threads` and Comlink node adapter.
- Vite dev: not started. No port 5174 usage.
- Vite build: passed and emitted a dedicated worker chunk of 4,165 bytes.
- Browser: actual Worker runtime not launched in this run.
- Playwright: blocked by missing Chromium 1228 and install timeout.

## 4. Integration Boundary

Sinan-owned:

- WorkerTaskAdapter contract.
- Task input/output schemas.
- Diagnostic format.
- Cancellation, timeout, and retry policy.
- Allowed task registry.

Candidate-owned:

- RPC proxy mechanics.
- Transfer handler ergonomics.
- Worker endpoint wrapping.

Adapter boundary:

```txt
Sinan WorkerTaskAdapter contract
  -> Comlink RPC
  -> Web Worker
```

## 5. Risks

- License: Apache-2.0, clear.
- Bundle size: small for Comlink itself.
- WASM/native: none.
- Browser support: Web Worker availability and transferable support need diagnostics.
- Maintenance: mature enough for this use.
- Data/source-of-truth: worker must not own editor store or project truth.
- Fallback: synchronous fallback or queued failure should exist for unsupported environments.

## 6. Required Follow-up

- Define task registry and typed diagnostic envelope.
- Decide worker lifecycle ownership.
- Add browser worker smoke once Playwright browser install is available.

## 7. Recommendation

Proceed to a future WorkerTaskAdapter spike for heavy computation, import dry-runs, navmesh builds, asset processing, and future sandbox preparation.
