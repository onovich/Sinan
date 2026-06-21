import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const browserSmokeStatuses = [
  "PASS",
  "POLICY-SKIP",
  "ENVIRONMENT-BLOCKED",
  "BUNDLE-BLOCKED",
  "CANDIDATE-BLOCKED",
  "CONTRACT-BLOCKED"
];

export function writeBrowserSmokeSummary(packageRoot, fileName, result) {
  const reportDir = join(packageRoot, "reports", "browser-smoke");
  mkdirSync(reportDir, { recursive: true });

  const status = result.status;
  if (!browserSmokeStatuses.includes(status)) {
    throw new Error(`Invalid browser smoke status: ${status}`);
  }

  const normalized = {
    candidate: result.candidate,
    status,
    decision: result.decision ?? status,
    layer: result.layer,
    browser: result.browser,
    port: result.port,
    durationMs: result.durationMs ?? 0,
    command: result.command,
    consoleErrors: result.consoleErrors ?? [],
    artifacts: result.artifacts ?? [],
    diagnostics: result.diagnostics ?? [],
    timestamp: result.timestamp ?? new Date().toISOString()
  };

  const summaryPath = join(reportDir, fileName);
  writeFileSync(summaryPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return summaryPath;
}
