import { describe, expect, test } from "vitest";
import {
  storageDiagnosticCodes,
  storageRecordKinds,
  storageResultStatuses,
  storageRetentionClasses,
  type StorageAdapter,
  type StorageResult,
  type StorageSnapshot
} from "./storage-types";

const successResult = <TValue>(value?: TValue): StorageResult<TValue> => ({
  status: "success",
  ok: true,
  value,
  diagnostics: [],
  volatile: false
});

describe("StorageAdapter contract types", () => {
  test("exposes the RFC-008 result statuses and diagnostics", () => {
    expect(storageResultStatuses).toEqual([
      "success",
      "not-found",
      "conflict",
      "invalid-version",
      "quota-exceeded",
      "unavailable",
      "fallback",
      "volatile"
    ]);
    expect(storageDiagnosticCodes).toContain("quota");
    expect(storageDiagnosticCodes).toContain("volatile-fallback");
    expect(storageRecordKinds).toContain("runtime-save");
    expect(storageRetentionClasses).toContain("transient");
  });

  test("keeps the snapshot envelope Sinan-owned and Dexie-free", async () => {
    const snapshot: StorageSnapshot = {
      format: "sinan-storage-adapter-snapshot",
      schemaVersion: 1,
      namespace: "sinan-storage-contract-test",
      exportedAt: new Date(0).toISOString(),
      records: [],
      diagnostics: []
    };

    const adapter: StorageAdapter = {
      config: {
        namespace: "sinan-storage-contract-test",
        schemaVersion: 1,
        quotaPolicy: {},
        cleanupPolicy: {
          removeRetentionClasses: ["transient"]
        },
        diagnosticsLevel: "standard"
      },
      open: async () => successResult(),
      close: async () => successResult(),
      get: async () => ({
        status: "not-found",
        ok: false,
        diagnostics: [],
        volatile: false
      }),
      put: async (record) =>
        successResult({
          ...record,
          checksum: record.checksum ?? "contract-test-checksum",
          createdAt: record.updatedAt
        }),
      delete: async () => successResult(),
      list: async () => successResult([]),
      exportSnapshot: async () => successResult(snapshot),
      importSnapshot: async (input) => successResult(input),
      cleanup: async () =>
        successResult({
          removedRecords: 0,
          retainedRecords: 0
        }),
      clearNamespace: async () =>
        successResult({
          removedRecords: 0,
          retainedRecords: 0
        }),
      estimateQuota: async () =>
        successResult({
          supported: false
        })
    };

    await expect(adapter.exportSnapshot({ namespace: snapshot.namespace })).resolves.toMatchObject({
      ok: true,
      value: {
        format: "sinan-storage-adapter-snapshot",
        records: []
      }
    });
    expect(JSON.stringify(snapshot)).not.toMatch(/Dexie|indexedDB|table|transaction/i);
  });
});
