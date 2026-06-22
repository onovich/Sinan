import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "playwright/test";
import type { StorageAdapterBrowserSmokeOptions, StorageAdapterBrowserSmokeResult } from "../storage-adapter/storage-adapter-browser-smoke";
import type { BrowserSmokeResult } from "./result-schema";

interface StorageAdapterWindow extends Window {
  sinanMatureDependencySmokeCatalog?: {
    storageAdapter?: (options: StorageAdapterBrowserSmokeOptions) => Promise<StorageAdapterBrowserSmokeResult>;
  };
}

interface StorageAdapterBrowserSummary extends BrowserSmokeResult {
  write: StorageAdapterBrowserSmokeResult | null;
  reload: StorageAdapterBrowserSmokeResult | null;
}

function writeSummary(result: StorageAdapterBrowserSummary): void {
  const reportDir = join(process.cwd(), "reports", "storage-adapter");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "storage-adapter-browser-summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

test("runs StorageAdapter Dexie IndexedDB browser reload smoke", async ({ page }) => {
  const startedAt = Date.now();
  const consoleErrors: string[] = [];
  const databaseName = `sinan-storage-adapter-browser-${Date.now()}`;
  const namespace = "sinan-storage-adapter-browser-smoke";

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(`${error.name}: ${error.message}`);
  });

  await page.goto("/");

  const write = await page.evaluate(async (options) => {
    const catalog = (window as StorageAdapterWindow).sinanMatureDependencySmokeCatalog;
    return catalog?.storageAdapter ? await catalog.storageAdapter(options) : null;
  }, { databaseName, namespace, phase: "write" } satisfies StorageAdapterBrowserSmokeOptions);

  await page.reload();

  const reload = await page.evaluate(async (options) => {
    const catalog = (window as StorageAdapterWindow).sinanMatureDependencySmokeCatalog;
    return catalog?.storageAdapter ? await catalog.storageAdapter(options) : null;
  }, { databaseName, namespace, phase: "verify" } satisfies StorageAdapterBrowserSmokeOptions);

  const passed =
    write !== null &&
    reload !== null &&
    write.indexedDbAvailable &&
    reload.indexedDbAvailable &&
    write.openOk &&
    reload.openOk &&
    write.putPersistentOk &&
    write.putTransientOk &&
    write.getPersistentOk &&
    write.listCount === 2 &&
    write.exportCount === 2 &&
    write.importCount === 2 &&
    write.cleanupRemoved === 1 &&
    reload.reloadPersistentOk &&
    reload.listCount === 1 &&
    reload.clearRemoved === 1 &&
    !write.usedFallback &&
    !reload.usedFallback;
  const status: BrowserSmokeResult["status"] = passed ? "PASS" : "CANDIDATE-BLOCKED";

  writeSummary({
    candidate: "StorageAdapter / Dexie / IndexedDB",
    status,
    decision: status,
    layer: status === "PASS" ? "candidate" : "contract",
    browser: "Playwright Chromium",
    port: 5184,
    durationMs: Date.now() - startedAt,
    command: "npm exec -- playwright test -c playwright.config.ts",
    consoleErrors,
    artifacts: ["reports/storage-adapter/storage-adapter-browser-summary.json"],
    diagnostics: [
      `StorageAdapter catalog entry available: ${write !== null}`,
      `IndexedDB available: ${write?.indexedDbAvailable ?? "unavailable"}`,
      `write open/put/get/list/export/import/cleanup: ${
        write
          ? `${write.openOk}/${write.putPersistentOk && write.putTransientOk}/${write.getPersistentOk}/${write.listCount}/${write.exportCount}/${write.importCount}/${write.cleanupRemoved}`
          : "unavailable"
      }`,
      `reload open/get/list/clear: ${reload ? `${reload.openOk}/${reload.reloadPersistentOk}/${reload.listCount}/${reload.clearRemoved}` : "unavailable"}`,
      `quota estimate supported: ${write?.quotaSupported ?? "unavailable"}`,
      `fallback used: ${write?.usedFallback ?? "unavailable"} / ${reload?.usedFallback ?? "unavailable"}`,
      ...(write?.diagnostics ?? []),
      ...(reload?.diagnostics ?? [])
    ],
    timestamp: new Date().toISOString(),
    write,
    reload
  });

  expect(write).not.toBeNull();
  expect(reload).not.toBeNull();
  expect(write?.indexedDbAvailable).toBe(true);
  expect(write?.openOk).toBe(true);
  expect(write?.putPersistentOk).toBe(true);
  expect(write?.putTransientOk).toBe(true);
  expect(write?.getPersistentOk).toBe(true);
  expect(write?.listCount).toBe(2);
  expect(write?.exportCount).toBe(2);
  expect(write?.importCount).toBe(2);
  expect(write?.cleanupRemoved).toBe(1);
  expect(write?.usedFallback).toBe(false);
  expect(reload?.openOk).toBe(true);
  expect(reload?.reloadPersistentOk).toBe(true);
  expect(reload?.listCount).toBe(1);
  expect(reload?.clearRemoved).toBe(1);
  expect(reload?.usedFallback).toBe(false);
  expect(consoleErrors).toEqual([]);
});
