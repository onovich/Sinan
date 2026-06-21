# RFC-008: Storage Save Boundary

Date: 2026-06-21
Status: `accept-for-contract`
Related matrix row: `StorageAdapter` / Dexie and IndexedDB

## Background And Evidence

The mature dependency spike validated Dexie in isolation for browser IndexedDB CRUD, schema versioning, export/import shape, and cleanup behavior. This supports a storage adapter contract for browser persistence, not a replacement for repository data files or migration ownership.

Sinan's canonical project semantics remain in `data/**/*.json`, source assets, schemas, and migrations. Browser storage is a local persistence surface for runtime/editor convenience.

## Sinan-Owned Contract

Sinan owns:

- `StorageAdapter` interface and all repository-visible storage keys.
- Save, draft, cache, recent project, user preference, and smoke artifact schemas.
- Version policy for stored records and migration ownership.
- Import/export envelope, checksum, and compatibility diagnostics.
- Quota policy, cleanup priority, and user-facing recoverability rules.
- Source-of-truth rule: `data/**/*.json` and migrations remain canonical.

The storage contract must describe what may be persisted, why it may be persisted, and how it can be removed without damaging authored project truth.

## Candidate-Owned Responsibilities

Dexie and IndexedDB may own:

- Browser database opening and store creation.
- Indexed transactions, object store access, and query mechanics.
- Internal IndexedDB error surfaces and browser persistence quirks.
- Low-level schema upgrade execution after Sinan has chosen the version plan.
- Bulk read/write performance details.

Dexie table names and browser database ids must remain adapter implementation details unless explicitly mapped to Sinan-owned keys.

## Forbidden Leakage

The following are forbidden:

- No canonical levels, prefabs, timelines, events, camera shots, or gameplay truth may exist only in IndexedDB.
- No Dexie instance, table object, IndexedDB request, or browser transaction object in editor state, JSON, runtime world state, schemas, or migrations.
- No migration that reads Dexie tables as the source of project truth.
- No save format that requires Dexie-specific metadata to be valid.
- No background cleanup that can delete repository source data or source assets.

## Adapter Inputs And Outputs

Inputs:

- `StorageConfig` with namespace, schema version, quota policy, cleanup policy, and diagnostics level.
- `StorageRecordSpec` with Sinan key, record kind, JSON-serializable payload, version, checksum, and retention class.
- Commands: get, put, delete, list, export, import, cleanup, clear namespace, and estimate quota.

Outputs:

- `StorageResult` with success, not-found, conflict, invalid-version, quota-exceeded, unavailable, or fallback status.
- `StorageSnapshot` for export/import using Sinan-owned record kinds and versions.
- `StorageDiagnostic` with quota, upgrade, cleanup, unsupported browser, private-mode failure, and corruption reasons.

## Lifecycle, Errors, Diagnostics, And Fallback

Lifecycle states:

- `unopened`: adapter has not opened a browser database.
- `ready`: reads and writes are available.
- `migrating`: schema upgrade is executing.
- `degraded`: some stores or quota estimates are unavailable.
- `volatile`: fallback in-memory persistence is active.
- `closed`: adapter has released browser resources.

Errors:

- Browser storage unavailable.
- Version upgrade failed or was blocked by another tab.
- Quota exceeded.
- Serialization or checksum mismatch.
- Import uses an unsupported version.
- Cleanup removed fewer records than requested.

Fallback:

The in-memory fallback may keep the editor session usable, but it must mark records as volatile, emit diagnostics, and never claim that data is safely persisted. Save/export UX must be able to surface that distinction.

## Validation Strategy

Before implementation can enter mainline, validation must include:

- Contract tests for record kind validation, version upgrades, cleanup priority, and export/import envelope.
- Fake adapter tests for quota, unavailable storage, and volatile fallback.
- Isolated Dexie smoke for CRUD, version bump, blocked upgrade handling, cleanup, and export/import.
- Browser smoke for IndexedDB availability, private-mode behavior where possible, quota estimate, reload persistence, and multi-tab upgrade diagnostic.
- Guard proving `data/**/*.json` remains the source-of-truth and no Dexie imports appear outside the storage adapter implementation.

## Future Implementation Gate

Future implementation may proceed only when:

- RFC-008 is accepted.
- A migration/version plan exists for each persisted record kind.
- The compatibility matrix still marks `StorageAdapter` as `accept-for-contract` or stronger.
- Browser smoke covers quota, reload, cleanup, and unavailable storage behavior.
- The implementation guide names where generated storage artifacts may live and how to clear them.

## Hold, Reject, And Blocker Rules

Hold if:

- Save data and canonical project JSON are not clearly separated.
- Stored record versions are not owned by Sinan schemas.
- Quota cleanup policy is undefined.

Reject if:

- The implementation requires Dexie metadata in exported save data.
- Repository migrations depend on browser storage.

Block if:

- Browser persistence cannot be tested in the target development browser.
- Storage failure would silently discard user data without diagnostics.
