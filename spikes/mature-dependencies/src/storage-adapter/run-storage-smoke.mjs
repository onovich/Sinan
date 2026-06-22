import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const repoRoot = dirname(dirname(packageRoot));
const reportDir = join(packageRoot, "reports", "storage-adapter");
const startedAt = Date.now();
const baseRef = "origin/codex/mature-dependency-browser-smoke-harness";

function nowIso() {
  return new Date().toISOString();
}

function durationMs() {
  return Date.now() - startedAt;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? packageRoot,
    encoding: "utf8"
  });
  return {
    command: options.displayCommand ?? `${command} ${args.join(" ")}`,
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

function writeJson(fileName, value) {
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJsonIfPresent(fileName) {
  const fullPath = join(reportDir, fileName);
  if (!existsSync(fullPath)) {
    return null;
  }
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

function lastMeaningfulLines(text, count = 12) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-count);
}

function allowedPath(path) {
  return path.startsWith("spikes/mature-dependencies/") || path.startsWith("docs/strategy/mature-dependency-storage-adapter-spike/");
}

const testRun = run(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "src/storage-adapter"], {
  displayCommand: "node node_modules/vitest/vitest.mjs run src/storage-adapter"
});
const nodeSummary = {
  candidate: "StorageAdapter Node contract",
  status: testRun.status === 0 ? "PASS" : "FAIL",
  command: testRun.command,
  durationMs: durationMs(),
  diagnostics: [...lastMeaningfulLines(testRun.stdout), ...lastMeaningfulLines(testRun.stderr)],
  timestamp: nowIso()
};
writeJson("storage-adapter-node-summary.json", nodeSummary);

const browserSummary = readJsonIfPresent("storage-adapter-browser-summary.json");
const diffRun = run("git", ["diff", "--name-only", `${baseRef}...HEAD`], { cwd: repoRoot });
const changedPaths = diffRun.stdout
  .split(/\r?\n/)
  .map((line) => line.trim().replaceAll("\\", "/"))
  .filter(Boolean);
const forbiddenPaths = changedPaths.filter((path) => !allowedPath(path));
const boundarySummary = {
  candidate: "StorageAdapter boundary guard",
  status: diffRun.status === 0 && forbiddenPaths.length === 0 ? "PASS" : "FAIL",
  command: diffRun.command,
  baseRef,
  changedPaths,
  forbiddenPaths,
  diagnostics: diffRun.status === 0 ? [] : [...lastMeaningfulLines(diffRun.stdout), ...lastMeaningfulLines(diffRun.stderr)],
  timestamp: nowIso()
};

const aggregateStatus =
  nodeSummary.status === "PASS" && browserSummary?.status === "PASS" && boundarySummary.status === "PASS" ? "PASS" : "FAIL";
const validationSummary = {
  candidate: "StorageAdapter isolated validation",
  status: aggregateStatus,
  command: "npm run smoke:storage",
  durationMs: durationMs(),
  node: {
    status: nodeSummary.status,
    report: relative(packageRoot, join(reportDir, "storage-adapter-node-summary.json")).replaceAll("\\", "/")
  },
  browser: {
    status: browserSummary?.status ?? "MISSING",
    report: relative(packageRoot, join(reportDir, "storage-adapter-browser-summary.json")).replaceAll("\\", "/")
  },
  boundary: {
    status: boundarySummary.status,
    forbiddenPaths
  },
  diagnostics: [
    `storage adapter node tests: ${nodeSummary.status}`,
    `storage adapter browser smoke: ${browserSummary?.status ?? "MISSING"}`,
    `boundary forbidden paths: ${forbiddenPaths.length}`
  ],
  timestamp: nowIso()
};

writeJson("storage-adapter-validation-summary.json", validationSummary);

if (aggregateStatus !== "PASS") {
  console.error(JSON.stringify(validationSummary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(validationSummary, null, 2));
