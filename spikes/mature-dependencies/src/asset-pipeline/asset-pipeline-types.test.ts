import { describe, expect, test } from "vitest";
import {
  assetPipelineDiagnosticCodes,
  assetPipelineLifecycleStates,
  assetPipelineResultStatuses,
  createAssetPipelineDiagnostic,
  createAssetPipelineResult,
  type AssetBuildReport,
  type AssetManifestPatch
} from "./asset-pipeline-types";

describe("AssetPipelineAdapter contract types", () => {
  test("defines lifecycle states and result statuses required by RFC-009", () => {
    expect(assetPipelineLifecycleStates).toEqual([
      "idle",
      "inspecting",
      "transforming",
      "reporting",
      "failed",
      "skipped",
      "disposed"
    ]);
    expect(assetPipelineResultStatuses).toEqual([
      "success",
      "warning",
      "budget-failed",
      "missing-source",
      "unsupported-format",
      "tool-failed",
      "path-blocked",
      "stale-source",
      "non-reproducible",
      "manifest-conflict",
      "skipped",
      "fallback",
      "disposed"
    ]);
    expect(assetPipelineDiagnosticCodes).toContain("generated-artifact-blocked");
    expect(assetPipelineDiagnosticCodes).toContain("fallback-used");
  });

  test("creates deterministic diagnostic and result envelopes", () => {
    const diagnostic = createAssetPipelineDiagnostic("budget-warning", "Triangle budget is close to the warning threshold.", "warning", true, {
      assetId: "asset:triangle",
      ratio: 0.9
    });
    const result = createAssetPipelineResult("warning", {
      value: {
        reportId: "report:triangle"
      },
      diagnostics: [diagnostic]
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("warning");
    expect(result.diagnostics[0]).toEqual(diagnostic);
    expect(createAssetPipelineResult("budget-failed").ok).toBe(false);
    expect(createAssetPipelineResult("fallback").ok).toBe(true);
  });

  test("keeps manifest patches and build reports Sinan-owned", () => {
    const manifestPatch: AssetManifestPatch = {
      patchId: "patch:triangle",
      entries: [
        {
          manifestId: "manifest:triangle:runtime",
          assetId: "asset:triangle",
          variantId: "runtime",
          sourcePath: "fixtures/minimal-triangle.gltf",
          artifactPath: "reports/asset-pipeline/generated/minimal-triangle.glb",
          runtimeLoadHint: "generated",
          sourceHash: "source-hash",
          artifactHash: "artifact-hash",
          metrics: {
            bytes: 716,
            nodes: 1,
            meshes: 1,
            materials: 0,
            textures: 0,
            triangles: 1
          },
          diagnostics: []
        }
      ],
      conflicts: [],
      diagnostics: []
    };
    const report: AssetBuildReport = {
      requestId: "request:triangle",
      assetId: "asset:triangle",
      sourcePath: "fixtures/minimal-triangle.gltf",
      variantId: "runtime",
      profileId: "meshopt-reorder",
      status: "success",
      sourceHash: "source-hash",
      profileHash: "profile-hash",
      metrics: manifestPatch.entries[0].metrics,
      budget: {
        budgetId: "tiny-fixture",
        status: "pass",
        metrics: manifestPatch.entries[0].metrics,
        limits: {
          budgetId: "tiny-fixture",
          maxBytes: 2048,
          maxMeshes: 1,
          maxTriangles: 1,
          warningRatio: 0.8
        },
        diagnostics: []
      },
      generatedArtifacts: [
        {
          artifactId: "artifact:triangle:runtime",
          artifactPath: "reports/asset-pipeline/generated/minimal-triangle.glb",
          mediaType: "model/gltf-binary",
          bytes: 716,
          sourceHash: "source-hash",
          profileHash: "profile-hash",
          generatedAt: "2026-06-22T00:00:00.000Z",
          committed: false,
          rebuildable: true
        }
      ],
      manifestPatch,
      diagnostics: [],
      reproducible: true
    };

    expect(report.manifestPatch.entries[0].assetId).toBe("asset:triangle");
    expect(report.generatedArtifacts[0].rebuildable).toBe(true);
    expect(JSON.stringify(report)).not.toMatch(/NodeIO|Document|Meshopt|gltf-transform|meshoptimizer|Transform\b/);
  });
});
