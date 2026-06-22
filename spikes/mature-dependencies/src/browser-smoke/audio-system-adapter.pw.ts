import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "playwright/test";
import type { AudioSystemBrowserSmokeResult } from "../audio-system/audio-system-browser-smoke";
import type { BrowserSmokeResult } from "./result-schema";

interface AudioSystemWindow extends Window {
  sinanMatureDependencySmokeCatalog?: {
    audioSystem?: () => Promise<AudioSystemBrowserSmokeResult>;
  };
}

interface AudioSystemBrowserSummary extends BrowserSmokeResult {
  result: AudioSystemBrowserSmokeResult | null;
}

function writeSummary(result: AudioSystemBrowserSummary): void {
  const reportDir = join(process.cwd(), "reports", "browser-smoke");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "audio-system-summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

test("runs AudioSystem WebAudioAdapter browser smoke through the Sinan contract", async ({ page }) => {
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
  await page.mouse.click(12, 12);

  const result = await page.evaluate(async () => {
    const catalog = (window as AudioSystemWindow).sinanMatureDependencySmokeCatalog;
    return catalog?.audioSystem ? await catalog.audioSystem() : null;
  });

  const passed =
    result !== null &&
    result.supported &&
    result.bootOk &&
    result.unlockOk &&
    result.preloadOk &&
    result.playOk &&
    result.completionOk &&
    result.spatialOk &&
    result.busOk &&
    result.listenerOk &&
    result.fallbackOk &&
    result.disposeOk &&
    result.contractClean &&
    consoleErrors.length === 0;
  const status: BrowserSmokeResult["status"] = passed ? "PASS" : "CONTRACT-BLOCKED";

  writeSummary({
    candidate: "AudioSystem / WebAudioSystemAdapter",
    status,
    decision: status,
    layer: status === "PASS" ? "candidate" : "contract",
    browser: "Playwright Chromium",
    port: 5184,
    durationMs: Date.now() - startedAt,
    command: "npm exec -- playwright test -c playwright.config.ts",
    consoleErrors,
    artifacts: ["reports/browser-smoke/audio-system-summary.json"],
    diagnostics: [
      `catalog entry available: ${result !== null}`,
      `supported: ${result?.supported ?? "unavailable"}`,
      `boot/unlock/preload/play: ${result ? `${result.bootOk}/${result.unlockOk}/${result.preloadOk}/${result.playOk}` : "unavailable"}`,
      `completion/spatial/bus/listener: ${
        result ? `${result.completionOk}/${result.spatialOk}/${result.busOk}/${result.listenerOk}` : "unavailable"
      }`,
      `fallback/dispose/contract-clean: ${
        result ? `${result.fallbackOk}/${result.disposeOk}/${result.contractClean}` : "unavailable"
      }`,
      ...(result?.diagnostics ?? [])
    ],
    timestamp: new Date().toISOString(),
    result
  });

  expect(result).not.toBeNull();
  expect(result?.supported).toBe(true);
  expect(result?.bootOk).toBe(true);
  expect(result?.unlockOk).toBe(true);
  expect(result?.preloadOk).toBe(true);
  expect(result?.playOk).toBe(true);
  expect(result?.completionOk).toBe(true);
  expect(result?.spatialOk).toBe(true);
  expect(result?.busOk).toBe(true);
  expect(result?.listenerOk).toBe(true);
  expect(result?.fallbackOk).toBe(true);
  expect(result?.disposeOk).toBe(true);
  expect(result?.contractClean).toBe(true);
  expect(consoleErrors).toEqual([]);
});
