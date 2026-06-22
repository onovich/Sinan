import { describe, expect, test } from "vitest";
import { MemoryStorageAdapter } from "./memory-storage-adapter";
import type { StorageConfig, StorageRecordSpec } from "./storage-types";

const config: StorageConfig = {
  namespace: "sinan-memory-storage-test",
  schemaVersion: 1,
  quotaPolicy: {
    hardLimitBytes: 1024 * 1024
  },
  cleanupPolicy: {
    removeRetentionClasses: ["transient"]
  },
  diagnosticsLevel: "standard"
};

const createRecord = (key: string, updatedAt: number, retentionClass: StorageRecordSpec["retentionClass"]) => ({
  namespace: config.namespace,
  key,
  kind: "draft" as const,
  version: config.schemaVersion,
  retentionClass,
  updatedAt,
  payload: {
    source: "memory-storage-adapter-test",
    key
  }
});

describe("MemoryStorageAdapter", () => {
  test("reports unavailable before open and not-found for empty reads", async () => {
    const adapter = new MemoryStorageAdapter(config);

    await expect(
      adapter.get({
        namespace: config.namespace,
        kind: "draft",
        key: "missing"
      })
    ).resolves.toMatchObject({
      ok: false,
      status: "unavailable"
    });

    await adapter.open();

    await expect(
      adapter.get({
        namespace: config.namespace,
        kind: "draft",
        key: "missing"
      })
    ).resolves.toMatchObject({
      ok: false,
      status: "not-found"
    });
  });

  test("supports put, get, list, delete, and quota estimate", async () => {
    const adapter = new MemoryStorageAdapter(config, {
      now: () => 100
    });

    await adapter.open();
    const put = await adapter.put(createRecord("draft-a", 10, "recoverable"));

    expect(put).toMatchObject({
      ok: true,
      status: "success",
      volatile: false
    });
    expect(put.value?.checksum).toMatch(/^fnv1a-/);

    await expect(
      adapter.get({
        namespace: config.namespace,
        kind: "draft",
        key: "draft-a"
      })
    ).resolves.toMatchObject({
      ok: true,
      value: {
        key: "draft-a",
        createdAt: 100
      }
    });

    await expect(
      adapter.list({
        namespace: config.namespace,
        kind: "draft"
      })
    ).resolves.toMatchObject({
      ok: true,
      value: [
        {
          key: "draft-a"
        }
      ]
    });

    await expect(adapter.estimateQuota()).resolves.toMatchObject({
      ok: true,
      value: {
        supported: true,
        quotaBytes: config.quotaPolicy.hardLimitBytes
      }
    });

    await expect(
      adapter.delete({
        namespace: config.namespace,
        kind: "draft",
        key: "draft-a"
      })
    ).resolves.toMatchObject({
      ok: true,
      status: "success"
    });
  });

  test("exports, imports, and clears a Dexie-free snapshot envelope", async () => {
    const source = new MemoryStorageAdapter(config, {
      now: () => 200
    });
    await source.open();
    await source.put(createRecord("draft-export", 20, "recoverable"));

    const snapshot = await source.exportSnapshot({
      namespace: config.namespace
    });

    expect(snapshot).toMatchObject({
      ok: true,
      value: {
        format: "sinan-storage-adapter-snapshot",
        namespace: config.namespace,
        records: [
          {
            key: "draft-export"
          }
        ]
      }
    });
    expect(JSON.stringify(snapshot.value)).not.toMatch(/Dexie|indexedDB|table|transaction/i);

    const target = new MemoryStorageAdapter(config);
    await target.open();
    const imported = await target.importSnapshot(snapshot.value!, {
      mode: "replace",
      allowOlderVersions: false
    });

    expect(imported).toMatchObject({
      ok: true,
      value: {
        records: [
          {
            key: "draft-export"
          }
        ]
      }
    });

    await expect(target.clearNamespace(config.namespace)).resolves.toMatchObject({
      ok: true,
      value: {
        removedRecords: 1,
        retainedRecords: 0
      }
    });
  });

  test("rejects invalid versions and checksum mismatches without accepting a bad snapshot", async () => {
    const adapter = new MemoryStorageAdapter(config);
    await adapter.open();

    await expect(
      adapter.put({
        ...createRecord("invalid-version", 1, "recoverable"),
        version: config.schemaVersion + 1
      })
    ).resolves.toMatchObject({
      ok: false,
      status: "invalid-version",
      diagnostics: [
        {
          code: "upgrade"
        }
      ]
    });

    await adapter.put(createRecord("valid-before-import", 2, "recoverable"));
    const snapshot = await adapter.exportSnapshot({
      namespace: config.namespace
    });
    const corruptedSnapshot = {
      ...snapshot.value!,
      records: snapshot.value!.records.map((record) => ({
        ...record,
        payload: {
          corrupted: true
        },
        checksum: "fnv1a-deadbeef"
      }))
    };

    await expect(
      adapter.importSnapshot(corruptedSnapshot, {
        mode: "replace",
        allowOlderVersions: false
      })
    ).resolves.toMatchObject({
      ok: false,
      status: "conflict",
      diagnostics: [
        {
          code: "corruption-checksum"
        }
      ]
    });

    await expect(
      adapter.list({
        namespace: config.namespace
      })
    ).resolves.toMatchObject({
      value: [
        {
          key: "valid-before-import"
        }
      ]
    });

    await expect(
      adapter.importSnapshot(
        {
          ...snapshot.value!,
          schemaVersion: config.schemaVersion + 1
        },
        {
          mode: "merge",
          allowOlderVersions: false
        }
      )
    ).resolves.toMatchObject({
      ok: false,
      status: "invalid-version"
    });
  });

  test("cleans transient records while retaining persistent records", async () => {
    const adapter = new MemoryStorageAdapter(config);
    await adapter.open();
    await adapter.put(createRecord("transient-a", 1, "transient"));
    await adapter.put(createRecord("persistent-a", 2, "persistent"));

    await expect(adapter.cleanup()).resolves.toMatchObject({
      ok: true,
      value: {
        removedRecords: 1,
        retainedRecords: 1
      }
    });

    await expect(
      adapter.list({
        namespace: config.namespace
      })
    ).resolves.toMatchObject({
      value: [
        {
          key: "persistent-a"
        }
      ]
    });
  });

  test("marks in-memory fallback writes as volatile with diagnostics", async () => {
    const adapter = new MemoryStorageAdapter(config, {
      volatile: true,
      fallbackReason: "IndexedDB unavailable in this simulated environment"
    });

    await expect(adapter.open()).resolves.toMatchObject({
      ok: true,
      status: "volatile",
      volatile: true,
      diagnostics: [
        {
          code: "volatile-fallback"
        }
      ]
    });

    await expect(adapter.put(createRecord("volatile-a", 1, "recoverable"))).resolves.toMatchObject({
      ok: true,
      status: "volatile",
      volatile: true,
      diagnostics: [
        {
          code: "volatile-fallback"
        }
      ]
    });
  });
});
