import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const physicsAdapterRoot = join(packageRoot, "src", "physics-adapter");
const reportDir = join(packageRoot, "reports", "physics-adapter");
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
  const forbiddenImportPattern = /from\s+["'][^"']*(three|dexie|src\/(game|events|director|world|schemas|data|migrations))/i;
  const rapierImportPattern = /from\s+["']@dimforge\/rapier3d/;
  const forbiddenRuntimePattern = /\b(eval|Function)\s*\(/;
  const rapierOwnedTermsPattern = /\b(rawHandle|RigidBodyDesc|ColliderDesc)\b|@dimforge\/rapier3d/i;
  const rapierOwnedFiles = new Set(["rapier-physics-adapter.ts"]);
  const rapierTermAllowedFiles = new Set(["rapier-physics-adapter.ts", "physics-adapter-browser-smoke.ts"]);

  for (const file of listFiles(physicsAdapterRoot)) {
    const rel = normalizePath(relative(packageRoot, file));
    const fileName = rel.split("/").at(-1);
    if (fileName.endsWith(".test.ts")) {
      continue;
    }

    const text = readFileSync(file, "utf8");
    if (forbiddenImportPattern.test(text)) {
      failures.push(`${rel}: forbidden runtime/dependency import`);
    }

    if (rapierImportPattern.test(text) && !rapierOwnedFiles.has(fileName)) {
      failures.push(`${rel}: Rapier import outside Rapier adapter ownership`);
    }

    if (forbiddenRuntimePattern.test(text)) {
      failures.push(`${rel}: dynamic code execution is forbidden`);
    }

    if (!rapierTermAllowedFiles.has(fileName) && rapierOwnedTermsPattern.test(text)) {
      failures.push(`${rel}: Rapier-owned terms leaked outside adapter boundary`);
    }
  }

  recordCheck(
    "physics-adapter boundary guard",
    failures.length === 0,
    failures.length === 0 ? ["imports, dynamic-code, and dependency-ownership scans passed"] : failures
  );
}

function validateBrowserSummary() {
  const summaryPath = join(packageRoot, "reports", "browser-smoke", "physics-adapter-summary.json");
  if (!existsSync(summaryPath)) {
    recordCheck("physics-adapter browser summary", false, ["reports/browser-smoke/physics-adapter-summary.json is missing"]);
    return;
  }

  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const consoleErrors = Array.isArray(summary.consoleErrors) ? summary.consoleErrors : [];
  const result = summary.result ?? {};
  const details = [
    `status: ${summary.status}`,
    `decision: ${summary.decision}`,
    `console errors: ${consoleErrors.length}`,
    `boot/world/body-collider/step: ${result.bootOk ?? "unavailable"}/${result.worldOk ?? "unavailable"}/${result.bodyColliderOk ?? "unavailable"}/${result.stepOk ?? "unavailable"}`,
    `event/query/fallback/dispose/contract-clean: ${result.eventOk ?? "unavailable"}/${result.queryOk ?? "unavailable"}/${result.fallbackOk ?? "unavailable"}/${result.disposeOk ?? "unavailable"}/${result.contractClean ?? "unavailable"}`
  ];
  const ok =
    summary.status === "PASS" &&
    summary.decision === "PASS" &&
    consoleErrors.length === 0 &&
    result.supported === true &&
    result.bootOk === true &&
    result.worldOk === true &&
    result.bodyColliderOk === true &&
    result.stepOk === true &&
    result.eventOk === true &&
    result.queryOk === true &&
    result.fallbackOk === true &&
    result.disposeOk === true &&
    result.contractClean === true;

  recordCheck("physics-adapter browser summary", ok, details);
}

function cleanupIgnoredPlaywrightArtifacts() {
  const cleanupArtifacts = ["test-results", "playwright-report"];
  const details = [];
  const failures = [];

  for (const artifact of cleanupArtifacts) {
    const artifactPath = resolve(packageRoot, artifact);
    const relativePath = relative(packageRoot, artifactPath);
    if (relativePath.startsWith("..") || resolve(artifactPath) === resolve(packageRoot)) {
      failures.push(`refusing to remove outside package root: ${artifactPath}`);
      continue;
    }

    if (!existsSync(artifactPath)) {
      details.push(`${artifact} not present`);
      continue;
    }

    try {
      rmSync(artifactPath, { recursive: true, force: true });
      details.push(`removed ${artifact}`);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  recordCheck(
    "physics-adapter generated artifact cleanup",
    failures.length === 0,
    failures.length === 0 ? details : [...details, ...failures]
  );
}

function validateGeneratedArtifactsAbsent() {
  const forbiddenArtifacts = ["test-results", "playwright-report"];
  const present = forbiddenArtifacts.filter((artifact) => existsSync(join(packageRoot, artifact)));
  recordCheck(
    "physics-adapter generated artifact guard",
    present.length === 0,
    present.length === 0 ? ["no generated Playwright artifact directories present"] : present.map((artifact) => `${artifact} is present`)
  );
}

function writeSummary() {
  mkdirSync(reportDir, { recursive: true });
  const ok = checks.every((check) => check.ok);
  const summary = {
    candidate: "PhysicsAdapter aggregate smoke",
    status: ok ? "PASS" : "CONTRACT-BLOCKED",
    decision: ok ? "PASS" : "CONTRACT-BLOCKED",
    layer: ok ? "candidate" : "contract",
    durationMs: Date.now() - startedAt,
    command: "npm run smoke:physics-adapter",
    diagnostics,
    checks,
    artifactPolicy: {
      committed: [
        "reports/browser-smoke/physics-adapter-summary.json",
        "reports/physics-adapter/physics-adapter-validation-summary.json"
      ],
      notCommitted: ["test-results", "playwright-report", "dist", "coverage", "browser binaries"]
    },
    timestamp: nowIso()
  };
  const summaryPath = join(reportDir, "physics-adapter-validation-summary.json");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return {
    ok,
    summary,
    summaryPath
  };
}

if (!existsSync(physicsAdapterRoot) || !statSync(physicsAdapterRoot).isDirectory()) {
  recordCheck("physics-adapter source root", false, [`missing ${normalizePath(relative(packageRoot, physicsAdapterRoot))}`]);
} else {
  runCommand("typecheck", ["run", "typecheck"]);
  runCommand("physics-adapter unit tests", ["run", "test", "--", "physics-adapter"]);
  runBoundaryGuard();
  validateBrowserSummary();
  cleanupIgnoredPlaywrightArtifacts();
  validateGeneratedArtifactsAbsent();
}

const written = writeSummary();
console.log(`${written.summary.status}: ${normalizePath(relative(packageRoot, written.summaryPath))}`);
process.exit(written.ok ? 0 : 1);
