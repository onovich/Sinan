import Dexie, { type Table } from "dexie";
import type {
  JsonObject,
  StorageAdapter,
  StorageCleanupPolicy,
  StorageCleanupResult,
  StorageConfig,
  StorageDiagnostic,
  StorageImportOptions,
  StorageListQuery,
  StorageQuotaEstimate,
  StorageRecordRef,
  StorageRecordSpec,
  StorageResult,
  StorageResultStatus,
  StorageSnapshot,
  StorageStoredRecord
} from "./storage-types";

export interface DexieStorageAdapterOptions {
  databaseName?: string;
  indexedDB?: IDBFactory;
  IDBKeyRange?: typeof IDBKeyRange;
  now?: () => number;
}

interface DexieStorageRow extends StorageStoredRecord {
  id: string;
}

class SinanStorageAdapterDatabase extends Dexie {
  records!: Table<DexieStorageRow, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      records: "&id, namespace, [namespace+kind], [namespace+retentionClass], updatedAt, key"
    });
  }
}

const textEncoder = new TextEncoder();

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function createChecksum(record: StorageRecordSpec): string {
  const input = stableStringify({
    key: record.key,
    kind: record.kind,
    namespace: record.namespace,
    payload: record.payload,
    retentionClass: record.retentionClass,
    version: record.version
  });
  const bytes = textEncoder.encode(input);
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function createChecksumMismatchDiagnostic(record: StorageRecordSpec): StorageDiagnostic {
  return {
    code: "corruption-checksum",
    severity: "error",
    message: `Checksum mismatch for ${record.kind}:${record.key}.`,
    retryable: false
  };
}

function createRecordId(ref: StorageRecordRef): string {
  return `${ref.namespace}\u0000${ref.kind}\u0000${ref.key}`;
}

function isOkStatus(status: StorageResultStatus): boolean {
  return status === "success" || status === "fallback" || status === "volatile";
}

function stripInternalId(row: DexieStorageRow): StorageStoredRecord {
  const { id: _id, ...record } = row;
  return cloneJson(record);
}

export class DexieStorageAdapter implements StorageAdapter {
  readonly config: StorageConfig;

  private readonly databaseName: string;
  private readonly now: () => number;
  private db: SinanStorageAdapterDatabase | undefined;

  constructor(config: StorageConfig, options: DexieStorageAdapterOptions = {}) {
    this.config = config;
    this.databaseName = options.databaseName ?? `sinan-storage-${config.namespace}`;
    this.now = options.now ?? Date.now;

    if (options.indexedDB && options.IDBKeyRange) {
      Dexie.dependencies.indexedDB = options.indexedDB;
      Dexie.dependencies.IDBKeyRange = options.IDBKeyRange;
    }
  }

  async open(): Promise<StorageResult> {
    try {
      this.db = new SinanStorageAdapterDatabase(this.databaseName);
      await this.db.open();
      return this.createResult("success");
    } catch (error) {
      this.db = undefined;
      return this.createUnavailableResult("Dexie database open failed.", error);
    }
  }

  async close(): Promise<StorageResult> {
    this.db?.close();
    this.db = undefined;
    return this.createResult("success");
  }

  async get<TPayload extends JsonObject = JsonObject>(
    ref: StorageRecordRef
  ): Promise<StorageResult<StorageStoredRecord<TPayload>>> {
    const db = this.requireOpen<StorageStoredRecord<TPayload>>();
    if (!db.ok) {
      return db.result;
    }

    const row = await db.value.records.get(createRecordId(ref));
    if (!row) {
      return this.createResult<StorageStoredRecord<TPayload>>("not-found");
    }

    return this.createResult("success", stripInternalId(row) as StorageStoredRecord<TPayload>);
  }

  async put<TPayload extends JsonObject = JsonObject>(
    record: StorageRecordSpec<TPayload>
  ): Promise<StorageResult<StorageStoredRecord<TPayload>>> {
    const db = this.requireOpen<StorageStoredRecord<TPayload>>();
    if (!db.ok) {
      return db.result;
    }

    const namespaceCheck = this.validateNamespace<StorageStoredRecord<TPayload>>(record.namespace);
    if (namespaceCheck) {
      return namespaceCheck;
    }

    if (record.version !== this.config.schemaVersion) {
      return this.createResult<StorageStoredRecord<TPayload>>("invalid-version", undefined, [
        {
          code: "upgrade",
          severity: "error",
          message: `Record version ${record.version} does not match storage schema version ${this.config.schemaVersion}.`,
          retryable: false
        }
      ]);
    }

    const checksum = createChecksum(record);
    if (record.checksum && record.checksum !== checksum) {
      return this.createResult<StorageStoredRecord<TPayload>>("conflict", undefined, [
        createChecksumMismatchDiagnostic(record)
      ]);
    }

    const id = createRecordId(record);
    const existing = await db.value.records.get(id);
    const row: DexieStorageRow = {
      ...cloneJson(record),
      id,
      checksum: record.checksum ?? checksum,
      createdAt: existing?.createdAt ?? this.now()
    };

    await db.value.records.put(row);
    return this.createResult("success", stripInternalId(row) as StorageStoredRecord<TPayload>);
  }

  async delete(ref: StorageRecordRef): Promise<StorageResult> {
    const db = this.requireOpen<undefined>();
    if (!db.ok) {
      return db.result;
    }

    const existing = await db.value.records.get(createRecordId(ref));
    if (!existing) {
      return this.createResult("not-found");
    }

    await db.value.records.delete(existing.id);
    return this.createResult("success");
  }

  async list<TPayload extends JsonObject = JsonObject>(
    query: StorageListQuery
  ): Promise<StorageResult<StorageStoredRecord<TPayload>[]>> {
    const db = this.requireOpen<StorageStoredRecord<TPayload>[]>();
    if (!db.ok) {
      return db.result;
    }

    const namespaceCheck = this.validateNamespace<StorageStoredRecord<TPayload>[]>(query.namespace);
    if (namespaceCheck) {
      return namespaceCheck;
    }

    const rows = await db.value.records.where("namespace").equals(query.namespace).toArray();
    const results = rows
      .filter((record) => (query.kind ? record.kind === query.kind : true))
      .filter((record) => (query.retentionClass ? record.retentionClass === query.retentionClass : true))
      .filter((record) => (query.keyPrefix ? record.key.startsWith(query.keyPrefix) : true))
      .sort((left, right) => left.updatedAt - right.updatedAt || left.key.localeCompare(right.key))
      .map((row) => stripInternalId(row) as StorageStoredRecord<TPayload>);

    return this.createResult("success", results);
  }

  async exportSnapshot(query: StorageListQuery): Promise<StorageResult<StorageSnapshot>> {
    const listed = await this.list(query);
    if (!listed.ok) {
      return this.createResult<StorageSnapshot>(listed.status, undefined, listed.diagnostics);
    }

    return this.createResult("success", {
      format: "sinan-storage-adapter-snapshot",
      schemaVersion: this.config.schemaVersion,
      namespace: query.namespace,
      exportedAt: new Date(this.now()).toISOString(),
      records: listed.value ?? [],
      diagnostics: []
    });
  }

  async importSnapshot(snapshot: StorageSnapshot, options: StorageImportOptions): Promise<StorageResult<StorageSnapshot>> {
    const db = this.requireOpen<StorageSnapshot>();
    if (!db.ok) {
      return db.result;
    }

    if (snapshot.format !== "sinan-storage-adapter-snapshot" || snapshot.schemaVersion !== this.config.schemaVersion) {
      return this.createResult<StorageSnapshot>("invalid-version", undefined, [
        {
          code: "upgrade",
          severity: "error",
          message: "Snapshot format or schema version is not supported by this adapter.",
          retryable: false
        }
      ]);
    }

    const namespaceCheck = this.validateNamespace<StorageSnapshot>(snapshot.namespace);
    if (namespaceCheck) {
      return namespaceCheck;
    }

    const snapshotRecordCheck = this.validateSnapshotRecords(snapshot);
    if (snapshotRecordCheck) {
      return snapshotRecordCheck;
    }

    if (options.mode === "replace") {
      await this.clearNamespace(snapshot.namespace);
    }

    for (const record of snapshot.records) {
      const imported = await this.put(record);
      if (!imported.ok) {
        return this.createResult<StorageSnapshot>(imported.status, undefined, imported.diagnostics);
      }
    }

    return this.exportSnapshot({ namespace: snapshot.namespace });
  }

  async cleanup(policy: Partial<StorageCleanupPolicy> = {}): Promise<StorageResult<StorageCleanupResult>> {
    const db = this.requireOpen<StorageCleanupResult>();
    if (!db.ok) {
      return db.result;
    }

    const cleanupPolicy: StorageCleanupPolicy = {
      ...this.config.cleanupPolicy,
      ...policy,
      removeRetentionClasses: policy.removeRetentionClasses ?? this.config.cleanupPolicy.removeRetentionClasses
    };
    const cutoff = cleanupPolicy.olderThanMs === undefined ? undefined : this.now() - cleanupPolicy.olderThanMs;
    const rows = await db.value.records.where("namespace").equals(this.config.namespace).toArray();
    const removable = rows
      .filter((record) => cleanupPolicy.removeRetentionClasses.includes(record.retentionClass))
      .filter((record) => (cutoff === undefined ? true : record.updatedAt < cutoff))
      .sort((left, right) => left.updatedAt - right.updatedAt);
    const overflow =
      cleanupPolicy.maxRecords === undefined
        ? removable
        : removable.slice(0, Math.max(0, rows.length - cleanupPolicy.maxRecords));

    await db.value.records.bulkDelete(overflow.map((row) => row.id));

    return this.createResult("success", {
      removedRecords: overflow.length,
      retainedRecords: rows.length - overflow.length
    });
  }

  async clearNamespace(namespace: string): Promise<StorageResult<StorageCleanupResult>> {
    const db = this.requireOpen<StorageCleanupResult>();
    if (!db.ok) {
      return db.result;
    }

    const namespaceCheck = this.validateNamespace<StorageCleanupResult>(namespace);
    if (namespaceCheck) {
      return namespaceCheck;
    }

    const rows = await db.value.records.where("namespace").equals(namespace).toArray();
    await db.value.records.bulkDelete(rows.map((row) => row.id));

    return this.createResult("success", {
      removedRecords: rows.length,
      retainedRecords: 0
    });
  }

  async estimateQuota(): Promise<StorageResult<StorageQuotaEstimate>> {
    const db = this.requireOpen<StorageQuotaEstimate>();
    if (!db.ok) {
      return db.result;
    }

    const estimate = await globalThis.navigator?.storage?.estimate?.();
    return this.createResult("success", {
      supported: estimate !== undefined,
      usageBytes: estimate?.usage,
      quotaBytes: estimate?.quota ?? this.config.quotaPolicy.hardLimitBytes
    });
  }

  private requireOpen<TValue>():
    | { ok: true; value: SinanStorageAdapterDatabase }
    | { ok: false; result: StorageResult<TValue> } {
    if (this.db?.isOpen()) {
      return {
        ok: true,
        value: this.db
      };
    }

    return {
      ok: false,
      result: this.createResult<TValue>("unavailable", undefined, [
        {
          code: "unsupported-browser",
          severity: "error",
          message: "Dexie storage adapter must be opened before use.",
          retryable: true
        }
      ])
    };
  }

  private validateNamespace<TValue>(namespace: string): StorageResult<TValue> | undefined {
    if (namespace === this.config.namespace) {
      return undefined;
    }

    return this.createResult<TValue>("conflict", undefined, [
      {
        code: "source-of-truth-guard",
        severity: "error",
        message: `Namespace ${namespace} is outside configured adapter namespace ${this.config.namespace}.`,
        retryable: false
      }
    ]);
  }

  private validateSnapshotRecords(snapshot: StorageSnapshot): StorageResult<StorageSnapshot> | undefined {
    for (const record of snapshot.records) {
      if (record.namespace !== snapshot.namespace) {
        return this.createResult<StorageSnapshot>("conflict", undefined, [
          {
            code: "source-of-truth-guard",
            severity: "error",
            message: `Snapshot record ${record.key} uses namespace ${record.namespace}, not ${snapshot.namespace}.`,
            retryable: false
          }
        ]);
      }

      if (record.checksum !== createChecksum(record)) {
        return this.createResult<StorageSnapshot>("conflict", undefined, [createChecksumMismatchDiagnostic(record)]);
      }
    }

    return undefined;
  }

  private createUnavailableResult(message: string, error: unknown): StorageResult {
    return this.createResult("unavailable", undefined, [
      {
        code: "unsupported-browser",
        severity: "error",
        message,
        retryable: true,
        detail: {
          error: error instanceof Error ? error.message : String(error)
        }
      }
    ]);
  }

  private createResult<TValue>(
    status: StorageResultStatus,
    value?: TValue,
    diagnostics: StorageDiagnostic[] = []
  ): StorageResult<TValue> {
    return {
      status,
      ok: isOkStatus(status),
      value,
      diagnostics,
      volatile: status === "volatile"
    };
  }
}
