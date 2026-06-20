# Dexie / IndexedDB Evaluation

Date: 2026-06-20
Candidate: IndexedDB + Dexie
Package(s): `dexie@4.4.4`, `fake-indexeddb@6.2.5`
Official docs: https://dexie.org/docs/
License: Apache-2.0 for Dexie
Install command: `npm install dexie fake-indexeddb`
Environment tested: Node 24.13.1 with fake-indexeddb, TypeScript 6.0.3, Vitest 4.1.9, Vite 8.0.16

## 1. Summary

Decision: accept-for-adapter-spike

Dexie is viable as a browser StorageAdapter wrapper for local cache, drafts, save snapshots, recent project metadata, and smoke artifacts. It must not replace Git-friendly `data/**/*.json`.

## 2. What Was Tested

- Dexie database definition.
- Versioned schema with indexed fields.
- Migration hook.
- Node test with explicit `fake-indexeddb` dependency binding.
- Insert and indexed query.
- Export array, clear, import array.
- Cleanup/delete.

## 3. Results

- Node: passed with `fake-indexeddb`.
- Vite dev: not started. No port 5174 usage.
- Vite build: passed.
- Browser: actual IndexedDB runtime not launched in this run.
- Playwright: blocked by missing Chromium 1228 and install timeout.

## 4. Integration Boundary

Sinan-owned:

- StorageAdapter contract.
- Save snapshot semantics.
- Draft/cache policy.
- Project JSON source-of-truth.
- Migration and validation rules.

Candidate-owned:

- IndexedDB wrapper API.
- Table/index ergonomics.
- Browser storage behavior.

Adapter boundary:

```txt
Sinan StorageAdapter contract
  -> Dexie adapter
  -> IndexedDB
```

## 5. Risks

- License: Apache-2.0, clear.
- Bundle size: moderate; acceptable only if adapter is browser/editor scoped.
- WASM/native: none.
- Browser support: IndexedDB availability and quota behavior need diagnostics.
- Maintenance: mature and active enough for this use.
- Data/source-of-truth: must never replace `data/**/*.json`.
- Fallback: cache/draft operations need clear failure and cleanup policy.

## 6. Required Follow-up

- Define which data classes may enter browser storage.
- Define export/import and cleanup policy.
- Add real browser quota and persistence diagnostics later.

## 7. Recommendation

Proceed to a future StorageAdapter spike for local cache/draft/save snapshot use only.
