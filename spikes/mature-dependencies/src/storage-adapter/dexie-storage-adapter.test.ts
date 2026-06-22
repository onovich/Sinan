import Dexie from "dexie";
import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, describe, expect, test } from "vitest";
import { DexieStorageAdapter } from "./dexie-storage-adapter";
import type { StorageConfig, StorageRecordSpec } from "./storage-types";

Dexie.dependencies.indexedDB = indexedDB as IDBFactory;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

const databaseNames = new Set<string>();
const adapters = new Set<DexieStorageAdapter>();

const createConfig = (namespace: string): StorageConfig => ({
  namespace,
  schemaVersion: 1,
  quotaPolicy: {
    hardLimitBytes: 1024 * 1024
  },
  cleanupPolicy: {
    removeRetentionClasses: ["transient"]
  },
  diagnosticsLevel: "standard"
});

const createDatabaseName = () => {
  const name = `sinan-dexie-storage-adapter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  databaseNames.add(name);
  return name;
};

const createAdapter = (config: StorageConfig, databaseName = createDatabaseName()) => {
  const adapter = new DexieStorageAdapter(config, {
    databaseName,
    indexedDB: indexedDB as IDBFactory,
    IDBKeyRange,
    now: () => 1000
  });
  adapters.add(adapter);
  return adapter;
};

const createRecord = (config: StorageConfig, key: string, updatedAt: number): StorageRecordSpec => ({
  namespace: config.namespace,
  key,
  kind: "draft",
  version: config.schemaVersion,
  retentionClass: "recoverable",
  updatedAt,
  payload: {
    source: "storage-adapter-test",
    key
  }
});

afterEach(async () => {
  for (const adapter of adapters) {
    await adapter.close();
  }
  adapters.clear();

  for (const databaseName of databaseNames) {
    await Dexie.delete(databaseName);
  }
  databaseNames.clear();
});

describe("DexieStorageAdapter", () => {
  test("reports unavailable before open and supports CRUD/list after open", async () => {
    const config = createConfig("sinan-dexie-crud");
    const adapter = createAdapter(config);

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

    await expect(adapter.open()).resolves.toMatchObject({
      ok: true,
      status: "success"
    });

    const put = await adapter.put(createRecord(config, "draft-a", 10));
    expect(put).toMatchObject({
      ok: true,
      status: "success",
      value: {
        key: "draft-a",
        createdAt: 1000
      }
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
        payload: {
          key: "draft-a"
        }
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

    await expect(
      adapter.get({
        namespace: config.namespace,
        kind: "draft",
        key: "draft-a"
      })
    ).resolves.toMatchObject({
      ok: false,
      status: "not-found"
    });
  });

  test("keeps namespaces isolated inside the adapter database", async () => {
    const databaseName = createDatabaseName();
    const configA = createConfig("sinan-dexie-namespace-a");
    const configB = createConfig("sinan-dexie-namespace-b");
    const adapterA = createAdapter(configA, databaseName);
    const adapterB = createAdapter(configB, databaseName);

    await adapterA.open();
    await adapterB.open();
    await adapterA.put(createRecord(configA, "draft-a", 1));
    await adapterB.put(createRecord(configB, "draft-b", 2));

    await expect(
      adapterA.list({
        namespace: configA.namespace
      })
    ).resolves.toMatchObject({
      value: [
        {
          key: "draft-a"
        }
      ]
    });
    await expect(
      adapterB.list({
        namespace: configB.namespace
      })
    ).resolves.toMatchObject({
      value: [
        {
          key: "draft-b"
        }
      ]
    });

    await expect(
      adapterA.list({
        namespace: configB.namespace
      })
    ).resolves.toMatchObject({
      ok: false,
      status: "conflict",
      diagnostics: [
        {
          code: "source-of-truth-guard"
        }
      ]
    });
  });

  test("does not expose Dexie internals through stored records or snapshots", async () => {
    const config = createConfig("sinan-storage-envelope");
    const adapter = createAdapter(config);
    await adapter.open();
    await adapter.put(createRecord(config, "draft-envelope", 3));

    const snapshot = await adapter.exportSnapshot({
      namespace: config.namespace
    });

    expect(snapshot).toMatchObject({
      ok: true,
      value: {
        format: "sinan-storage-adapter-snapshot",
        records: [
          {
            key: "draft-envelope"
          }
        ]
      }
    });
    expect(JSON.stringify(snapshot.value)).not.toMatch(/Dexie|indexedDB|table|transaction|request/i);
  });

  test("rejects invalid versions and checksum mismatches before replacing namespace data", async () => {
    const config = createConfig("sinan-storage-integrity");
    const adapter = createAdapter(config);
    await adapter.open();

    await expect(
      adapter.put({
        ...createRecord(config, "invalid-version", 1),
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

    await adapter.put(createRecord(config, "valid-before-import", 2));
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

  test("reports quota-exceeded when estimated Dexie usage crosses the hard limit", async () => {
    const config = {
      ...createConfig("sinan-storage-quota"),
      quotaPolicy: {
        hardLimitBytes: 160
      }
    };
    const adapter = createAdapter(config);
    await adapter.open();

    await expect(
      adapter.put({
        ...createRecord(config, "too-large", 1),
        payload: {
          large: "x".repeat(256)
        }
      })
    ).resolves.toMatchObject({
      ok: false,
      status: "quota-exceeded",
      diagnostics: [
        {
          code: "quota"
        }
      ]
    });
  });
});
