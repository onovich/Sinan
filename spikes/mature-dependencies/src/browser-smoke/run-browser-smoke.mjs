import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
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

function scanDistForSpector() {
  const distDir = join(packageRoot, "dist");
  if (!existsSync(distDir)) {
    return {
      available: false,
      matches: []
    };
  }

  const matches = [];
  const stack = [distDir];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile() || statSync(fullPath).size > 5_000_000) {
        continue;
      }

      const text = readFileSync(fullPath, "utf8");
      if (text.includes("spectorjs") || text.includes("SPECTOR")) {
        matches.push(fullPath.replace(packageRoot, "."));
      }
    }
  }

  return {
    available: true,
    matches
  };
}

if (!existsSync(expectedExecutable)) {
  const spectorDistCheck = scanDistForSpector();
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
    },
    {
      fileName: "worker-task-adapter-summary.json",
      candidate: "WorkerTaskAdapter / Comlink / Worker",
      diagnostics: [
        ...diagnostics,
        "WorkerTaskAdapter boot, task submit, transfer policy, timeout, cancellation, and dispose smoke cannot run until Playwright Chromium launches."
      ]
    },
    {
      fileName: "spector-dev-only-summary.json",
      candidate: "Spector.js",
      diagnostics: [
        ...diagnostics,
        "Spector dev-only dynamic import guard cannot run in a browser until Playwright Chromium launches.",
        `production static exclusion check available: ${spectorDistCheck.available}`,
        `production static exclusion matches for spectorjs/SPECTOR: ${spectorDistCheck.matches.length}`,
        ...spectorDistCheck.matches.map((match) => `production match: ${match}`)
      ]
    },
    {
      fileName: "rapier-wasm-summary.json",
      candidate: "Rapier / WASM",
      diagnostics: [
        ...diagnostics,
        "Rapier dynamic import, WASM init, minimal world step, reload, and bundle path smoke cannot run until Playwright Chromium launches."
      ]
    },
    {
      fileName: "recast-policy-skip-summary.json",
      candidate: "recast-navigation",
      status: "POLICY-SKIP",
      layer: "policy",
      diagnostics: [
        "RFC-013 keeps NavigationAdapter and recast-navigation on hold.",
        "No browser smoke is required or interpreted as implementation approval in this goal."
      ]
    }
  ];

  for (const blocked of blockedCandidates) {
    writeBrowserSmokeSummary(packageRoot, blocked.fileName, {
      candidate: blocked.candidate,
      status: blocked.status ?? "ENVIRONMENT-BLOCKED",
      layer: blocked.layer ?? "environment",
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
