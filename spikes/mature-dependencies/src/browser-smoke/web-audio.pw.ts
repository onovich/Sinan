import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "playwright/test";
import type { BrowserSmokeResult } from "./result-schema";

function writeSummary(result: BrowserSmokeResult): void {
  const reportDir = join(process.cwd(), "reports", "browser-smoke");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "web-audio-summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

test("runs Web Audio unlock and fallback diagnostic smoke", async ({ page }) => {
  const startedAt = Date.now();
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");
  await page.mouse.click(12, 12);

  const result = await page.evaluate(async () => {
    const catalog = (window as Window & {
      sinanMatureDependencySmokeCatalog?: {
        webAudio?: () => Promise<{
          supported: boolean;
          unlockAttempted: boolean;
          stateBefore?: string;
          stateAfter?: string;
          mixerCreated: boolean;
          spatialNodeCreated: boolean;
          oneShotScheduled: boolean;
          diagnostics: string[];
        }>;
      };
    }).sinanMatureDependencySmokeCatalog;

    if (!catalog?.webAudio) {
      return {
        supported: false,
        unlockAttempted: false,
        mixerCreated: false,
        spatialNodeCreated: false,
        oneShotScheduled: false,
        diagnostics: ["Web Audio smoke catalog entry is missing."]
      };
    }

    return catalog.webAudio();
  });

  const status = result.supported && result.unlockAttempted && result.mixerCreated ? "PASS" : "CANDIDATE-BLOCKED";

  writeSummary({
    candidate: "Web Audio",
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
      `AudioContext supported: ${result.supported}`,
      `AudioContext state before unlock: ${result.stateBefore ?? "unavailable"}`,
      `AudioContext state after unlock: ${result.stateAfter ?? "unavailable"}`,
      `unlock attempted: ${result.unlockAttempted}`,
      `autoplay/user gesture path exercised: ${result.unlockAttempted}`,
      `fallback diagnostics: ${result.diagnostics.join("; ") || "none"}`
    ],
    timestamp: new Date().toISOString()
  });

  expect(result.supported).toBe(true);
  expect(result.unlockAttempted).toBe(true);
  expect(result.mixerCreated).toBe(true);
  expect(result.spatialNodeCreated).toBe(true);
  expect(result.oneShotScheduled).toBe(true);
  expect(consoleErrors).toEqual([]);
});
