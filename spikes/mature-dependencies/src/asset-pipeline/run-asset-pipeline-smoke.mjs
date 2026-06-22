import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const sourceRoot = join(packageRoot, "src");
const assetPipelineRoot = join(packageRoot, "src", "asset-pipeline");
const reportDir = join(packageRoot, "reports", "asset-pipeline");
const diagnostics = [];
const checks = [];

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
  const ok = result.status === 0;
  recordCheck(name, ok, ok ? [`${name} completed`] : tail);
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

      if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".mjs"))) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function runBoundaryGuard() {
  const failures = [];
  const forbiddenRuntimePattern = /\b(eval|Function)\s*\(/;
  const forbiddenImportPattern = /from\s+["'][^"']*(three|dexie|rapier|comlink|src\/(game|events|director|world|schemas|data|migrations))/i;
  const toolImportPattern = /from\s+["'](?:@gltf-transform\/[^"']+|meshoptimizer)["']/;
  const allowedToolImportFiles = new Set([
    "src/asset-pipeline/gltf-asset-pipeline-adapter.ts",
    "src/gltf-transform/gltf-transform-smoke.ts"
  ]);

  for (const file of listFiles(sourceRoot)) {
    const rel = normalizePath(relative(packageRoot, file));
    const text = readFileSync(file, "utf8");

    if (forbiddenRuntimePattern.test(text)) {
      failures.push(`${rel}: dynamic code execution is forbidden`);
    }

    if (rel.startsWith("src/asset-pipeline/") && forbiddenImportPattern.test(text)) {
      failures.push(`${rel}: forbidden runtime/editor/dependency import`);
    }

    if (toolImportPattern.test(text) && !allowedToolImportFiles.has(rel) && !rel.endsWith(".test.ts")) {
      failures.push(`${rel}: offline asset tooling import outside adapter-owned files/tests/smoke`);
    }
  }

  recordCheck(
    "asset-pipeline boundary guard",
    failures.length === 0,
    failures.length === 0 ? ["offline tooling imports and dynamic-code scans passed"] : failures
  );
}

function validateReportSurface() {
  const reportReadme = join(reportDir, "README.md");
  const fixture = join(packageRoot, "fixtures", "minimal-triangle.gltf");
  const baselineReport = join(packageRoot, "reports", "gltf-transform-report.json");
  const details = [
    `asset pipeline report dir: ${existsSync(reportDir)}`,
    `report README: ${existsSync(reportReadme)}`,
    `source fixture: ${existsSync(fixture)}`,
    `baseline glTF report: ${existsSync(baselineReport)}`
  ];
  recordCheck("asset-pipeline report surface", details.every((detail) => detail.endsWith("true")), details);
}

function cleanupArtifacts() {
  const cleanupArtifacts = [
    "test-results",
    "playwright-report",
    "coverage",
    "dist",
    join("reports", "asset-pipeline", "generated")
  ];
  const details = [];
  const failures = [];

  for (const artifact of cleanupArtifacts) {
    const artifactPath = resolve(packageRoot, artifact);
    const relativePath = relative(packageRoot, artifactPath);
    if (relativePath.startsWith("..") || resolve(artifactPath) === resolve(packageRoot)) {
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

  recordCheck("asset-pipeline generated artifact cleanup", failures.length === 0, failures.length === 0 ? details : [...details, ...failures]);
}

function validateArtifactsAbsent() {
  const forbiddenArtifacts = [
    "test-results",
    "playwright-report",
    "coverage",
    "dist",
    join("reports", "asset-pipeline", "generated")
  ];
  const present = forbiddenArtifacts.filter((artifact) => existsSync(join(packageRoot, artifact)));
  const largeFiles = [];

  if (existsSync(reportDir)) {
    for (const entry of readdirSync(reportDir, { withFileTypes: true })) {
      const fullPath = join(reportDir, entry.name);
      if (entry.isFile() && statSync(fullPath).size > 10_000) {
        largeFiles.push(normalizePath(relative(packageRoot, fullPath)));
      }
    }
  }

  recordCheck(
    "asset-pipeline generated artifact guard",
    present.length === 0 && largeFiles.length === 0,
    present.length === 0 && largeFiles.length === 0
      ? ["no forbidden generated artifact directories or large report artifacts present"]
      : [...present.map((artifact) => `${normalizePath(artifact)} is present`), ...largeFiles.map((file) => `${file} is large`)]
  );
}

function writeSummary() {
  mkdirSync(reportDir, { recursive: true });
  const ok = checks.every((check) => check.ok);
  const summary = {
    candidate: "AssetPipelineAdapter aggregate smoke",
    status: ok ? "PASS" : "CONTRACT-BLOCKED",
    decision: ok ? "PASS" : "CONTRACT-BLOCKED",
    layer: ok ? "candidate" : "contract",
    durationMs: 0,
    command: "npm run smoke:asset-pipeline",
    diagnostics,
    checks,
    artifactPolicy: {
      committed: [
        "reports/asset-pipeline/README.md",
        "reports/asset-pipeline/asset-pipeline-validation-summary.json"
      ],
      notCommitted: ["reports/asset-pipeline/generated", "test-results", "playwright-report", "dist", "coverage", "large GLB/texture artifacts"]
    },
    timestamp: "deterministic-smoke"
  };
  const summaryPath = join(reportDir, "asset-pipeline-validation-summary.json");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return {
    ok,
    summary,
    summaryPath
  };
}

if (!existsSync(assetPipelineRoot)) {
  recordCheck("asset-pipeline source root", false, [`missing ${normalizePath(relative(packageRoot, assetPipelineRoot))}`]);
} else {
  runCommand("typecheck", ["run", "typecheck"]);
  runCommand("asset-pipeline unit tests", ["run", "test", "--", "asset-pipeline"]);
  runBoundaryGuard();
  validateReportSurface();
  cleanupArtifacts();
  validateArtifactsAbsent();
}

const written = writeSummary();
console.log(`${written.summary.status}: ${normalizePath(relative(packageRoot, written.summaryPath))}`);
process.exit(written.ok ? 0 : 1);
