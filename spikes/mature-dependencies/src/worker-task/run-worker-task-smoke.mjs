import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const workerTaskRoot = join(packageRoot, "src", "worker-task");
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
  const tail = output.split(/\r?\n/).filter(Boolean).slice(-8);
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
  const allowedComlinkFiles = new Set(["comlink-worker-task-adapter.ts", "comlink-worker-task.worker.ts"]);
  const forbiddenImportPattern = /from\s+["'][^"']*(three|dexie|rapier|src\/(game|events|director|world|schemas|data|migrations))/i;
  const forbiddenRuntimePattern = /\b(eval|Function)\s*\(/;

  for (const file of listFiles(workerTaskRoot)) {
    const rel = normalizePath(relative(packageRoot, file));
    const text = readFileSync(file, "utf8");
    const fileName = rel.split("/").at(-1);

    if (forbiddenImportPattern.test(text)) {
      failures.push(`${rel}: forbidden runtime/dependency import`);
    }

    if (text.includes("\"comlink\"") && !allowedComlinkFiles.has(fileName)) {
      failures.push(`${rel}: Comlink import outside adapter/worker boundary`);
    }

    if (forbiddenRuntimePattern.test(text)) {
      failures.push(`${rel}: dynamic code execution is forbidden`);
    }
  }

  recordCheck("worker-task boundary guard", failures.length === 0, failures.length === 0 ? ["imports and dynamic-code scan passed"] : failures);
}

function validateBrowserSummary() {
  const summaryPath = join(packageRoot, "reports", "browser-smoke", "worker-task-adapter-summary.json");
  if (!existsSync(summaryPath)) {
    recordCheck("worker-task browser summary", false, ["reports/browser-smoke/worker-task-adapter-summary.json is missing"]);
    return;
  }

  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const consoleErrors = Array.isArray(summary.consoleErrors) ? summary.consoleErrors : [];
  const details = [
    `status: ${summary.status}`,
    `decision: ${summary.decision}`,
    `console errors: ${consoleErrors.length}`,
    `diagnostics: ${(summary.diagnostics ?? []).join(" | ")}`
  ];
  const ok =
    summary.status === "PASS" &&
    summary.decision === "PASS" &&
    consoleErrors.length === 0 &&
    Array.isArray(summary.diagnostics) &&
    summary.diagnostics.some((diagnostic) => String(diagnostic).includes("WorkerTaskAdapter contract -> Comlink RPC -> Web Worker"));

  recordCheck("worker-task browser summary", ok, details);
}

function writeSummary() {
  const reportDir = join(packageRoot, "reports", "worker-task-adapter");
  mkdirSync(reportDir, { recursive: true });
  const ok = checks.every((check) => check.ok);
  const summary = {
    candidate: "WorkerTaskAdapter aggregate smoke",
    status: ok ? "PASS" : "CONTRACT-BLOCKED",
    decision: ok ? "PASS" : "CONTRACT-BLOCKED",
    layer: ok ? "candidate" : "contract",
    durationMs: Date.now() - startedAt,
    command: "npm run smoke:worker-task",
    diagnostics,
    checks,
    artifactPolicy: {
      committed: ["reports/worker-task-adapter/worker-task-adapter-validation-summary.json"],
      notCommitted: ["test-results", "playwright-report", "dist", "coverage", "browser binaries"]
    },
    timestamp: nowIso()
  };
  const summaryPath = join(reportDir, "worker-task-adapter-validation-summary.json");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return {
    ok,
    summary,
    summaryPath
  };
}

if (!existsSync(workerTaskRoot) || !statSync(workerTaskRoot).isDirectory()) {
  recordCheck("worker-task source root", false, [`missing ${normalizePath(relative(packageRoot, workerTaskRoot))}`]);
} else {
  runCommand("typecheck", ["run", "typecheck"]);
  runCommand("worker-task unit tests", ["run", "test", "--", "worker-task"]);
  runBoundaryGuard();
  validateBrowserSummary();
}

const written = writeSummary();
console.log(`${written.summary.status}: ${normalizePath(relative(packageRoot, written.summaryPath))}`);
process.exit(written.ok ? 0 : 1);
