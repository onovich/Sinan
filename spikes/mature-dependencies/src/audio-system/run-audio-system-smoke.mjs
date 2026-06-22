import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const audioSystemRoot = join(packageRoot, "src", "audio-system");
const reportDir = join(packageRoot, "reports", "audio-system");
const startedAt = Date.now();
const diagnostics = [];
const checks = [];

function nowIso() {
  return new Date().toISOString();
}

function normalizePath(path) {
  return path.split("\\").join("/");
}

function recordCheck(name, ok, details = []) {
  checks.push({
    name,
    ok,
    details
  });
  diagnostics.push(`${name}: ${ok ? "PASS" : "FAIL"}`);
  diagnostics.push(...details.map((detail) => `${name}: ${detail}`));
}

function runCommand(name, args) {
  const result = spawnSync("npm", args, {
    cwd: packageRoot,
    encoding: "utf8",
    shell: true
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  const tail = output.split(/\r?\n/).filter(Boolean).slice(-10);
  recordCheck(name, result.status === 0, tail);
}

function listFiles(root) {
  const files = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".ts")) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function runBoundaryGuard() {
  const failures = [];
  const forbiddenImportPattern = /from\s+["'][^"']*(three|dexie|rapier|src\/(game|events|director|world|schemas|data|migrations))/i;
  const forbiddenRuntimePattern = /\b(eval|Function)\s*\(/;
  const browserObjectPattern = /\b(AudioContext|GainNode|PannerNode|AudioBufferSourceNode|HTMLAudio|decodeAudioData)\b/;
  const webAudioOwnedFiles = new Set(["web-audio-system-adapter.ts", "audio-system-browser-smoke.ts"]);

  for (const file of listFiles(audioSystemRoot)) {
    const rel = normalizePath(relative(packageRoot, file));
    const fileName = rel.split("/").at(-1);
    const text = readFileSync(file, "utf8");

    if (forbiddenImportPattern.test(text)) {
      failures.push(`${rel}: forbidden runtime/dependency import`);
    }

    if (forbiddenRuntimePattern.test(text)) {
      failures.push(`${rel}: dynamic code execution is forbidden`);
    }

    if (!webAudioOwnedFiles.has(fileName) && !fileName.endsWith(".test.ts") && browserObjectPattern.test(text)) {
      failures.push(`${rel}: browser audio object leaked outside WebAudio adapter ownership`);
    }
  }

  recordCheck(
    "audio-system boundary guard",
    failures.length === 0,
    failures.length === 0 ? ["imports, dynamic-code, and production contract browser-object scans passed"] : failures
  );
}

function validateBrowserSummary() {
  const summaryPath = join(packageRoot, "reports", "browser-smoke", "audio-system-summary.json");
  if (!existsSync(summaryPath)) {
    recordCheck("audio-system browser summary", false, ["reports/browser-smoke/audio-system-summary.json is missing"]);
    return;
  }

  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const consoleErrors = Array.isArray(summary.consoleErrors) ? summary.consoleErrors : [];
  const result = summary.result ?? {};
  const details = [
    `status: ${summary.status}`,
    `decision: ${summary.decision}`,
    `console errors: ${consoleErrors.length}`,
    `supported: ${result.supported ?? "unavailable"}`,
    `completion/spatial/bus/listener: ${result.completionOk ?? "unavailable"}/${result.spatialOk ?? "unavailable"}/${result.busOk ?? "unavailable"}/${result.listenerOk ?? "unavailable"}`,
    `fallback/dispose/contract-clean: ${result.fallbackOk ?? "unavailable"}/${result.disposeOk ?? "unavailable"}/${result.contractClean ?? "unavailable"}`
  ];
  const ok =
    summary.status === "PASS" &&
    summary.decision === "PASS" &&
    consoleErrors.length === 0 &&
    result.supported === true &&
    result.bootOk === true &&
    result.unlockOk === true &&
    result.preloadOk === true &&
    result.playOk === true &&
    result.completionOk === true &&
    result.spatialOk === true &&
    result.busOk === true &&
    result.listenerOk === true &&
    result.fallbackOk === true &&
    result.disposeOk === true &&
    result.contractClean === true;

  recordCheck("audio-system browser summary", ok, details);
}

function writeSummary() {
  mkdirSync(reportDir, { recursive: true });
  const ok = checks.every((check) => check.ok);
  const summary = {
    candidate: "AudioSystem aggregate smoke",
    status: ok ? "PASS" : "CONTRACT-BLOCKED",
    decision: ok ? "PASS" : "CONTRACT-BLOCKED",
    layer: ok ? "candidate" : "contract",
    durationMs: Date.now() - startedAt,
    command: "npm run smoke:audio-system",
    diagnostics,
    checks,
    artifactPolicy: {
      committed: [
        "reports/browser-smoke/audio-system-summary.json",
        "reports/audio-system/audio-system-validation-summary.json"
      ],
      notCommitted: ["test-results", "playwright-report", "dist", "coverage", "browser binaries"]
    },
    timestamp: nowIso()
  };
  const summaryPath = join(reportDir, "audio-system-validation-summary.json");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return {
    ok,
    summary,
    summaryPath
  };
}

if (!existsSync(audioSystemRoot) || !statSync(audioSystemRoot).isDirectory()) {
  recordCheck("audio-system source root", false, [`missing ${normalizePath(relative(packageRoot, audioSystemRoot))}`]);
} else {
  runCommand("typecheck", ["run", "typecheck"]);
  runCommand("audio-system unit tests", ["run", "test", "--", "audio-system"]);
  runBoundaryGuard();
  validateBrowserSummary();
}

const written = writeSummary();
console.log(`${written.summary.status}: ${normalizePath(relative(packageRoot, written.summaryPath))}`);
process.exit(written.ok ? 0 : 1);
