import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "playwright/test";
import type { BrowserSmokeResult } from "./result-schema";

function writeSummary(result: BrowserSmokeResult): void {
  const reportDir = join(process.cwd(), "reports", "browser-smoke");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "rapier-wasm-summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

test("runs Rapier WASM dynamic import init and world step smoke", async ({ page }) => {
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
        rapier?: () => Promise<{
          packageName: string;
          packageVersion: string;
          basePackageImport: {
            ok: boolean;
            error?: string;
          };
          worldStepped: boolean;
          dynamicBodyY: number;
          raycastHit: boolean;
          contactEvents: number;
          triggerEvents: number;
          adapterBoundary: string;
        }>;
      };
    }).sinanMatureDependencySmokeCatalog;

    if (!catalog?.rapier) {
      return {
        packageName: "@dimforge/rapier3d-compat",
        packageVersion: "missing",
        basePackageImport: {
          ok: false,
          error: "Rapier smoke catalog entry is missing."
        },
        worldStepped: false,
        dynamicBodyY: 0,
        raycastHit: false,
        contactEvents: 0,
        triggerEvents: 0,
        adapterBoundary: "missing"
      };
    }

    return catalog.rapier();
  });

  const status: BrowserSmokeResult["status"] =
    result.worldStepped && result.raycastHit && result.packageVersion !== "missing" ? "PASS" : "CANDIDATE-BLOCKED";

  writeSummary({
    candidate: "Rapier / WASM",
    status,
    decision: status,
    layer: status === "PASS" ? "candidate" : "bundle",
    browser: "Playwright Chromium",
    port: 5184,
    durationMs: Date.now() - startedAt,
    command: "npm exec -- playwright test -c playwright.config.ts",
    consoleErrors,
    artifacts: [],
    diagnostics: [
      `package: ${result.packageName}`,
      `version: ${result.packageVersion}`,
      `dynamic import base package ok: ${result.basePackageImport.ok}`,
      `dynamic import base package error: ${result.basePackageImport.error ?? "none"}`,
      `WASM init and world step: ${result.worldStepped}`,
      `dynamic body y: ${result.dynamicBodyY}`,
      `raycast hit: ${result.raycastHit}`,
      `contact events: ${result.contactEvents}`,
      `trigger events: ${result.triggerEvents}`,
      `adapter boundary: ${result.adapterBoundary}`
    ],
    timestamp: new Date().toISOString()
  });

  expect(result.worldStepped).toBe(true);
  expect(result.raycastHit).toBe(true);
  expect(consoleErrors).toEqual([]);
});
