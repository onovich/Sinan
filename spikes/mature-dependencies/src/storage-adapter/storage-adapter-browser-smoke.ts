import { DexieStorageAdapter } from "./dexie-storage-adapter";
import type { StorageConfig, StorageDiagnostic, StorageRecordSpec, StorageResult } from "./storage-types";

export type StorageAdapterBrowserSmokePhase = "write" | "verify";

export interface StorageAdapterBrowserSmokeOptions {
  databaseName: string;
  namespace?: string;
  phase: StorageAdapterBrowserSmokePhase;
}

export interface StorageAdapterBrowserSmokeResult {
  adapter: "DexieStorageAdapter";
  databaseName: string;
  namespace: string;
  phase: StorageAdapterBrowserSmokePhase;
  indexedDbAvailable: boolean;
  storageEstimateAvailable: boolean;
  openOk: boolean;
  putPersistentOk: boolean;
  putTransientOk: boolean;
  getPersistentOk: boolean;
  listCount: number;
  exportCount: number;
  importCount: number;
  cleanupRemoved: number;
  reloadPersistentOk: boolean;
  clearRemoved: number;
  postClearListCount: number;
  quotaSupported: boolean;
  usedFallback: boolean;
  diagnostics: string[];
}

const schemaVersion = 1;

function createConfig(namespace: string): StorageConfig {
  return {
    namespace,
    schemaVersion,
    quotaPolicy: {
      warnAtBytes: 128 * 1024,
      cleanupAtBytes: 192 * 1024,
      hardLimitBytes: 256 * 1024
    },
    cleanupPolicy: {
      removeRetentionClasses: ["transient"]
    },
    diagnosticsLevel: "verbose"
  };
}

function diagnosticMessages(...results: StorageResult<unknown>[]): string[] {
  return results.flatMap((result) =>
    result.diagnostics.map((diagnostic: StorageDiagnostic) => `${diagnostic.code}:${diagnostic.severity}:${diagnostic.message}`)
  );
}

function createPersistentRecord(namespace: string, updatedAt: number): StorageRecordSpec {
  return {
    namespace,
    key: "browser-persistent-draft",
    kind: "draft",
    version: schemaVersion,
    payload: {
      source: "storage-adapter-browser-smoke",
      survivesReload: true
    },
    retentionClass: "persistent",
    updatedAt
  };
}

function createTransientRecord(namespace: string, updatedAt: number): StorageRecordSpec {
  return {
    namespace,
    key: "browser-transient-cache",
    kind: "smoke-artifact",
    version: schemaVersion,
    payload: {
      source: "storage-adapter-browser-smoke",
      cleanedByPolicy: true
    },
    retentionClass: "transient",
    updatedAt
  };
}

function createEmptyResult(options: StorageAdapterBrowserSmokeOptions): StorageAdapterBrowserSmokeResult {
  const namespace = options.namespace ?? "sinan-storage-adapter-browser-smoke";
  return {
    adapter: "DexieStorageAdapter",
    databaseName: options.databaseName,
    namespace,
    phase: options.phase,
    indexedDbAvailable: typeof indexedDB !== "undefined",
    storageEstimateAvailable: typeof navigator.storage?.estimate === "function",
    openOk: false,
    putPersistentOk: false,
    putTransientOk: false,
    getPersistentOk: false,
    listCount: 0,
    exportCount: 0,
    importCount: 0,
    cleanupRemoved: 0,
    reloadPersistentOk: false,
    clearRemoved: 0,
    postClearListCount: 0,
    quotaSupported: false,
    usedFallback: false,
    diagnostics: []
  };
}

export async function runStorageAdapterBrowserSmoke(
  options: StorageAdapterBrowserSmokeOptions
): Promise<StorageAdapterBrowserSmokeResult> {
  const namespace = options.namespace ?? "sinan-storage-adapter-browser-smoke";
  const result = createEmptyResult({ ...options, namespace });
  const adapter = new DexieStorageAdapter(createConfig(namespace), {
    databaseName: options.databaseName
  });

  const opened = await adapter.open();
  result.openOk = opened.ok;
  result.diagnostics.push(...diagnosticMessages(opened));
  if (!opened.ok) {
    return result;
  }

  try {
    if (options.phase === "write") {
      const clearBefore = await adapter.clearNamespace(namespace);
      const persistent = await adapter.put(createPersistentRecord(namespace, 1));
      const transient = await adapter.put(createTransientRecord(namespace, 2));
      const persistentAfterPut = await adapter.get({
        namespace,
        kind: "draft",
        key: "browser-persistent-draft"
      });
      const listed = await adapter.list({ namespace });
      const exported = await adapter.exportSnapshot({ namespace });
      const imported = exported.value
        ? await adapter.importSnapshot(exported.value, { mode: "replace", allowOlderVersions: false })
        : exported;
      const cleanup = await adapter.cleanup({ removeRetentionClasses: ["transient"] });
      const persistentAfterCleanup = await adapter.get({
        namespace,
        kind: "draft",
        key: "browser-persistent-draft"
      });
      const quota = await adapter.estimateQuota();

      result.clearRemoved = clearBefore.value?.removedRecords ?? 0;
      result.putPersistentOk = persistent.ok;
      result.putTransientOk = transient.ok;
      result.getPersistentOk = persistentAfterPut.ok && persistentAfterCleanup.ok;
      result.listCount = listed.value?.length ?? 0;
      result.exportCount = exported.value?.records.length ?? 0;
      result.importCount = imported.value?.records.length ?? 0;
      result.cleanupRemoved = cleanup.value?.removedRecords ?? 0;
      result.reloadPersistentOk = false;
      result.quotaSupported = quota.value?.supported ?? false;
      result.diagnostics.push(
        ...diagnosticMessages(
          clearBefore,
          persistent,
          transient,
          persistentAfterPut,
          listed,
          exported,
          imported,
          cleanup,
          persistentAfterCleanup,
          quota
        )
      );
      return result;
    }

    const persistentAfterReload = await adapter.get({
      namespace,
      kind: "draft",
      key: "browser-persistent-draft"
    });
    const listedAfterReload = await adapter.list({ namespace });
    const quota = await adapter.estimateQuota();
    const clearAfter = await adapter.clearNamespace(namespace);
    const listedAfterClear = await adapter.list({ namespace });

    result.getPersistentOk = persistentAfterReload.ok;
    result.reloadPersistentOk = persistentAfterReload.ok;
    result.listCount = listedAfterReload.value?.length ?? 0;
    result.clearRemoved = clearAfter.value?.removedRecords ?? 0;
    result.postClearListCount = listedAfterClear.value?.length ?? 0;
    result.quotaSupported = quota.value?.supported ?? false;
    result.diagnostics.push(...diagnosticMessages(persistentAfterReload, listedAfterReload, quota, clearAfter, listedAfterClear));
    return result;
  } finally {
    const closed = await adapter.close();
    result.diagnostics.push(...diagnosticMessages(closed));
  }
}
