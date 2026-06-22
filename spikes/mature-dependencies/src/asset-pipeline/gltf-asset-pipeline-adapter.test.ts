import { copyFile, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { createGltfAssetPipelineAdapter } from "./gltf-asset-pipeline-adapter";
import { normalizeAssetBuildRequest } from "./asset-pipeline-normalizer";
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

describe("GltfAssetPipelineAdapter inspect", () => {
  test("boots and inspects the minimal glTF fixture into a Sinan report", async () => {
    const adapter = createGltfAssetPipelineAdapter();

    const boot = await adapter.boot();
    const report = await adapter.inspect(request());

    expect(boot.status).toBe("success");
    expect(report.status).toBe("success");
    expect(report.metrics.nodes).toBe(1);
    expect(report.metrics.meshes).toBe(1);
    expect(report.metrics.materials).toBe(0);
    expect(report.metrics.triangles).toBe(1);
    expect(report.generatedArtifacts).toEqual([]);
    expect(report.manifestPatch.entries[0]?.assetId).toBe("asset:minimal-triangle");
    expect(JSON.stringify(report)).not.toMatch(/NodeIO|Document|MeshoptEncoder|Property|Transform\b/);
  });

  test("returns missing-source before invoking tool output behavior", async () => {
    const adapter = createGltfAssetPipelineAdapter();
    const report = await adapter.inspect({
      ...request(),
      requestId: "request:missing",
      sourcePath: "fixtures/missing-source.gltf"
    });

    expect(report.status).toBe("missing-source");
    expect(report.diagnostics[0]?.code).toBe("missing-source");
    expect(report.generatedArtifacts).toEqual([]);
  });

  test("rejects unsupported extensions", async () => {
    const adapter = createGltfAssetPipelineAdapter();
    const report = await adapter.inspect({
      ...request(),
      requestId: "request:unsupported",
      sourcePath: "fixtures/texture.png"
    });

    expect(report.status).toBe("unsupported-format");
    expect(report.diagnostics[0]?.code).toBe("unsupported-format");
  });

  test("normalizes glTF parser failures to tool-failed diagnostics", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "sinan-asset-pipeline-"));
    await writeFile(join(tempRoot, "broken.gltf"), "{ this is not valid gltf json", "utf8");
    const adapter = createGltfAssetPipelineAdapter({
      packageRoot: tempRoot,
      config: {
        sourceRoot: "."
      }
    });
    const normalized = normalizeAssetBuildRequest({
      assetId: "asset:broken",
      sourcePath: "broken.gltf"
    }, adapter.config);
    expect(normalized.value).toBeDefined();

    const report = await adapter.inspect(normalized.value?.request as AssetBuildRequest);

    expect(report.status).toBe("tool-failed");
    expect(report.diagnostics[0]?.code).toBe("tool-failed");
    expect(report.reproducible).toBe(false);
  });

  test("builds, writes, and re-reads a generated GLB artifact without replacing source truth", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "sinan-asset-pipeline-build-"));
    await copyFile(join(process.cwd(), "fixtures", "minimal-triangle.gltf"), join(tempRoot, "minimal-triangle.gltf"));
    const adapter = createGltfAssetPipelineAdapter({
      packageRoot: tempRoot,
      config: {
        sourceRoot: ".",
        outputRoot: "generated",
        generatedArtifactPolicy: {
          outputRoot: "generated"
        }
      }
    });
    const normalized = normalizeAssetBuildRequest(
      {
        assetId: "asset:minimal-triangle",
        sourcePath: "minimal-triangle.gltf",
        outputArtifactPath: "minimal-triangle-runtime.glb"
      },
      adapter.config
    );
    expect(normalized.value).toBeDefined();

    const report = await adapter.build(normalized.value?.request as AssetBuildRequest);
    const artifactPath = join(tempRoot, "generated", "minimal-triangle-runtime.glb");
    const artifactStat = await stat(artifactPath);
    const sourceBytes = await readFile(join(tempRoot, "minimal-triangle.gltf"));

    expect(report.status).toBe("success");
    expect(report.generatedArtifacts).toHaveLength(1);
    expect(report.generatedArtifacts[0]?.artifactPath).toBe("generated/minimal-triangle-runtime.glb");
    expect(report.generatedArtifacts[0]?.rebuildable).toBe(true);
    expect(report.generatedArtifacts[0]?.committed).toBe(false);
    expect(report.manifestPatch.entries[0]?.artifactPath).toBe("generated/minimal-triangle-runtime.glb");
    expect(report.manifestPatch.entries[0]?.sourcePath).toBe("minimal-triangle.gltf");
    expect(artifactStat.size).toBeGreaterThan(0);
    expect(sourceBytes.toString("utf8")).toContain("triangle-mesh");
    expect(JSON.stringify(report)).not.toMatch(/NodeIO|Document|MeshoptEncoder|Property|Transform\b/);
  });

  test("normalizes manifest conflicts before tool execution", async () => {
    const adapter = createGltfAssetPipelineAdapter({
      existingManifestIds: ["asset:minimal-triangle:runtime"]
    });
    const normalized = normalizeAssetBuildRequest(
      {
        assetId: "asset:minimal-triangle",
        sourcePath: "minimal-triangle.gltf",
        expectedManifestId: "asset:minimal-triangle:runtime"
      },
      adapter.config,
      ["asset:minimal-triangle:runtime"]
    );
    expect(normalized.ok).toBe(false);

    const report = await adapter.inspect({
      ...request(),
      expectedManifestId: "asset:minimal-triangle:runtime"
    });

    expect(normalized.diagnostics[0]?.code).toBe("manifest-conflict");
    expect(report.status).toBe("manifest-conflict");
    expect(report.manifestPatch.entries).toEqual([]);
    expect(report.diagnostics[0]?.code).toBe("manifest-conflict");
  });

  test("classifies budget warnings and failures in generated reports", async () => {
    const warningAdapter = createGltfAssetPipelineAdapter({
      config: {
        budgets: [
          {
            budgetId: "tiny-fixture",
            maxBytes: 2000,
            maxMeshes: 2,
            maxTriangles: 2,
            warningRatio: 0.5
          }
        ]
      }
    });
    const failAdapter = createGltfAssetPipelineAdapter({
      config: {
        budgets: [
          {
            budgetId: "tiny-fixture",
            maxBytes: 10,
            maxMeshes: 1,
            maxTriangles: 1,
            warningRatio: 0.8
          }
        ]
      }
    });

    const warning = await warningAdapter.inspect(request());
    const fail = await failAdapter.inspect(request());

    expect(warning.status).toBe("warning");
    expect(warning.budget.status).toBe("warning");
    expect(warning.diagnostics.map((diagnostic) => diagnostic.code)).toContain("budget-warning");
    expect(fail.status).toBe("budget-failed");
    expect(fail.budget.status).toBe("fail");
    expect(fail.diagnostics.map((diagnostic) => diagnostic.code)).toContain("budget-failed");
  });
});
