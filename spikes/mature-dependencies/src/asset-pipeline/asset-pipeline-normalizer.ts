import {
  createAssetPipelineDiagnostic,
  type AssetBudgetPolicy,
  type AssetBudgetResult,
  type AssetBuildRequest,
  type AssetMetrics,
  type AssetPipelineConfig,
  type AssetPipelineDiagnostic,
  type AssetPipelineResultStatus,
  type AssetVariantPolicy,
  type CompressionProfile
} from "./asset-pipeline-types";

export interface AssetBuildRequestInput extends Partial<AssetBuildRequest> {
  assetId: string;
  sourcePath: string;
}

export interface AssetPipelineConfigInput extends Partial<Omit<AssetPipelineConfig, "generatedArtifactPolicy">> {
  generatedArtifactPolicy?: Partial<AssetPipelineConfig["generatedArtifactPolicy"]>;
}

export interface NormalizedAssetBuildRequest {
  request: AssetBuildRequest;
  profile: CompressionProfile;
  variant: AssetVariantPolicy;
  budget: AssetBudgetPolicy;
}

export interface AssetPipelineNormalizationResult<TValue> {
  ok: boolean;
  status: AssetPipelineResultStatus;
  value?: TValue;
  diagnostics: AssetPipelineDiagnostic[];
}

export const defaultAssetPipelineConfig: AssetPipelineConfig = {
  adapterId: "asset-pipeline-adapter",
  sourceRoot: "fixtures",
  outputRoot: "reports/asset-pipeline/generated",
  defaultProfileId: "meshopt-reorder",
  defaultBudgetId: "tiny-fixture",
  diagnosticsLevel: "standard",
  cachePolicy: "reuse-unchanged",
  generatedArtifactPolicy: {
    outputRoot: "reports/asset-pipeline/generated",
    commitPolicy: "clean-after-smoke",
    maxCommittedBytes: 4096,
    cleanupAfterSmoke: true,
    allowedExtensions: [".gltf", ".glb", ".json"]
  },
  budgets: [
    {
      budgetId: "tiny-fixture",
      maxBytes: 4096,
      maxNodes: 4,
      maxMeshes: 2,
      maxMaterials: 2,
      maxTextures: 1,
      maxTriangles: 4,
      warningRatio: 0.8
    }
  ],
  variants: [
    {
      variantId: "runtime",
      target: "runtime",
      runtimeLoadHint: "generated"
    },
    {
      variantId: "source-preview",
      target: "editor-preview",
      runtimeLoadHint: "source"
    }
  ],
  profiles: [
    {
      profileId: "meshopt-reorder",
      label: "Meshopt reorder smoke profile",
      targetPlatforms: ["desktop", "browser"],
      pipelineIntent: "reorder"
    },
    {
      profileId: "inspect-only",
      label: "Inspect only profile",
      targetPlatforms: ["ci"],
      pipelineIntent: "inspect-only"
    }
  ]
};

const supportedSourceExtensions = [".gltf", ".glb"] as const;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, "");
}

