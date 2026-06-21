import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "playwright/test";
import type { BrowserSmokeResult } from "./result-schema";

function writeSummary(result: BrowserSmokeResult): void {
  const reportDir = join(process.cwd(), "reports", "browser-smoke");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "recast-policy-skip-summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

test("records recast-navigation RFC-013 policy skip", async () => {
  writeSummary({
    candidate: "recast-navigation",
    status: "POLICY-SKIP",
    decision: "POLICY-SKIP",
    layer: "policy",
    browser: "Playwright Chromium",
    port: 5184,
    durationMs: 0,
    command: "npm exec -- playwright test -c playwright.config.ts",
    consoleErrors: [],
    artifacts: [],
    diagnostics: [
      "RFC-013 keeps NavigationAdapter and recast-navigation on hold.",
      "No browser smoke result may move recast-navigation out of hold-for-rfc in this goal."
    ],
    timestamp: new Date().toISOString()
  });
});
