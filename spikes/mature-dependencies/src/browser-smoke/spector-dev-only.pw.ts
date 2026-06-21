import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "playwright/test";
import type { BrowserSmokeResult } from "./result-schema";

function writeSummary(result: BrowserSmokeResult): void {
  const reportDir = join(process.cwd(), "reports", "browser-smoke");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "spector-dev-only-summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

test("keeps Spector dev-only dynamic import disabled by default", async ({ page }) => {
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
        spector?: (options?: { enableCapture?: boolean }) => Promise<{
          performance: {
            supported: boolean;
            measureName: string;
            durationMs: number;
          };
          spector: {
            loaded: boolean;
            reason?: string;
            constructorFound?: boolean;
          };
          productionIsolation: string;
        }>;
      };
    }).sinanMatureDependencySmokeCatalog;

    if (!catalog?.spector) {
      return {
        performance: {
          supported: false,
          measureName: "missing",
          durationMs: 0
        },
        spector: {
          loaded: false,
          reason: "Spector smoke catalog entry is missing."
        },
        productionIsolation: "missing"
      };
    }

    return catalog.spector({ enableCapture: false });
  });

  const status: BrowserSmokeResult["status"] =
    result.performance.supported &&
    !result.spector.loaded &&
    result.spector.reason === "feature flag disabled" &&
    result.productionIsolation.includes("dynamic import")
      ? "PASS"
      : "CONTRACT-BLOCKED";

  writeSummary({
    candidate: "Spector.js",
    status,
    decision: status,
    layer: status === "PASS" ? "policy" : "contract",
    browser: "Playwright Chromium",
    port: 5184,
    durationMs: Date.now() - startedAt,
    command: "npm exec -- playwright test -c playwright.config.ts",
    consoleErrors,
    artifacts: [],
    diagnostics: [
      `Spector loaded: ${result.spector.loaded}`,
      `dev-only disabled reason: ${result.spector.reason ?? "none"}`,
      `production isolation: ${result.productionIsolation}`,
      `dynamic import guard present: ${result.productionIsolation.includes("dynamic import")}`,
      `performance marker supported: ${result.performance.supported}`
    ],
    timestamp: new Date().toISOString()
  });

  expect(result.performance.supported).toBe(true);
  expect(result.spector.loaded).toBe(false);
  expect(result.spector.reason).toBe("feature flag disabled");
  expect(result.productionIsolation).toContain("dynamic import");
  expect(consoleErrors).toEqual([]);
});
