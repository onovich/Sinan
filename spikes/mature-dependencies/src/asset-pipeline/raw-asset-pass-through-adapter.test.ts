import { describe, expect, test } from "vitest";
import { createRawAssetPassThroughAdapter } from "./raw-asset-pass-through-adapter";
import { normalizeAssetBuildRequest, normalizeAssetPipelineConfig } from "./asset-pipeline-normalizer";
import type { AssetBuildRequest } from "./asset-pipeline-types";

function request(overrides: Partial<AssetBuildRequest> = {}): AssetBuildRequest {
  const normalized = normalizeAssetBuildRequest({
    assetId: "asset:minimal-triangle",
    sourcePath: "minimal-triangle.gltf",
    ...overrides
  });
  expect(normalized.ok).toBe(true);
  expect(normalized.value).toBeDefined();
  return normalized.value?.request as AssetBuildRequest;
}

describe("RawAssetPassThroughAdapter", () => {
  test("boots and reports explicit fallback diagnostics", async () => {
    const adapter = createRawAssetPassThroughAdapter();

    const boot = await adapter.boot();
    const report = await adapter.build(request());

    expect(boot.status).toBe("fallback");
    expect(report.status).toBe("fallback");
    expect(report.generatedArtifacts).toEqual([]);
    expect(report.manifestPatch.entries[0]?.artifactPath).toBe(report.sourcePath);
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toContain("fallback-used");
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toContain("budget-warning");
    expect(JSON.stringify(report)).not.toMatch(/NodeIO|Document|Meshopt|gltf-transform|meshoptimizer/);
  });

  test("returns missing-source when the source fixture cannot be read", async () => {
    const adapter = createRawAssetPassThroughAdapter();
    const missing = await adapter.inspect({
      ...request(),
      requestId: "request:missing",
      assetId: "asset:missing",
      sourcePath: "fixtures/missing-source.gltf"
    });

    expect(missing.status).toBe("missing-source");
    expect(missing.reproducible).toBe(false);
    expect(missing.diagnostics[0]?.code).toBe("missing-source");
  });

  test("classifies unsupported formats before source read", async () => {
    const adapter = createRawAssetPassThroughAdapter();
    const unsupported = await adapter.build({
      ...request(),
      requestId: "request:unsupported",
      assetId: "asset:unsupported",
      sourcePath: "fixtures/texture.png"
    });

    expect(unsupported.status).toBe("unsupported-format");
    expect(unsupported.diagnostics.map((diagnostic) => diagnostic.code)).toContain("unsupported-format");
  });

  test("skips unchanged source and profile during rebuild", async () => {
    const adapter = createRawAssetPassThroughAdapter();
    const buildRequest = request();
    const first = await adapter.build(buildRequest);
    const second = await adapter.rebuild(buildRequest, first);

    expect(first.status).toBe("fallback");
    expect(second.status).toBe("skipped");
    expect(second.sourceHash).toBe(first.sourceHash);
    expect(second.profileHash).toBe(first.profileHash);
  });

  test("uses budget warnings and failures without pretending optimization happened", async () => {
    const config = normalizeAssetPipelineConfig({
      budgets: [
        {
          budgetId: "tiny-fixture",
          maxBytes: 10,
          maxMeshes: 1,
          maxTriangles: 1,
          warningRatio: 0.5
        }
      ]
    });
    const adapter = createRawAssetPassThroughAdapter({ config });
    const report = await adapter.build(request());

    expect(report.status).toBe("fallback");
    expect(report.budget.status).toBe("fail");
    expect(report.budget.diagnostics.map((diagnostic) => diagnostic.code)).toContain("budget-failed");
    expect(report.generatedArtifacts).toHaveLength(0);
  });

  test("disposes and blocks later work", async () => {
    const adapter = createRawAssetPassThroughAdapter();
    await adapter.dispose();

    const report = await adapter.build(request());

    expect(adapter.lifecycle).toBe("disposed");
    expect(report.status).toBe("disposed");
    expect(report.diagnostics[0]?.code).toBe("disposed-adapter");
  });
});
