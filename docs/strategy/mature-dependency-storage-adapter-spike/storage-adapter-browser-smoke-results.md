# StorageAdapter Browser Smoke Results

Date: 2026-06-22

## Scope

This round adds an isolated browser smoke for the spike-only `StorageAdapter` contract. The smoke runs through the browser catalog on port `5184` and uses `DexieStorageAdapter` against real browser IndexedDB.

Covered operations:

- `open`
- `put`
- `get`
- `list`
- `exportSnapshot`
- `importSnapshot`
- `cleanup`
- `close`
- reload persistence verification
- final namespace clear

## Expected Evidence

- JSON summary: `spikes/mature-dependencies/reports/storage-adapter/storage-adapter-browser-summary.json`
- Command: `npm --prefix spikes/mature-dependencies run smoke:browser`
- Browser: Playwright Chromium
- Port: `5184`

## Latest Result

Status: `PASS`

Observed evidence:

- StorageAdapter catalog entry available: `true`
- IndexedDB available: `true`
- write open / put / get / list / export / import / cleanup: `true / true / true / 2 / 2 / 2 / 1`
- reload open / get / list / clear: `true / true / 1 / 1`
- quota estimate supported: `true`
- fallback used: `false / false`

## Boundary Notes

- The smoke is registered as `storageAdapter` in the isolated mature dependency smoke catalog.
- Browser evidence flows through the `StorageAdapter` contract before reaching Dexie / IndexedDB.
- The smoke asserts that volatile fallback is not used during the browser persistence path.
- Export and import evidence stays in the contract snapshot envelope and does not expose Dexie table rows or internal keys.
- This does not authorize or implement the mainline application adapter.
