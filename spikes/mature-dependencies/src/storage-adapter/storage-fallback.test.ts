import { describe, expect, test } from "vitest";
import { openStorageAdapterWithVolatileFallback } from "./storage-fallback";
import type { StorageAdapter, StorageConfig, StorageResult } from "./storage-types";

const config: StorageConfig = {
  namespace: "sinan-storage-fallback-test",
  schemaVersion: 1,
  quotaPolicy: {},
  cleanupPolicy: {
    removeRetentionClasses: ["transient"]
  },
  diagnosticsLevel: "standard"
};

const unavailablePrimary: StorageAdapter = {
  config,
  open: async (): Promise<StorageResult> => ({
    status: "unavailable",
    ok: false,
    diagnostics: [
      {
        code: "unsupported-browser",
        severity: "error",
        message: "Simulated IndexedDB unavailable state.",
        retryable: true
      }
    ],
    volatile: false
  }),
  close: async () => ({ status: "success", ok: true, diagnostics: [], volatile: false }),
  get: async () => ({ status: "unavailable", ok: false, diagnostics: [], volatile: false }),
  put: async () => ({ status: "unavailable", ok: false, diagnostics: [], volatile: false }),
  delete: async () => ({ status: "unavailable", ok: false, diagnostics: [], volatile: false }),
  list: async () => ({ status: "unavailable", ok: false, diagnostics: [], volatile: false }),
  exportSnapshot: async () => ({ status: "unavailable", ok: false, diagnostics: [], volatile: false }),
  importSnapshot: async () => ({ status: "unavailable", ok: false, diagnostics: [], volatile: false }),
  cleanup: async () => ({ status: "unavailable", ok: false, diagnostics: [], volatile: false }),
  clearNamespace: async () => ({ status: "unavailable", ok: false, diagnostics: [], volatile: false }),
  estimateQuota: async () => ({ status: "unavailable", ok: false, diagnostics: [], volatile: false })
};

describe("storage volatile fallback", () => {
  test("opens a volatile memory adapter when the primary adapter is unavailable", async () => {
    const fallback = await openStorageAdapterWithVolatileFallback(unavailablePrimary);

    expect(fallback).toMatchObject({
      usedFallback: true,
      result: {
        ok: true,
        status: "fallback",
        volatile: true
      }
    });
    expect(fallback.result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "unsupported-browser",
      "volatile-fallback",
      "volatile-fallback"
    ]);

    await expect(
      fallback.adapter.put({
        namespace: config.namespace,
        key: "volatile-record",
        kind: "draft",
        version: config.schemaVersion,
        retentionClass: "recoverable",
        updatedAt: 1,
        payload: {
          source: "fallback-test"
        }
      })
    ).resolves.toMatchObject({
      ok: true,
      status: "volatile",
      volatile: true
    });
  });
});
