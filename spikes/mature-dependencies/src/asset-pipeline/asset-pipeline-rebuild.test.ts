import { describe, expect, test } from "vitest";
import { compareAssetBuildReproducibility } from "./asset-pipeline-rebuild";
import type { AssetBuildReport } from "./asset-pipeline-types";

function report(overrides: Partial<AssetBuildReport> = {}): AssetBuildReport {
  return {
    requestId: "request",
    assetId: "asset:triangle",
    sourcePath: "minimal-triangle.gltf",
    variantId: "runtime",
    profileId: "meshopt-reorder",
    status: "success",
    sourceHash: "source-a",
    profileHash: "profile-a",
    metrics: {
      bytes: 1,
      nodes: 1,
      meshes: 1,
      materials: 0,
      textures: 0,
      triangles: 1
    },
    budget: {
      budgetId: "tiny",
      status: "pass",
      metrics: {
        bytes: 1,
        nodes: 1,
        meshes: 1,
        materials: 0,
        textures: 0,
        triangles: 1
      },
      limits: {
        budgetId: "tiny",
        warningRatio: 0.8
      },
      diagnostics: []
    },
    generatedArtifacts: [],
    manifestPatch: {
      patchId: "patch",
      conflicts: [],
      diagnostics: [],
      entries: [
        {
          manifestId: "manifest",
          assetId: "asset:triangle",
          variantId: "runtime",
          sourcePath: "minimal-triangle.gltf",
          artifactPath: "minimal-triangle.glb",
          runtimeLoadHint: "generated",
          sourceHash: "source-a",
          artifactHash: "artifact-a",
          metrics: {
            bytes: 1,
            nodes: 1,
            meshes: 1,
            materials: 0,
            textures: 0,
            triangles: 1
          },
          diagnostics: []
        }
      ]
    },
    diagnostics: [],
    reproducible: true,
    ...overrides
  };
}

describe("asset pipeline rebuild comparison", () => {
  test("reports stale source or profile changes", () => {
    const diagnostics = compareAssetBuildReproducibility(report(), report({ sourceHash: "source-b" }));

    expect(diagnostics[0]?.code).toBe("stale-source");
    expect(diagnostics[0]?.detail?.sourceChanged).toBe(true);
  });

  test("reports non-reproducible artifact hash changes for identical source/profile", () => {
    const diagnostics = compareAssetBuildReproducibility(
      report(),
      report({
        manifestPatch: {
          ...report().manifestPatch,
          entries: [
            {
              ...report().manifestPatch.entries[0],
              artifactHash: "artifact-b"
            }
          ]
        }
      })
    );

    expect(diagnostics[0]?.code).toBe("non-reproducible");
  });
});
