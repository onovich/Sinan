# StorageAdapter Contract Notes

Date: 2026-06-22

## Status

Round 8 boundary guard status: `PASS`.

This document records the source-of-truth and import boundary evidence for the isolated StorageAdapter spike. It is not mainline implementation approval.

## Contract Boundary

Sinan owns:

- storage record keys
- record kinds
- schema versions
- checksums
- namespaces
- retention classes
- diagnostics and result statuses
- cleanup policy
- export/import snapshot envelope

Dexie and IndexedDB own:

- browser persistence mechanics
- object store implementation details
- browser quota behavior
- IndexedDB open/close/delete mechanics

Canonical repository content remains in `data/**/*.json`. The spike does not replace source JSON with IndexedDB and does not modify mainline `src/**`, `data/**`, `tests/**`, or `public/**`.

## Allowed Dexie / IndexedDB Usage

The boundary scan allows Dexie and IndexedDB references only in these spike-local categories:

- `spikes/mature-dependencies/src/storage-adapter/dexie-storage-adapter.ts`: Dexie-backed implementation hidden behind `StorageAdapter`.
- `spikes/mature-dependencies/src/storage-adapter/dexie-storage-adapter.test.ts`: fake-indexeddb tests for the Dexie adapter.
- `spikes/mature-dependencies/src/storage-adapter/storage-adapter-browser-smoke.ts`: browser smoke helper that constructs the Dexie adapter through the StorageAdapter route and checks browser IndexedDB availability.
- `spikes/mature-dependencies/src/browser-smoke/storage-adapter.pw.ts`: Playwright evidence writer for the adapter smoke.
- `spikes/mature-dependencies/src/dexie/dexie-smoke.ts` and `spikes/mature-dependencies/src/browser-smoke/dexie-indexeddb.pw.ts`: pre-existing raw Dexie candidate smoke evidence, not production integration.
- Tests that assert snapshots do not contain `Dexie`, `indexedDB`, table, transaction, or request metadata.

No Dexie object, table, transaction, request, or browser storage handle appears in the public `StorageAdapter` contract types.

## Snapshot Envelope Rule

`StorageSnapshot` is Sinan-owned and contains:

- `format`
- `schemaVersion`
- `namespace`
- `exportedAt`
- `records`
- `diagnostics`

Records contain Sinan-owned keys, kinds, versions, checksums, retention classes, timestamps, and JSON payloads. Export/import validation rejects checksum mismatches and unsupported snapshot versions before a replace-mode import clears namespace data.

Browser smoke summaries may name the candidate adapter and test database for reproducibility. That metadata is test evidence only; it is not part of `StorageSnapshot`, canonical JSON data, editor state, runtime state, schemas, or migrations.

## Guard Commands

Executed guard checks:

```powershell
rg -n -e 'from.*"dexie"' -e "from.*'dexie'" -e 'new Dexie' -e 'indexedDB' spikes\mature-dependencies\src
git diff --name-only origin/codex/mature-dependency-browser-smoke-harness...HEAD
git diff --name-only origin/codex/mature-dependency-browser-smoke-harness...HEAD | rg -n '^(src/|data/|tests/|public/|package\.json|package-lock\.json|vite\.config\.|tsconfig\.|\.codex/)'
git diff --check
```

Observed results:

- Dexie / IndexedDB matches are limited to allowed spike-local adapter, tests, and smoke evidence paths.
- The forbidden-path diff scan returned no matches.
- `git diff --check` passed, with only existing Windows line-ending warnings for previously dirty browser-smoke JSON files.

## Repeatable Storage Smoke

Round 9 adds a package-local storage smoke command:

```powershell
npm --prefix spikes\mature-dependencies run smoke:storage
```

The script writes:

- `spikes/mature-dependencies/reports/storage-adapter/storage-adapter-node-summary.json`
- `spikes/mature-dependencies/reports/storage-adapter/storage-adapter-validation-summary.json`

The aggregate status requires:

- StorageAdapter Vitest subset: `PASS`
- StorageAdapter browser summary: `PASS`
- Base-to-HEAD forbidden path guard: `PASS`

## Source-of-Truth Conclusion

`data/**/*.json` remains the canonical source-of-truth. The isolated StorageAdapter spike provides future implementation evidence only; it does not authorize root dependency adoption, mainline save-system changes, or IndexedDB replacement of repository data.
