import { describe, expect, test } from "vitest";
import { runDexieSmoke } from "./dexie-smoke";

describe("Dexie smoke", () => {
  test("supports schema, index query, export/import, and cleanup through fake-indexeddb", async () => {
    const result = await runDexieSmoke({
      databaseName: "sinan-dexie-vitest-smoke",
      forceFakeIndexedDb: true
    });

    expect(result.usedFakeIndexedDb).toBe(true);
    expect(result.schemaVersion).toBe(2);
    expect(result.inserted).toBe(2);
    expect(result.queryByProject).toBe(2);
    expect(result.exported).toBe(2);
    expect(result.imported).toBe(2);
    expect(result.cleanedUp).toBe(true);
  });
});
