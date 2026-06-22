import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "playwright/test";
import type { WorkerTaskAdapterBrowserSmokeResult } from "../worker-task/worker-task-browser-smoke";
import type { BrowserSmokeResult } from "./result-schema";

interface WorkerTaskAdapterWindow extends Window {
  sinanMatureDependencySmokeCatalog?: {
    workerTaskAdapter?: () => Promise<WorkerTaskAdapterBrowserSmokeResult>;
  };
}

interface WorkerTaskAdapterBrowserSummary extends BrowserSmokeResult {
  result: WorkerTaskAdapterBrowserSmokeResult | null;
}

function writeSummary(result: WorkerTaskAdapterBrowserSummary): void {
  const reportDir = join(process.cwd(), "reports", "browser-smoke");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "worker-task-adapter-summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

test("runs WorkerTaskAdapter Comlink Web Worker browser smoke", async ({ page }) => {
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
    const catalog = (window as WorkerTaskAdapterWindow).sinanMatureDependencySmokeCatalog;
    return catalog?.workerTaskAdapter ? await catalog.workerTaskAdapter() : null;
  });

  const passed =
    result !== null &&
    result.workerSupported &&
    result.bootOk &&
    result.loadReady &&
    result.echoOk &&
    result.sumOk &&
    result.transferPolicyOk &&
    result.invalidInputOk &&
    result.timeoutOk &&
    result.cancellationOk &&
    result.disposeOk &&
    consoleErrors.length === 0;
  const status: BrowserSmokeResult["status"] = passed ? "PASS" : "CANDIDATE-BLOCKED";

  writeSummary({
    candidate: "WorkerTaskAdapter / Comlink / Worker",
    status,
    decision: status,
    layer: status === "PASS" ? "candidate" : "contract",
    browser: "Playwright Chromium",
    port: 5184,
    durationMs: Date.now() - startedAt,
    command: "npm exec -- playwright test -c playwright.config.ts",
    consoleErrors,
    artifacts: ["reports/browser-smoke/worker-task-adapter-summary.json"],
    diagnostics: [
      `catalog entry available: ${result !== null}`,
      `Worker supported: ${result?.workerSupported ?? "unavailable"}`,
      `boot/load: ${result ? `${result.bootOk}/${result.loadReady}` : "unavailable"}`,
      `echo/sum/transfer: ${result ? `${result.echoOk}/${result.sumOk}/${result.transferPolicyOk}` : "unavailable"}`,
      `invalid-input/timeout/cancel/dispose: ${
        result ? `${result.invalidInputOk}/${result.timeoutOk}/${result.cancellationOk}/${result.disposeOk}` : "unavailable"
      }`,
      ...(result?.diagnostics ?? [])
    ],
    timestamp: new Date().toISOString(),
    result
  });

  expect(result).not.toBeNull();
  expect(result?.workerSupported).toBe(true);
  expect(result?.bootOk).toBe(true);
  expect(result?.loadReady).toBe(true);
  expect(result?.echoOk).toBe(true);
  expect(result?.sumOk).toBe(true);
  expect(result?.transferPolicyOk).toBe(true);
  expect(result?.invalidInputOk).toBe(true);
  expect(result?.timeoutOk).toBe(true);
  expect(result?.cancellationOk).toBe(true);
  expect(result?.disposeOk).toBe(true);
  expect(consoleErrors).toEqual([]);
});
