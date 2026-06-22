import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "playwright/test";
import type { DiagnosticsAdapterBrowserSmokeResult } from "../diagnostics-adapter/diagnostics-adapter-browser-smoke";
import type { BrowserSmokeResult } from "./result-schema";

interface DiagnosticsAdapterWindow extends Window {
  sinanMatureDependencySmokeCatalog?: {
    diagnosticsAdapter?: () => Promise<DiagnosticsAdapterBrowserSmokeResult>;
  };
}

interface DiagnosticsAdapterBrowserSummary extends BrowserSmokeResult {
  result: DiagnosticsAdapterBrowserSmokeResult | null;
}

function writeSummary(result: DiagnosticsAdapterBrowserSummary): void {
  const reportDir = join(process.cwd(), "reports", "browser-smoke");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "diagnostics-adapter-summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

test("runs DiagnosticsAdapter browser smoke through the dev-only boundary", async ({ page }) => {
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
    const catalog = (window as DiagnosticsAdapterWindow).sinanMatureDependencySmokeCatalog;
    return catalog?.diagnosticsAdapter ? await catalog.diagnosticsAdapter() : null;
  });

  const passed =
    result !== null &&
    result.catalogEntry &&
    result.performanceOk &&
    result.disabledByDefaultOk &&
    result.productionDisabledOk &&
    result.policyTextPresent &&
    result.contractClean &&
    consoleErrors.length === 0;
  const status: BrowserSmokeResult["status"] = passed ? "PASS" : "CONTRACT-BLOCKED";

  writeSummary({
    candidate: "DiagnosticsAdapter dev-only",
    status,
    decision: status,
    layer: status === "PASS" ? "contract" : "policy",
    browser: "Playwright Chromium",
    port: 5184,
    durationMs: Date.now() - startedAt,
    command: "npm exec -- playwright test -c playwright.config.ts",
    consoleErrors,
    artifacts: ["reports/browser-smoke/diagnostics-adapter-summary.json"],
    diagnostics: [
      `catalog entry available: ${result !== null}`,
      `performance/disabled/default-production: ${
        result ? `${result.performanceOk}/${result.disabledByDefaultOk}/${result.productionDisabledOk}` : "unavailable"
      }`,
      `policy/contract-clean: ${result ? `${result.policyTextPresent}/${result.contractClean}` : "unavailable"}`,
      ...(result?.diagnostics ?? [])
    ],
    timestamp: new Date().toISOString(),
    result
  });

  expect(result).not.toBeNull();
  expect(result?.catalogEntry).toBe(true);
  expect(result?.performanceOk).toBe(true);
  expect(result?.disabledByDefaultOk).toBe(true);
  expect(result?.productionDisabledOk).toBe(true);
  expect(result?.policyTextPresent).toBe(true);
  expect(result?.contractClean).toBe(true);
  expect(consoleErrors).toEqual([]);
});
