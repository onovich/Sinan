import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const sourceRoot = join(packageRoot, "src");
const reportDir = join(packageRoot, "reports", "diagnostics-adapter");
const checks = [];
const diagnostics = [];

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
  recordCheck(name, result.status === 0, result.status === 0 ? [`${name} completed`] : tail);
}

function listFiles(root, extensions) {
  const files = [];
  if (!existsSync(root)) {
    return files;
  }

  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension))) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function runProductionExclusionGuard() {
  const failures = [];
  const allowedDynamicLoader = "src/diagnostics-adapter/spector-dev-only-loader.ts";
  const allowedLegacySmoke = "src/spector/spector-dev-only-loader.ts";
  const staticImportPattern = /import\s+(?!\()[\s\S]{0,120}?["']spectorjs["']/;
  const dynamicImportPattern = /import\s*\(\s*["']spectorjs["']\s*\)/;
  const dynamicCodePattern = /\b(eval|Function)\s*\(/;
  const publicLeakPattern = /spectorjs|SPECTOR|WebGL|HTMLCanvas|canvas|captureId|toolState/i;

  for (const file of listFiles(sourceRoot, [".ts", ".mjs"])) {
    const rel = normalizePath(relative(packageRoot, file));
    const text = readFileSync(file, "utf8");

    if (dynamicCodePattern.test(text)) {
      failures.push(`${rel}: dynamic code execution is forbidden`);
    }

    if (staticImportPattern.test(text)) {
      failures.push(`${rel}: static spectorjs import is forbidden`);
    }

    if (dynamicImportPattern.test(text) && rel !== allowedDynamicLoader && rel !== allowedLegacySmoke) {
      failures.push(`${rel}: spectorjs dynamic import outside dev-only loader or legacy evidence smoke`);
    }

    if (rel === "src/diagnostics-adapter/diagnostics-adapter-types.ts" && publicLeakPattern.test(text)) {
      failures.push(`${rel}: public diagnostics contract leaks dev-only tool terms`);
    }
  }

  const distDir = join(packageRoot, "dist");
  if (existsSync(distDir)) {
    for (const file of listFiles(distDir, [".js", ".html", ".css", ".json"])) {
      if (statSync(file).size > 5_000_000) {
        continue;
      }
      const text = readFileSync(file, "utf8");
      if (/spectorjs|SPECTOR/.test(text)) {
        failures.push(`${normalizePath(relative(packageRoot, file))}: production build contains dev-only diagnostics package marker`);
      }
    }
  }

  recordCheck(
    "diagnostics production exclusion guard",
    failures.length === 0,
    failures.length === 0 ? ["no static spectorjs import, public leak, dynamic code, or production dist marker found"] : failures
  );
}

function validateBrowserSummary() {
  const summaryPath = join(packageRoot, "reports", "browser-smoke", "diagnostics-adapter-summary.json");
  if (!existsSync(summaryPath)) {
    recordCheck("diagnostics browser summary", false, ["reports/browser-smoke/diagnostics-adapter-summary.json is missing"]);
    return;
  }

  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const result = summary.result ?? {};
  const ok =
    summary.status === "PASS" &&
    result.adapter === "DiagnosticsAdapter" &&
    result.performanceOk === true &&
    result.disabledByDefaultOk === true &&
    result.productionDisabledOk === true &&
    result.contractClean === true &&
    !/spectorjs|SPECTOR|WebGL|HTMLCanvas|canvas|captureId|toolState/i.test(JSON.stringify(result));

  recordCheck(
    "diagnostics browser summary",
    ok,
    [
      `status: ${summary.status ?? "missing"}`,
      `adapter: ${result.adapter ?? "missing"}`,
      `performance/disabled/production/contract: ${Boolean(result.performanceOk)}/${Boolean(result.disabledByDefaultOk)}/${Boolean(
        result.productionDisabledOk
      )}/${Boolean(result.contractClean)}`
    ]
  );
}

function cleanupArtifacts() {
  const artifacts = [
    "test-results",
    "playwright-report",
    "coverage",
    "dist",
    join("reports", "diagnostics-adapter", "captures")
  ];
  const details = [];
  const failures = [];

  for (const artifact of artifacts) {
    const artifactPath = resolve(packageRoot, artifact);
    const relation = relative(packageRoot, artifactPath);
    if (relation.startsWith("..") || resolve(artifactPath) === resolve(packageRoot)) {
      failures.push(`refusing to remove outside package root: ${artifactPath}`);
      continue;
    }

    try {
      rmSync(artifactPath, { recursive: true, force: true });
      details.push(`cleared ${normalizePath(artifact)}`);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  recordCheck("diagnostics artifact cleanup", failures.length === 0, failures.length === 0 ? details : [...details, ...failures]);
}

function validateArtifactsAbsent() {
  const artifacts = [
    "test-results",
    "playwright-report",
    "coverage",
    "dist",
    join("reports", "diagnostics-adapter", "captures")
  ];
  const present = artifacts.filter((artifact) => existsSync(join(packageRoot, artifact)));
  recordCheck(
    "diagnostics artifact guard",
    present.length === 0,
    present.length === 0 ? ["no forbidden diagnostics artifacts present"] : present.map((artifact) => `${normalizePath(artifact)} is present`)
  );
}

function writeSummary() {
  mkdirSync(reportDir, { recursive: true });
  const ok = checks.every((check) => check.ok);
  const summary = {
    candidate: "DiagnosticsAdapter dev-only aggregate smoke",
    status: ok ? "PASS" : "CONTRACT-BLOCKED",
    decision: ok ? "PASS" : "CONTRACT-BLOCKED",
    layer: ok ? "contract" : "policy",
    durationMs: 0,
    command: "npm run smoke:diagnostics-adapter",
    diagnostics,
    checks,
    artifactPolicy: {
      committed: ["reports/diagnostics-adapter/diagnostics-adapter-validation-summary.json"],
      notCommitted: ["test-results", "playwright-report", "coverage", "dist", "reports/diagnostics-adapter/captures", "capture artifacts"]
    },
    timestamp: "deterministic-smoke"
  };
  const summaryPath = join(reportDir, "diagnostics-adapter-validation-summary.json");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return {
    ok,
    summaryPath
  };
}

runCommand("typecheck", ["run", "typecheck"]);
runCommand("diagnostics-adapter unit tests", ["run", "test", "--", "diagnostics-adapter"]);
validateBrowserSummary();
runProductionExclusionGuard();
cleanupArtifacts();
validateArtifactsAbsent();

const written = writeSummary();
console.log(`${checks.every((check) => check.ok) ? "PASS" : "CONTRACT-BLOCKED"}: ${normalizePath(relative(packageRoot, written.summaryPath))}`);
process.exit(written.ok ? 0 : 1);
