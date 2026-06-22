import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "playwright/test";
import type { PhysicsAdapterBrowserSmokeResult } from "../physics-adapter/physics-adapter-browser-smoke";
import type { BrowserSmokeResult } from "./result-schema";

interface PhysicsAdapterWindow extends Window {
  sinanMatureDependencySmokeCatalog?: {
    physicsAdapter?: () => Promise<PhysicsAdapterBrowserSmokeResult>;
  };
}

interface PhysicsAdapterBrowserSummary extends BrowserSmokeResult {
  result: PhysicsAdapterBrowserSmokeResult | null;
}

function writeSummary(result: PhysicsAdapterBrowserSummary): void {
  const reportDir = join(process.cwd(), "reports", "browser-smoke");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "physics-adapter-summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

test("runs PhysicsAdapter Rapier browser smoke through the Sinan contract", async ({ page }) => {
  const startedAt = Date.now();
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(`${error.name}: ${error.message}`);
  });

  await page.goto("/");

  const result = await page.evaluate(async () => {
    const catalog = (window as PhysicsAdapterWindow).sinanMatureDependencySmokeCatalog;
    return catalog?.physicsAdapter ? await catalog.physicsAdapter() : null;
  });

  const passed =
    result !== null &&
    result.supported &&
    result.bootOk &&
    result.worldOk &&
    result.bodyColliderOk &&
    result.stepOk &&
    result.eventOk &&
    result.queryOk &&
    result.fallbackOk &&
    result.disposeOk &&
    result.contractClean &&
    consoleErrors.length === 0;
  const status: BrowserSmokeResult["status"] = passed ? "PASS" : "CONTRACT-BLOCKED";

  writeSummary({
    candidate: "PhysicsAdapter / RapierPhysicsAdapter",
    status,
    decision: status,
    layer: status === "PASS" ? "candidate" : "contract",
    browser: "Playwright Chromium",
    port: 5184,
    durationMs: Date.now() - startedAt,
    command: "npm exec -- playwright test -c playwright.config.ts",
    consoleErrors,
    artifacts: ["reports/browser-smoke/physics-adapter-summary.json"],
    diagnostics: [
      `catalog entry available: ${result !== null}`,
      `supported: ${result?.supported ?? "unavailable"}`,
      `boot/world/body-collider/step: ${
        result ? `${result.bootOk}/${result.worldOk}/${result.bodyColliderOk}/${result.stepOk}` : "unavailable"
      }`,
      `event/query/fallback/dispose/contract-clean: ${
        result ? `${result.eventOk}/${result.queryOk}/${result.fallbackOk}/${result.disposeOk}/${result.contractClean}` : "unavailable"
      }`,
      ...(result?.diagnostics ?? [])
    ],
    timestamp: new Date().toISOString(),
    result
  });

  expect(result).not.toBeNull();
  expect(result?.supported).toBe(true);
  expect(result?.bootOk).toBe(true);
  expect(result?.worldOk).toBe(true);
  expect(result?.bodyColliderOk).toBe(true);
  expect(result?.stepOk).toBe(true);
  expect(result?.eventOk).toBe(true);
  expect(result?.queryOk).toBe(true);
  expect(result?.fallbackOk).toBe(true);
  expect(result?.disposeOk).toBe(true);
  expect(result?.contractClean).toBe(true);
  expect(consoleErrors).toEqual([]);
});
