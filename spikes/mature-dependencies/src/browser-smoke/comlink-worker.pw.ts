import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "playwright/test";
import type { BrowserSmokeResult } from "./result-schema";

function writeSummary(result: BrowserSmokeResult): void {
  const reportDir = join(process.cwd(), "reports", "browser-smoke");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "comlink-worker-summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

test("runs Comlink Web Worker URL RPC transferable diagnostic terminate smoke", async ({ page }) => {
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
        comlink?: () => Promise<{
          supported: boolean;
          rpcOk: boolean;
          transferableAttempted: boolean;
          transferableDetached: boolean;
          structuredDiagnostic: string | null;
          terminated: boolean;
          adapterBoundary: string;
        }>;
      };
    }).sinanMatureDependencySmokeCatalog;

    if (!catalog?.comlink) {
      return {
        supported: false,
        rpcOk: false,
        transferableAttempted: false,
        transferableDetached: false,
        structuredDiagnostic: "Comlink smoke catalog entry is missing.",
        terminated: false,
        adapterBoundary: "missing"
      };
    }

    return catalog.comlink();
  });

  const status: BrowserSmokeResult["status"] =
    result.supported && result.rpcOk && result.transferableAttempted && result.structuredDiagnostic !== null && result.terminated
      ? "PASS"
      : "CANDIDATE-BLOCKED";

  writeSummary({
    candidate: "Comlink / Worker",
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
      `Worker supported: ${result.supported}`,
      `worker URL served through Vite module worker: ${result.supported}`,
      `RPC ok: ${result.rpcOk}`,
      `transferable attempted: ${result.transferableAttempted}`,
      `transferable detached: ${result.transferableDetached}`,
      `diagnostic error: ${result.structuredDiagnostic ?? "missing"}`,
      `terminate/dispose: ${result.terminated}`,
      `adapter boundary: ${result.adapterBoundary}`
    ],
    timestamp: new Date().toISOString()
  });

  expect(result.supported).toBe(true);
  expect(result.rpcOk).toBe(true);
  expect(result.transferableAttempted).toBe(true);
  expect(result.structuredDiagnostic).not.toBeNull();
  expect(result.terminated).toBe(true);
  expect(consoleErrors).toEqual([]);
});
