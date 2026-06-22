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

export interface MemoryStorageAdapterOptions {
  volatile?: boolean;
  fallbackReason?: string;
  now?: () => number;
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

export class MemoryStorageAdapter implements StorageAdapter {
  readonly config: StorageConfig;

  private readonly records = new Map<string, StorageStoredRecord>();
  private readonly options: Required<MemoryStorageAdapterOptions>;
  private opened = false;

  constructor(config: StorageConfig, options: MemoryStorageAdapterOptions = {}) {
    this.config = config;
    this.options = {
      volatile: options.volatile ?? false,
      fallbackReason: options.fallbackReason ?? "in-memory adapter selected",
      now: options.now ?? Date.now
    };
  }

  async open(): Promise<StorageResult> {
    this.opened = true;
    return this.createResult(this.options.volatile ? "volatile" : "success", undefined, this.volatileDiagnostics());
  }

  async close(): Promise<StorageResult> {
    this.opened = false;
    return this.createResult("success");
  }

  async get<TPayload extends JsonObject = JsonObject>(
    ref: StorageRecordRef
  ): Promise<StorageResult<StorageStoredRecord<TPayload>>> {
    const unopened = this.requireOpen<StorageStoredRecord<TPayload>>();
    if (unopened) {
      return unopened;
    }

    const stored = this.records.get(createRecordId(ref));
    if (!stored) {
      return this.createResult<StorageStoredRecord<TPayload>>("not-found");
    }

    return this.createResult("success", cloneJson(stored) as StorageStoredRecord<TPayload>);
  }

  async put<TPayload extends JsonObject = JsonObject>(
    record: StorageRecordSpec<TPayload>
  ): Promise<StorageResult<StorageStoredRecord<TPayload>>> {
    const unopened = this.requireOpen<StorageStoredRecord<TPayload>>();
    if (unopened) {
      return unopened;
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
    const existing = this.records.get(id);
    const stored: StorageStoredRecord<TPayload> = {
      ...cloneJson(record),
      checksum: record.checksum ?? checksum,
      createdAt: existing?.createdAt ?? this.options.now()
    };

    this.records.set(id, stored);
    return this.createResult(this.options.volatile ? "volatile" : "success", cloneJson(stored), this.volatileDiagnostics());
  }

  async delete(ref: StorageRecordRef): Promise<StorageResult> {
    const unopened = this.requireOpen<undefined>();
    if (unopened) {
      return unopened;
    }

    const deleted = this.records.delete(createRecordId(ref));
    return deleted ? this.createResult("success") : this.createResult("not-found");
  }

  async list<TPayload extends JsonObject = JsonObject>(
    query: StorageListQuery
  ): Promise<StorageResult<StorageStoredRecord<TPayload>[]>> {
    const unopened = this.requireOpen<StorageStoredRecord<TPayload>[]>();
    if (unopened) {
      return unopened;
    }

    const namespaceCheck = this.validateNamespace<StorageStoredRecord<TPayload>[]>(query.namespace);
    if (namespaceCheck) {
      return namespaceCheck;
    }

    const results = [...this.records.values()]
      .filter((record) => record.namespace === query.namespace)
      .filter((record) => (query.kind ? record.kind === query.kind : true))
      .filter((record) => (query.retentionClass ? record.retentionClass === query.retentionClass : true))
      .filter((record) => (query.keyPrefix ? record.key.startsWith(query.keyPrefix) : true))
      .sort((left, right) => left.updatedAt - right.updatedAt || left.key.localeCompare(right.key));

    return this.createResult("success", cloneJson(results) as StorageStoredRecord<TPayload>[]);
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
      exportedAt: new Date(this.options.now()).toISOString(),
      records: listed.value ?? [],
      diagnostics: []
    });
  }

  async importSnapshot(snapshot: StorageSnapshot, options: StorageImportOptions): Promise<StorageResult<StorageSnapshot>> {
    const unopened = this.requireOpen<StorageSnapshot>();
    if (unopened) {
      return unopened;
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
    const unopened = this.requireOpen<StorageCleanupResult>();
    if (unopened) {
      return unopened;
    }

    const cleanupPolicy: StorageCleanupPolicy = {
      ...this.config.cleanupPolicy,
      ...policy,
      removeRetentionClasses: policy.removeRetentionClasses ?? this.config.cleanupPolicy.removeRetentionClasses
    };
    const cutoff = cleanupPolicy.olderThanMs === undefined ? undefined : this.options.now() - cleanupPolicy.olderThanMs;
    const removable = [...this.records.entries()]
      .filter(([, record]) => record.namespace === this.config.namespace)
      .filter(([, record]) => cleanupPolicy.removeRetentionClasses.includes(record.retentionClass))
      .filter(([, record]) => (cutoff === undefined ? true : record.updatedAt < cutoff))
      .sort(([, left], [, right]) => left.updatedAt - right.updatedAt);

    const overflow =
      cleanupPolicy.maxRecords === undefined
        ? removable
        : removable.slice(0, Math.max(0, this.records.size - cleanupPolicy.maxRecords));

    for (const [id] of overflow) {
      this.records.delete(id);
    }

    return this.createResult("success", {
      removedRecords: overflow.length,
      retainedRecords: this.records.size
    });
  }

  async clearNamespace(namespace: string): Promise<StorageResult<StorageCleanupResult>> {
    const unopened = this.requireOpen<StorageCleanupResult>();
    if (unopened) {
      return unopened;
    }

    const namespaceCheck = this.validateNamespace<StorageCleanupResult>(namespace);
    if (namespaceCheck) {
      return namespaceCheck;
    }

    let removedRecords = 0;
    for (const [id, record] of this.records.entries()) {
      if (record.namespace === namespace) {
        this.records.delete(id);
        removedRecords += 1;
      }
    }

    return this.createResult("success", {
      removedRecords,
      retainedRecords: this.records.size
    });
  }

  async estimateQuota(): Promise<StorageResult<StorageQuotaEstimate>> {
    const unopened = this.requireOpen<StorageQuotaEstimate>();
    if (unopened) {
      return unopened;
    }

    const usageBytes = textEncoder.encode(stableStringify([...this.records.values()])).byteLength;
    return this.createResult("success", {
      supported: true,
      usageBytes,
      quotaBytes: this.config.quotaPolicy.hardLimitBytes
    });
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
      volatile: this.options.volatile || status === "volatile"
    };
  }

  private requireOpen<TValue>(): StorageResult<TValue> | undefined {
    if (this.opened) {
      return undefined;
    }

    return this.createResult<TValue>("unavailable", undefined, [
      {
        code: "unsupported-browser",
        severity: "error",
        message: "Storage adapter must be opened before use.",
        retryable: true
      }
    ]);
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

  private volatileDiagnostics(): StorageDiagnostic[] {
    if (!this.options.volatile) {
      return [];
    }

    return [
      {
        code: "volatile-fallback",
        severity: "warning",
        message: this.options.fallbackReason,
        retryable: false
      }
    ];
  }
}
