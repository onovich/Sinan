export type AssetPipelineJsonPrimitive = string | number | boolean | null;
export type AssetPipelineJsonValue =
  | AssetPipelineJsonPrimitive
  | AssetPipelineJsonValue[]
  | { [key: string]: AssetPipelineJsonValue };
export type AssetPipelineJsonObject = { [key: string]: AssetPipelineJsonValue };

export const assetPipelineLifecycleStates = [
  "idle",
  "inspecting",
  "transforming",
  "reporting",
  "failed",
  "skipped",
  "disposed"
] as const;

export type AssetPipelineLifecycleState = (typeof assetPipelineLifecycleStates)[number];

export const assetPipelineResultStatuses = [
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
] as const;

export type AssetPipelineResultStatus = (typeof assetPipelineResultStatuses)[number];

export const assetPipelineDiagnosticCodes = [
  "missing-source",
  "unsupported-format",
  "tool-failed",
  "budget-warning",
  "budget-failed",
  "path-traversal",
  "duplicate-artifact",
  "missing-profile",
  "missing-budget",
  "manifest-conflict",
  "stale-source",
  "non-reproducible",
  "generated-artifact-blocked",
  "fallback-used",
  "disposed-adapter"
] as const;

export type AssetPipelineDiagnosticCode = (typeof assetPipelineDiagnosticCodes)[number];

export type AssetPipelineDiagnosticSeverity = "info" | "warning" | "error";

export interface AssetPipelineDiagnostic {
  code: AssetPipelineDiagnosticCode;
  severity: AssetPipelineDiagnosticSeverity;
  message: string;
  retryable: boolean;
  detail?: AssetPipelineJsonObject;
}

export type AssetPipelineDiagnosticsLevel = "minimal" | "standard" | "verbose";
export type AssetPipelineCachePolicy = "disabled" | "reuse-unchanged" | "force-rebuild";
export type GeneratedArtifactCommitPolicy = "commit-tiny-fixture" | "ignore-and-rebuild" | "clean-after-smoke";
export type AssetPipelineBudgetSeverity = "pass" | "warning" | "fail";

export interface AssetBudgetPolicy {
  budgetId: string;
  maxBytes?: number;
  maxNodes?: number;
  maxMeshes?: number;
  maxMaterials?: number;
  maxTextures?: number;
  maxTriangles?: number;
  warningRatio: number;
}

export interface AssetVariantPolicy {
  variantId: string;
  target: "editor-preview" | "runtime" | "showcase" | "ci-smoke";
  runtimeLoadHint: "source" | "generated" | "lazy-generated";
}

export interface CompressionProfile {
  profileId: string;
  label: string;
  targetPlatforms: string[];
  pipelineIntent: "inspect-only" | "reorder" | "optimize";
}

export interface GeneratedArtifactPolicy {
  outputRoot: string;
  commitPolicy: GeneratedArtifactCommitPolicy;
  maxCommittedBytes: number;
  cleanupAfterSmoke: boolean;
  allowedExtensions: string[];
}

export interface AssetPipelineConfig {
  adapterId: string;
  sourceRoot: string;
  outputRoot: string;
  defaultProfileId: string;
  defaultBudgetId: string;
  diagnosticsLevel: AssetPipelineDiagnosticsLevel;
  cachePolicy: AssetPipelineCachePolicy;
  generatedArtifactPolicy: GeneratedArtifactPolicy;
  budgets: AssetBudgetPolicy[];
  variants: AssetVariantPolicy[];
  profiles: CompressionProfile[];
}

export interface AssetBuildRequest {
  requestId: string;
  assetId: string;
  sourcePath: string;
  variantId: string;
  profileId: string;
  budgetId: string;
  outputArtifactPath: string;
  expectedManifestId?: string;
  cachePolicy?: AssetPipelineCachePolicy;
  metadata?: AssetPipelineJsonObject;
}

export interface AssetMetrics {
  bytes: number;
  nodes: number;
  meshes: number;
  materials: number;
  textures: number;
  triangles: number;
}

export interface AssetBudgetResult {
  budgetId: string;
  status: AssetPipelineBudgetSeverity;
  metrics: AssetMetrics;
  limits: AssetBudgetPolicy;
  diagnostics: AssetPipelineDiagnostic[];
}

export interface AssetGeneratedArtifact {
  artifactId: string;
  artifactPath: string;
  mediaType: "model/gltf+json" | "model/gltf-binary" | "application/octet-stream";
  bytes: number;
  sourceHash: string;
  profileHash: string;
  generatedAt: string;
  committed: boolean;
  rebuildable: boolean;
}

export interface AssetManifestPatchEntry {
  manifestId: string;
  assetId: string;
  variantId: string;
  sourcePath: string;
  artifactPath: string;
  runtimeLoadHint: AssetVariantPolicy["runtimeLoadHint"];
  sourceHash: string;
  artifactHash?: string;
  metrics: AssetMetrics;
  diagnostics: AssetPipelineDiagnostic[];
}

export interface AssetManifestPatch {
  patchId: string;
  entries: AssetManifestPatchEntry[];
  conflicts: string[];
  diagnostics: AssetPipelineDiagnostic[];
}

export interface AssetBuildReport {
  requestId: string;
  assetId: string;
  sourcePath: string;
  variantId: string;
  profileId: string;
  status: AssetPipelineResultStatus;
  sourceHash: string;
  profileHash: string;
  metrics: AssetMetrics;
  budget: AssetBudgetResult;
  generatedArtifacts: AssetGeneratedArtifact[];
  manifestPatch: AssetManifestPatch;
  diagnostics: AssetPipelineDiagnostic[];
  reproducible: boolean;
}

export interface AssetPipelineResult<TValue extends AssetPipelineJsonObject = AssetPipelineJsonObject> {
  status: AssetPipelineResultStatus;
  ok: boolean;
  value?: TValue;
  diagnostics: AssetPipelineDiagnostic[];
}

export interface AssetPipelineAdapter {
  readonly lifecycle: AssetPipelineLifecycleState;
  readonly config: AssetPipelineConfig;

  boot(): Promise<AssetPipelineResult>;
  inspect(request: AssetBuildRequest): Promise<AssetBuildReport>;
  build(request: AssetBuildRequest): Promise<AssetBuildReport>;
  rebuild(request: AssetBuildRequest, previous?: AssetBuildReport): Promise<AssetBuildReport>;
  dispose(): Promise<AssetPipelineResult>;
}

export function createAssetPipelineDiagnostic(
  code: AssetPipelineDiagnosticCode,
  message: string,
  severity: AssetPipelineDiagnosticSeverity = "error",
  retryable = false,
  detail?: AssetPipelineJsonObject
): AssetPipelineDiagnostic {
  return {
    code,
    severity,
    message,
    retryable,
    ...(detail ? { detail } : {})
  };
}

export function createAssetPipelineResult<TValue extends AssetPipelineJsonObject = AssetPipelineJsonObject>(
  status: AssetPipelineResultStatus,
  options: {
    value?: TValue;
    diagnostics?: AssetPipelineDiagnostic[];
  } = {}
): AssetPipelineResult<TValue> {
  return {
    status,
    ok: status === "success" || status === "warning" || status === "skipped" || status === "fallback",
    value: options.value,
    diagnostics: options.diagnostics ?? []
  };
}
