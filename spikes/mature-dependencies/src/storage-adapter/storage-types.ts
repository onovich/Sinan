export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export const storageRecordKinds = [
  "draft",
  "runtime-save",
  "cache",
  "recent-project",
  "user-preference",
  "smoke-artifact"
] as const;

export type StorageRecordKind = (typeof storageRecordKinds)[number];

export const storageRetentionClasses = ["pinned", "persistent", "recoverable", "transient"] as const;

export type StorageRetentionClass = (typeof storageRetentionClasses)[number];

export const storageResultStatuses = [
  "success",
  "not-found",
  "conflict",
  "invalid-version",
  "quota-exceeded",
  "unavailable",
  "fallback",
  "volatile"
] as const;

export type StorageResultStatus = (typeof storageResultStatuses)[number];

export const storageDiagnosticCodes = [
  "quota",
  "upgrade",
  "cleanup",
  "unsupported-browser",
  "private-mode-unavailable",
  "corruption-checksum",
  "volatile-fallback",
  "source-of-truth-guard"
] as const;

export type StorageDiagnosticCode = (typeof storageDiagnosticCodes)[number];

export type StorageDiagnosticSeverity = "info" | "warning" | "error";

export interface StorageDiagnostic {
  code: StorageDiagnosticCode;
  severity: StorageDiagnosticSeverity;
  message: string;
  retryable: boolean;
  detail?: JsonObject;
}

export interface StorageResult<TValue = undefined> {
  status: StorageResultStatus;
  ok: boolean;
  value?: TValue;
  diagnostics: StorageDiagnostic[];
  volatile: boolean;
}

export interface StorageQuotaPolicy {
  warnAtBytes?: number;
  cleanupAtBytes?: number;
  hardLimitBytes?: number;
}

export interface StorageCleanupPolicy {
  removeRetentionClasses: StorageRetentionClass[];
  maxRecords?: number;
  olderThanMs?: number;
}

export interface StorageConfig {
  namespace: string;
  schemaVersion: number;
  quotaPolicy: StorageQuotaPolicy;
  cleanupPolicy: StorageCleanupPolicy;
  diagnosticsLevel: "minimal" | "standard" | "verbose";
}

export interface StorageRecordKey {
  namespace: string;
  key: string;
}

export interface StorageRecordRef extends StorageRecordKey {
  kind: StorageRecordKind;
}

export interface StorageRecordSpec<TPayload extends JsonObject = JsonObject> extends StorageRecordRef {
  version: number;
  payload: TPayload;
  retentionClass: StorageRetentionClass;
  checksum?: string;
  updatedAt: number;
}

export interface StorageStoredRecord<TPayload extends JsonObject = JsonObject> extends StorageRecordSpec<TPayload> {
  checksum: string;
  createdAt: number;
}

export interface StorageListQuery {
  namespace: string;
  kind?: StorageRecordKind;
  retentionClass?: StorageRetentionClass;
  keyPrefix?: string;
}

export interface StorageSnapshot {
  format: "sinan-storage-adapter-snapshot";
  schemaVersion: number;
  namespace: string;
  exportedAt: string;
  records: StorageStoredRecord[];
  diagnostics: StorageDiagnostic[];
}

export interface StorageImportOptions {
  mode: "replace" | "merge";
  allowOlderVersions: boolean;
}

export interface StorageCleanupResult {
  removedRecords: number;
  retainedRecords: number;
}

export interface StorageQuotaEstimate {
  supported: boolean;
  usageBytes?: number;
  quotaBytes?: number;
}

export interface StorageAdapter {
  readonly config: StorageConfig;

  open(): Promise<StorageResult>;
  close(): Promise<StorageResult>;
  get<TPayload extends JsonObject = JsonObject>(
    ref: StorageRecordRef
  ): Promise<StorageResult<StorageStoredRecord<TPayload>>>;
  put<TPayload extends JsonObject = JsonObject>(
    record: StorageRecordSpec<TPayload>
  ): Promise<StorageResult<StorageStoredRecord<TPayload>>>;
  delete(ref: StorageRecordRef): Promise<StorageResult>;
  list<TPayload extends JsonObject = JsonObject>(
    query: StorageListQuery
  ): Promise<StorageResult<StorageStoredRecord<TPayload>[]>>;
  exportSnapshot(query: StorageListQuery): Promise<StorageResult<StorageSnapshot>>;
  importSnapshot(snapshot: StorageSnapshot, options: StorageImportOptions): Promise<StorageResult<StorageSnapshot>>;
  cleanup(policy?: Partial<StorageCleanupPolicy>): Promise<StorageResult<StorageCleanupResult>>;
  clearNamespace(namespace: string): Promise<StorageResult<StorageCleanupResult>>;
  estimateQuota(): Promise<StorageResult<StorageQuotaEstimate>>;
}
