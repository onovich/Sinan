import Dexie, { type Table } from "dexie";

export interface DraftSnapshotRecord {
  id: string;
  projectId: string;
  kind: "draft" | "runtime-save";
  payload: Record<string, unknown>;
  updatedAt: number;
}

export interface DexieSmokeResult {
  databaseName: string;
  usedFakeIndexedDb: boolean;
  schemaVersion: number;
  inserted: number;
  queryByProject: number;
  exported: number;
  imported: number;
  cleanedUp: boolean;
  adapterBoundary: string;
}

class SinanSpikeDatabase extends Dexie {
  drafts!: Table<DraftSnapshotRecord, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      drafts: "&id, kind, updatedAt"
    });
    this.version(2)
      .stores({
        drafts: "&id, projectId, kind, updatedAt"
      })
      .upgrade((transaction) =>
        transaction
          .table<DraftSnapshotRecord, string>("drafts")
          .toCollection()
          .modify((record) => {
            record.projectId = record.projectId || "legacy-project";
          })
      );
  }
}

async function ensureIndexedDb(forceFakeIndexedDb: boolean): Promise<boolean> {
  if (forceFakeIndexedDb || !globalThis.indexedDB) {
    const fakeIndexedDb = await import("fake-indexeddb");
    Dexie.dependencies.indexedDB = fakeIndexedDb.indexedDB;
    Dexie.dependencies.IDBKeyRange = fakeIndexedDb.IDBKeyRange;
    return true;
  }

  return false;
}

export async function runDexieSmoke(options: {
  databaseName?: string;
  forceFakeIndexedDb?: boolean;
} = {}): Promise<DexieSmokeResult> {
  const databaseName = options.databaseName ?? `sinan-spike-${Date.now()}`;
  const usedFakeIndexedDb = await ensureIndexedDb(options.forceFakeIndexedDb ?? false);

  await Dexie.delete(databaseName);

  const db = new SinanSpikeDatabase(databaseName);
  await db.open();

  const records: DraftSnapshotRecord[] = [
    {
      id: "draft-level-01",
      projectId: "sinan-demo",
      kind: "draft",
      payload: { source: "json-snapshot", entityCount: 5 },
      updatedAt: 1
    },
    {
      id: "runtime-save-01",
      projectId: "sinan-demo",
      kind: "runtime-save",
      payload: { checkpoint: "gate-opened" },
      updatedAt: 2
    }
  ];

  await db.drafts.bulkPut(records);
  const queryByProject = await db.drafts.where("projectId").equals("sinan-demo").count();
  const exported = await db.drafts.orderBy("updatedAt").toArray();
  await db.drafts.clear();
  await db.drafts.bulkPut(exported);
  const imported = await db.drafts.count();
  db.close();
  await Dexie.delete(databaseName);

  return {
    databaseName,
    usedFakeIndexedDb,
    schemaVersion: db.verno,
    inserted: records.length,
    queryByProject,
    exported: exported.length,
    imported,
    cleanedUp: true,
    adapterBoundary: "Sinan StorageAdapter contract -> Dexie adapter -> IndexedDB"
  };
}
