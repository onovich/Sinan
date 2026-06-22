import { describe, expect, test } from "vitest";
import { resolve } from "node:path";
import {
  defaultAssetPipelineConfig,
  evaluateAssetBudget,
  normalizeAssetBuildRequest,
  normalizeAssetPipelineConfig
} from "./asset-pipeline-normalizer";

describe("asset pipeline request normalization", () => {
  test("normalizes a valid source, profile, variant, budget, and artifact path", () => {
    const config = normalizeAssetPipelineConfig();
    const normalized = normalizeAssetBuildRequest(
      {
        assetId: "asset:minimal-triangle",
        sourcePath: "minimal-triangle.gltf"
      },
      config
    );

    expect(normalized.ok).toBe(true);
    expect(normalized.status).toBe("success");
    expect(normalized.value?.request.sourcePath).toBe("fixtures/minimal-triangle.gltf");
    expect(normalized.value?.request.outputArtifactPath).toBe("reports/asset-pipeline/generated/asset-minimal-triangle-runtime.glb");
    expect(normalized.value?.profile.profileId).toBe("meshopt-reorder");
    expect(normalized.value?.variant.runtimeLoadHint).toBe("generated");
    expect(normalized.value?.budget.budgetId).toBe("tiny-fixture");
  });

  test("blocks traversal and unsupported formats before any write path is used", () => {
    const normalized = normalizeAssetBuildRequest({
      assetId: "asset:bad",
      sourcePath: "../outside.png",
      outputArtifactPath: "../outside.bin"
    });

    expect(normalized.ok).toBe(false);
    expect(normalized.status).toBe("path-blocked");
    expect(normalized.value).toBeUndefined();
    expect(normalized.diagnostics.map((diagnostic) => diagnostic.code)).toContain("path-traversal");
    expect(normalized.diagnostics.map((diagnostic) => diagnostic.code)).toContain("unsupported-format");
    expect(normalized.diagnostics.map((diagnostic) => diagnostic.code)).toContain("generated-artifact-blocked");
  });

  test("rejects absolute, drive-qualified, UNC, URL-like, and empty paths", () => {
    const cases = [
      { sourcePath: resolve("fixtures", "minimal-triangle.gltf") },
      { sourcePath: "C:/outside/minimal-triangle.gltf" },
      { sourcePath: "//server/share/minimal-triangle.gltf" },
      { sourcePath: "file:///fixtures/minimal-triangle.gltf" },
      { sourcePath: "" },
      { sourcePath: "minimal-triangle.gltf", outputArtifactPath: resolve("reports", "asset-pipeline", "generated", "triangle.glb") },
      { sourcePath: "minimal-triangle.gltf", outputArtifactPath: "C:/outside/triangle.glb" },
      { sourcePath: "minimal-triangle.gltf", outputArtifactPath: "//server/share/triangle.glb" },
      { sourcePath: "minimal-triangle.gltf", outputArtifactPath: "file:///reports/triangle.glb" },
      { sourcePath: "minimal-triangle.gltf", outputArtifactPath: "" }
    ];

    for (const input of cases) {
      const normalized = normalizeAssetBuildRequest({
        assetId: "asset:blocked",
        ...input
      });

      expect(normalized.ok, JSON.stringify(input)).toBe(false);
      expect(normalized.status, JSON.stringify(input)).toBe("path-blocked");
      expect(normalized.diagnostics.map((diagnostic) => diagnostic.code), JSON.stringify(input)).toContain("path-traversal");
      expect(normalized.value).toBeUndefined();
    }
  });

  test("reports missing profile, missing budget, duplicate artifact, and manifest conflict", () => {
    const normalized = normalizeAssetBuildRequest(
      {
        assetId: "asset:triangle",
        sourcePath: "minimal-triangle.gltf",
        profileId: "missing-profile",
        budgetId: "missing-budget",
        outputArtifactPath: "triangle.glb",
        expectedManifestId: "asset:triangle:runtime"
      },
      defaultAssetPipelineConfig,
      ["asset:triangle:runtime"],
      ["reports/asset-pipeline/generated/triangle.glb"]
    );

    expect(normalized.ok).toBe(false);
    expect(normalized.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "duplicate-artifact",
      "manifest-conflict",
      "missing-profile",
      "missing-budget"
    ]);
  });

  test("classifies budget pass, warning, and fail deterministically", () => {
    const budget = {
      budgetId: "tiny",
      maxBytes: 100,
      maxNodes: 10,
      maxMeshes: 2,
      maxMaterials: 2,
      maxTextures: 1,
      maxTriangles: 12,
      warningRatio: 0.8
    };
    const pass = evaluateAssetBudget(
      {
        bytes: 20,
        nodes: 1,
        meshes: 1,
        materials: 0,
        textures: 0,
        triangles: 1
      },
      budget
    );
    const warning = evaluateAssetBudget(
      {
        bytes: 90,
        nodes: 8,
        meshes: 1,
        materials: 0,
        textures: 0,
        triangles: 10
      },
      budget
    );
    const fail = evaluateAssetBudget(
      {
        bytes: 101,
        nodes: 11,
        meshes: 3,
        materials: 0,
        textures: 0,
        triangles: 99
      },
      budget
    );

    expect(pass.status).toBe("pass");
    expect(warning.status).toBe("warning");
    expect(warning.diagnostics.map((diagnostic) => diagnostic.code)).toContain("budget-warning");
    expect(fail.status).toBe("fail");
    expect(fail.diagnostics.filter((diagnostic) => diagnostic.code === "budget-failed").length).toBeGreaterThanOrEqual(1);
  });
});
