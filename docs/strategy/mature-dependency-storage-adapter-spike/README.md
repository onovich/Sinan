# Mature Dependency StorageAdapter Spike

Date: 2026-06-22
Branch: `codex/mature-dependency-storage-adapter-spike`
Base: `origin/codex/mature-dependency-browser-smoke-harness`
Status: PASS; final report written

## Scope

This goal implements an isolated StorageAdapter spike inside the mature dependency spike package. It is evidence for a future implementation guide, not production integration approval.

The spike may define and test a Sinan-shaped storage contract, a memory fallback adapter, a Dexie / IndexedDB adapter, browser smoke evidence, reports, and validation scripts under the allowed paths only.

## Non-Scope

- No Sinan mainline `src/**` changes.
- No Sinan mainline `data/**` changes.
- No Sinan mainline `tests/**` changes.
- No Sinan mainline `public/**` changes.
- No root `package.json`, lockfile, Vite, TypeScript, Vitest, or workflow config changes.
- No production `SaveSystem`, editor command/save/undo loop, schema migration, or runtime integration.
- No replacement of canonical `data/**/*.json` with IndexedDB.
- No Dexie instance, table, transaction, request, or browser storage object in JSON, editor state, runtime world state, schemas, or migrations.
- No Phase 20, Phase 21, or Phase 23 changes.

## Inputs

- `docs/rfcs/RFC-008-storage-save-boundary.md`
- `docs/strategy/mature-dependency-contracts/adapter-compatibility-matrix.md`
- `docs/strategy/mature-dependency-contracts/final-contract-rfc-pack-report.md`
- `docs/strategy/mature-dependency-browser-smoke/final-browser-smoke-harness-report.md`
- `docs/strategy/mature-dependency-browser-smoke/browser-smoke-results.md`
- `docs/strategy/mature-dependency-spikes/dexie-evaluation.md`
- `spikes/mature-dependencies/src/dexie/dexie-smoke.ts`
- `spikes/mature-dependencies/src/browser-smoke/dexie-indexeddb.pw.ts`
- `spikes/mature-dependencies/reports/browser-smoke/dexie-indexeddb-summary.json`

The handoff acceptance document `docs/strategy/mature-dependency-browser-smoke-harness-repair-acceptance-2026-06-22.md` may be present only in the main handoff workspace. Do not recreate it in this branch.

## Evidence Baseline

RFC-008 classifies Dexie / IndexedDB as a browser persistence candidate behind a Sinan-owned `StorageAdapter` boundary. The compatibility matrix keeps StorageAdapter at `accept-for-contract`, which permits an isolated adapter spike but not direct root dependency adoption.

The browser smoke harness now has real Playwright Chromium evidence:

- Dexie / IndexedDB status: `PASS`.
- Browser port: `5184`; port `5174` is not used.
- Evidence file: `spikes/mature-dependencies/reports/browser-smoke/dexie-indexeddb-summary.json`.
- Evidence includes real IndexedDB availability, Dexie CRUD, export/import, cleanup, quota estimate, and reload availability.

## Boundary Principle

```txt
Sinan owns storage keys, record kinds, versions, checksum, diagnostics,
lifecycle, cleanup policy, and export/import envelope.

Dexie and IndexedDB own browser persistence mechanics only.

Repository data and data/**/*.json remain canonical source-of-truth.
```

## Snapshot Envelope Rule

Storage export/import uses the Sinan-owned `StorageSnapshot` envelope:

- `format`
- `schemaVersion`
- `namespace`
- `exportedAt`
- `records`
- `diagnostics`

The envelope records Sinan keys, record kinds, versions, checksums, retention classes, JSON payloads, and diagnostics. It must not require or expose Dexie metadata such as database names, table names, transactions, requests, object stores, or IndexedDB handles. A corrupted checksum or unsupported snapshot version must be rejected before a replace-mode import clears namespace data.

## Allowed Paths

- `spikes/mature-dependencies/**`
- `docs/strategy/mature-dependency-storage-adapter-spike/**`

## Forbidden Paths

- root `package.json`
- root `package-lock.json`
- root Vite / TypeScript / Vitest config
- `src/**`
- `data/**`
- `tests/**`
- `public/**`
- `.codex/**`
- Phase 20 / Phase 21 / Phase 23 files
- `spikes/mature-dependencies/node_modules/**`
- `spikes/mature-dependencies/dist/**`
- `spikes/mature-dependencies/coverage/**`
- IndexedDB cache, Playwright traces, videos, screenshots, and browser binaries

## Required Validation Commands

Round-level validation starts small and expands as the spike grows:

```powershell
git status --short --branch
Test-Path docs\rfcs\RFC-008-storage-save-boundary.md
Test-Path docs\strategy\mature-dependency-browser-smoke\final-browser-smoke-harness-report.md
Test-Path docs\strategy\mature-dependency-storage-adapter-spike\README.md
git diff --check
```

Later rounds must also pass:

```powershell
npm --prefix spikes\mature-dependencies run check
npm --prefix spikes\mature-dependencies run smoke:browser
npm --prefix spikes\mature-dependencies run smoke:storage
```

## Artifact Policy

Commit source files, Markdown reports, small JSON summaries, and isolated package scripts only. Do not commit generated browser caches, IndexedDB cache state, Playwright traces, screenshots, videos, `dist/**`, `coverage/**`, or `node_modules/**`.

Existing uncommitted browser-smoke JSON timestamp changes may be present from acceptance validation. They are validation artifacts and must not be mixed into StorageAdapter round commits unless a later round intentionally updates browser evidence.

## Round Plan

This guide uses 12 rounds:

- Round 1: branch isolation and README.
- Round 2: contract types, result enum, diagnostics.
- Round 3: memory adapter and Node tests.
- Round 4: Dexie adapter CRUD/list.
- Round 5: version, checksum, export/import envelope.
- Round 6: quota, cleanup, volatile fallback, unavailable storage.
- Round 7: browser smoke through StorageAdapter.
- Round 8: source-of-truth leakage guard and boundary report.
- Round 9: contract notes, report generation, script integration.
- Round 10: buffer fixes.
- Round 11: report consistency and review feedback.
- Round 12: final validation and handoff report.