function extensionOf(path: string): string {
  const normalized = normalizeSlashes(path);
  const fileName = normalized.split("/").at(-1) ?? "";
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function hasPathTraversal(path: string): boolean {
  return normalizeSlashes(path)
    .split("/")
    .some((segment) => segment === "..");
}

function joinRelative(root: string, relativePath: string): string {
  if (root === "." || root === "") {
    return trimLeadingSlash(relativePath);
  }

  return normalizeSlashes(`${trimLeadingSlash(root)}/${trimLeadingSlash(relativePath)}`);
}

function defaultArtifactPath(assetId: string, variantId: string): string {
  return `${assetId.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}-${variantId}.glb`;
}

export function normalizeAssetPipelineConfig(input: AssetPipelineConfigInput = {}): AssetPipelineConfig {
  return {
    ...defaultAssetPipelineConfig,
    ...input,
    generatedArtifactPolicy: {
      ...defaultAssetPipelineConfig.generatedArtifactPolicy,
      ...input.generatedArtifactPolicy
    },
    budgets: input.budgets ?? cloneJson(defaultAssetPipelineConfig.budgets),
    variants: input.variants ?? cloneJson(defaultAssetPipelineConfig.variants),
    profiles: input.profiles ?? cloneJson(defaultAssetPipelineConfig.profiles)
  };
}

export function normalizeAssetBuildRequest(
  input: AssetBuildRequestInput,
  config: AssetPipelineConfig = defaultAssetPipelineConfig,
  existingManifestIds: string[] = [],
  usedArtifactPaths: string[] = []
): AssetPipelineNormalizationResult<NormalizedAssetBuildRequest> {
  const diagnostics: AssetPipelineDiagnostic[] = [];
  const assetId = input.assetId.trim();
  const sourcePath = trimLeadingSlash(normalizeSlashes(input.sourcePath.trim()));
  const variantId = input.variantId ?? config.variants[0]?.variantId ?? "runtime";
  const profileId = input.profileId ?? config.defaultProfileId;
  const budgetId = input.budgetId ?? config.defaultBudgetId;
  const relativeArtifactPath = trimLeadingSlash(
    normalizeSlashes(input.outputArtifactPath ?? defaultArtifactPath(assetId, variantId))
  );
  const outputArtifactPath = joinRelative(config.generatedArtifactPolicy.outputRoot, relativeArtifactPath);
  const expectedManifestId = input.expectedManifestId ?? `${assetId}:${variantId}`;

  if (!assetId) {
    diagnostics.push(createAssetPipelineDiagnostic("manifest-conflict", "Asset build request requires a non-empty assetId."));
  }

  if (!sourcePath || hasPathTraversal(sourcePath)) {
    diagnostics.push(
      createAssetPipelineDiagnostic("path-traversal", "Asset source path must stay within the configured source root.", "error", false, {
        sourcePath
      })
    );
  }

  if (hasPathTraversal(relativeArtifactPath) || !outputArtifactPath.startsWith(trimLeadingSlash(config.generatedArtifactPolicy.outputRoot))) {
    diagnostics.push(
      createAssetPipelineDiagnostic("path-traversal", "Generated artifact path must stay within the configured output root.", "error", false, {
        outputArtifactPath
      })
    );
  }

  const sourceExtension = extensionOf(sourcePath);
  if (!supportedSourceExtensions.includes(sourceExtension as (typeof supportedSourceExtensions)[number])) {
    diagnostics.push(
      createAssetPipelineDiagnostic("unsupported-format", `Asset source extension ${sourceExtension || "<none>"} is not supported.`, "error", false, {
        sourcePath
      })
    );
  }

  const artifactExtension = extensionOf(outputArtifactPath);
  if (!config.generatedArtifactPolicy.allowedExtensions.includes(artifactExtension)) {
    diagnostics.push(
      createAssetPipelineDiagnostic("generated-artifact-blocked", `Generated artifact extension ${artifactExtension || "<none>"} is not allowed.`, "error", false, {
        outputArtifactPath
      })
    );
  }

  if (usedArtifactPaths.map(normalizeSlashes).includes(outputArtifactPath)) {
    diagnostics.push(
      createAssetPipelineDiagnostic("duplicate-artifact", `Generated artifact path ${outputArtifactPath} is already planned.`, "error", false, {
        outputArtifactPath
      })
    );
  }

  if (existingManifestIds.includes(expectedManifestId)) {
    diagnostics.push(
      createAssetPipelineDiagnostic("manifest-conflict", `Manifest id ${expectedManifestId} already exists.`, "error", false, {
        manifestId: expectedManifestId
      })
    );
  }

  const profile = config.profiles.find((candidate) => candidate.profileId === profileId);
  if (!profile) {
    diagnostics.push(
      createAssetPipelineDiagnostic("missing-profile", `Compression profile ${profileId} is not configured.`, "error", false, {
        profileId
      })
    );
  }

  const variant = config.variants.find((candidate) => candidate.variantId === variantId);
  if (!variant) {
    diagnostics.push(
      createAssetPipelineDiagnostic("missing-profile", `Asset variant ${variantId} is not configured.`, "error", false, {
        variantId
      })
    );
  }

  const budget = config.budgets.find((candidate) => candidate.budgetId === budgetId);
  if (!budget) {
    diagnostics.push(
      createAssetPipelineDiagnostic("missing-budget", `Asset budget ${budgetId} is not configured.`, "error", false, {
        budgetId
      })
    );
  }

  return {
    ok: diagnostics.length === 0,
    status: diagnostics.length === 0 ? "success" : diagnostics.some((diagnostic) => diagnostic.code === "unsupported-format") ? "unsupported-format" : "manifest-conflict",
    value:
      diagnostics.length === 0 && profile && variant && budget
        ? {
            request: {
              requestId: input.requestId ?? `${assetId}:${variantId}:${profileId}`,
              assetId,
              sourcePath: joinRelative(config.sourceRoot, sourcePath),
              variantId,
              profileId,
              budgetId,
              outputArtifactPath,
              expectedManifestId,
              cachePolicy: input.cachePolicy ?? config.cachePolicy,
              ...(input.metadata ? { metadata: input.metadata } : {})
            },
            profile,
            variant,
            budget
          }
        : undefined,
    diagnostics
  };
}

function thresholdExceeded(value: number, threshold?: number): boolean {
  return threshold !== undefined && value > threshold;
}

function thresholdWarns(value: number, threshold: number | undefined, warningRatio: number): boolean {
  return threshold !== undefined && value >= threshold * warningRatio && value <= threshold;
}

export function evaluateAssetBudget(metrics: AssetMetrics, policy: AssetBudgetPolicy): AssetBudgetResult {
  const diagnostics: AssetPipelineDiagnostic[] = [];
  const entries: Array<[keyof AssetMetrics, number | undefined]> = [
    ["bytes", policy.maxBytes],
    ["nodes", policy.maxNodes],
    ["meshes", policy.maxMeshes],
    ["materials", policy.maxMaterials],
    ["textures", policy.maxTextures],
    ["triangles", policy.maxTriangles]
  ];

  for (const [metricKey, limit] of entries) {
    const value = metrics[metricKey];
    if (thresholdExceeded(value, limit)) {
      diagnostics.push(
        createAssetPipelineDiagnostic("budget-failed", `Asset metric ${metricKey} exceeded budget.`, "error", false, {
          metric: metricKey,
          value,
          limit: limit ?? null
        })
      );
      continue;
    }

    if (thresholdWarns(value, limit, policy.warningRatio)) {
      diagnostics.push(
        createAssetPipelineDiagnostic("budget-warning", `Asset metric ${metricKey} is near budget.`, "warning", true, {
          metric: metricKey,
          value,
          limit: limit ?? null,
          warningRatio: policy.warningRatio
        })
      );
    }
  }

  return {
    budgetId: policy.budgetId,
    status: diagnostics.some((diagnostic) => diagnostic.code === "budget-failed")
      ? "fail"
      : diagnostics.some((diagnostic) => diagnostic.code === "budget-warning")
        ? "warning"
        : "pass",
    metrics,
    limits: cloneJson(policy),
    diagnostics
  };
}
