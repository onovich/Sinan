import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const reportDir = join(packageRoot, "reports", "browser-smoke");
const summaryPath = join(reportDir, "browser-baseline-summary.json");
const headed = process.argv.includes("--headed");

mkdirSync(reportDir, { recursive: true });

function writeSummary(summary) {
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

const expectedExecutable = chromium.executablePath();

if (!existsSync(expectedExecutable)) {
  writeSummary({
    candidate: "browser-baseline",
    status: "ENVIRONMENT-BLOCKED",
    layer: "environment",
    browser: "Playwright Chromium",
    port: 5184,
    command: "npm exec -- playwright test -c playwright.config.ts",
    diagnostics: [
      `Expected Playwright Chromium executable is missing: ${expectedExecutable}`,
      "Run npm exec -- playwright install chromium from spikes/mature-dependencies."
    ],
    artifacts: [],
    timestamp: nowIso()
  });
  console.log(`ENVIRONMENT-BLOCKED: missing Playwright Chromium executable at ${expectedExecutable}`);
  process.exit(0);
}

const args = ["exec", "--", "playwright", "test", "-c", "playwright.config.ts"];
if (headed) {
  args.push("--headed");
}

const result = spawnSync("npm", args, {
  cwd: packageRoot,
  encoding: "utf8",
  shell: true
});

const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();

if (result.status === 0) {
  writeSummary({
    candidate: "browser-baseline",
    status: "PASS",
    layer: "environment",
    browser: "Playwright Chromium",
    port: 5184,
    command: `npm ${args.join(" ")}`,
    diagnostics: ["Page load smoke passed and registry was visible."],
    artifacts: [],
    timestamp: nowIso()
  });
  process.stdout.write(output ? `${output}\n` : "");
  process.exit(0);
}

if (
  output.includes("Executable doesn't exist") ||
  output.includes("Looks like Playwright was just installed or updated")
) {
  writeSummary({
    candidate: "browser-baseline",
    status: "ENVIRONMENT-BLOCKED",
    layer: "environment",
    browser: "Playwright Chromium",
    port: 5184,
    command: `npm ${args.join(" ")}`,
    diagnostics: output.split(/\r?\n/).filter(Boolean).slice(-12),
    artifacts: [],
    timestamp: nowIso()
  });
  console.log("ENVIRONMENT-BLOCKED: Playwright browser launch failed because the managed browser is not installed.");
  process.exit(0);
}

process.stdout.write(output ? `${output}\n` : "");
process.exit(result.status ?? 1);
