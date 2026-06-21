import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { writeBrowserSmokeSummary } from "./result-writer.mjs";

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const headed = process.argv.includes("--headed");
const startedAt = Date.now();

function nowIso() {
  return new Date().toISOString();
}

function durationMs() {
  return Date.now() - startedAt;
}

const expectedExecutable = chromium.executablePath();

if (!existsSync(expectedExecutable)) {
  const diagnostics = [
    `Expected Playwright Chromium executable is missing: ${expectedExecutable}`,
    "Run npm exec -- playwright install chromium from spikes/mature-dependencies."
  ];
  const blockedCandidates = [
    {
      fileName: "browser-baseline-summary.json",
      candidate: "browser-baseline",
      diagnostics
    },
    {
      fileName: "web-audio-summary.json",
      candidate: "Web Audio",
      diagnostics: [
        ...diagnostics,
        "AudioContext unlock, autoplay, fallback, and diagnostic smoke cannot run until Playwright Chromium launches."
      ]
    },
    {
      fileName: "dexie-indexeddb-summary.json",
      candidate: "Dexie / IndexedDB",
      diagnostics: [
        ...diagnostics,
        "IndexedDB availability, quota, reload, cleanup, export, and import smoke cannot run until Playwright Chromium launches."
      ]
    },
    {
      fileName: "comlink-worker-summary.json",
      candidate: "Comlink / Worker",
      diagnostics: [
        ...diagnostics,
        "Worker URL, RPC, transferable payload, diagnostic error mapping, and terminate smoke cannot run until Playwright Chromium launches."
      ]
    }
  ];

  for (const blocked of blockedCandidates) {
    writeBrowserSmokeSummary(packageRoot, blocked.fileName, {
      candidate: blocked.candidate,
      status: "ENVIRONMENT-BLOCKED",
      layer: "environment",
      browser: "Playwright Chromium",
      port: 5184,
      durationMs: durationMs(),
      command: "npm exec -- playwright test -c playwright.config.ts",
      consoleErrors: [],
      diagnostics: blocked.diagnostics,
      artifacts: [],
      timestamp: nowIso()
    });
  }
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
  writeBrowserSmokeSummary(packageRoot, "browser-baseline-summary.json", {
    candidate: "browser-baseline",
    status: "PASS",
    layer: "environment",
    browser: "Playwright Chromium",
    port: 5184,
    durationMs: durationMs(),
    command: `npm ${args.join(" ")}`,
    consoleErrors: [],
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
  writeBrowserSmokeSummary(packageRoot, "browser-baseline-summary.json", {
    candidate: "browser-baseline",
    status: "ENVIRONMENT-BLOCKED",
    layer: "environment",
    browser: "Playwright Chromium",
    port: 5184,
    durationMs: durationMs(),
    command: `npm ${args.join(" ")}`,
    consoleErrors: output
      .split(/\r?\n/)
      .filter((line) => line.toLowerCase().includes("error") || line.includes("Executable doesn't exist")),
    diagnostics: output.split(/\r?\n/).filter(Boolean).slice(-12),
    artifacts: [],
    timestamp: nowIso()
  });
  console.log("ENVIRONMENT-BLOCKED: Playwright browser launch failed because the managed browser is not installed.");
  process.exit(0);
}

process.stdout.write(output ? `${output}\n` : "");
process.exit(result.status ?? 1);
