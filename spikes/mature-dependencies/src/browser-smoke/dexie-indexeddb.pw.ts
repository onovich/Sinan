import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "playwright/test";
import type { BrowserSmokeResult } from "./result-schema";

function writeSummary(result: BrowserSmokeResult): void {
  const reportDir = join(process.cwd(), "reports", "browser-smoke");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "dexie-indexeddb-summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

test("runs Dexie IndexedDB quota reload cleanup export import smoke", async ({ page }) => {
  const startedAt = Date.now();
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");

  const result = await page.evaluate(async () => {
    const catalog = (window as Window & {
      sinanMatureDependencySmokeCatalog?: {
        dexie?: (options?: { databaseName?: string; forceFakeIndexedDb?: boolean }) => Promise<{
          databaseName: string;
          usedFakeIndexedDb: boolean;
          schemaVersion: number;
          inserted: number;
          queryByProject: number;
          exported: number;
          imported: number;
          cleanedUp: boolean;
          adapterBoundary: string;
        }>;
      };
    }).sinanMatureDependencySmokeCatalog;

    const quota = await navigator.storage?.estimate?.();

    if (!catalog?.dexie) {
      return {
        smoke: null,
        quota,
        indexedDbAvailable: typeof indexedDB !== "undefined",
        diagnostics: ["Dexie smoke catalog entry is missing."]
      };
    }

    const smoke = await catalog.dexie({
      databaseName: "sinan-browser-smoke-dexie",
      forceFakeIndexedDb: false
    });

    return {
      smoke,
      quota,
      indexedDbAvailable: typeof indexedDB !== "undefined",
      diagnostics: []
    };
  });

  await page.reload();

  const reloadState = await page.evaluate(() => ({
    indexedDbAvailable: typeof indexedDB !== "undefined",
    storageEstimateAvailable: typeof navigator.storage?.estimate === "function"
  }));

  const smoke = result.smoke;
  const status: BrowserSmokeResult["status"] =
    result.indexedDbAvailable &&
    smoke !== null &&
    !smoke.usedFakeIndexedDb &&
    smoke.inserted === 2 &&
    smoke.exported === 2 &&
    smoke.imported === 2 &&
    smoke.cleanedUp
      ? "PASS"
      : "CANDIDATE-BLOCKED";

  writeSummary({
    candidate: "Dexie / IndexedDB",
    status,
    decision: status,
    layer: status === "PASS" ? "candidate" : "environment",
    browser: "Playwright Chromium",
    port: 5184,
    durationMs: Date.now() - startedAt,
    command: "npm exec -- playwright test -c playwright.config.ts",
    consoleErrors,
    artifacts: [],
    diagnostics: [
      `IndexedDB available: ${result.indexedDbAvailable}`,
      `Dexie used fake IndexedDB: ${smoke?.usedFakeIndexedDb ?? "unavailable"}`,
      `schema version: ${smoke?.schemaVersion ?? "unavailable"}`,
      `inserted/export/import: ${smoke ? `${smoke.inserted}/${smoke.exported}/${smoke.imported}` : "unavailable"}`,
      `cleanup: ${smoke?.cleanedUp ?? "unavailable"}`,
      `quota: ${result.quota?.quota ?? "unavailable"}`,
      `usage: ${result.quota?.usage ?? "unavailable"}`,
      `reload IndexedDB available: ${reloadState.indexedDbAvailable}`,
      `reload storage estimate available: ${reloadState.storageEstimateAvailable}`,
      ...result.diagnostics
    ],
    timestamp: new Date().toISOString()
  });

  expect(result.indexedDbAvailable).toBe(true);
  expect(smoke).not.toBeNull();
  expect(smoke?.usedFakeIndexedDb).toBe(false);
  expect(smoke?.inserted).toBe(2);
  expect(smoke?.exported).toBe(2);
  expect(smoke?.imported).toBe(2);
  expect(smoke?.cleanedUp).toBe(true);
  expect(reloadState.indexedDbAvailable).toBe(true);
  expect(consoleErrors).toEqual([]);
});
