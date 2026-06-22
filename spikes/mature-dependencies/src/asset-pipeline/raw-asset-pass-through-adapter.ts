import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createAssetPipelineDiagnostic,
  createAssetPipelineResult,
  type AssetBuildReport,
  type AssetBuildRequest,
  type AssetMetrics,
  type AssetPipelineAdapter,
  type AssetPipelineConfig,
  type AssetPipelineDiagnostic,
  type AssetPipelineLifecycleState,
  type AssetPipelineResult,
  type AssetPipelineResultStatus
} from "./asset-pipeline-types";
import {
  defaultAssetPipelineConfig,
  evaluateAssetBudget,
  normalizeAssetBuildRequest,
  normalizeAssetPipelineConfig,
  type AssetPipelineConfigInput
} from "./asset-pipeline-normalizer";

export interface RawAssetPassThroughAdapterOptions {
  config?: AssetPipelineConfigInput;
  packageRoot?: string;
  fallbackReason?: string;
}

const emptyMetrics: AssetMetrics = {
  bytes: 0,
  nodes: 0,
  meshes: 0,
  materials: 0,
  textures: 0,
  triangles: 0
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stableHash(text: string | Uint8Array): string {
  return createHash("sha256").update(text).digest("hex");
}

function profileHash(config: AssetPipelineConfig, profileId: string): string {
  const profile = config.profiles.find((candidate) => candidate.profileId === profileId);
  return stableHash(JSON.stringify(profile ?? { profileId }, Object.keys(profile ?? { profileId }).sort()));
}

function fallbackMetrics(bytes: number): AssetMetrics {
  return {
    ...emptyMetrics,
    bytes
  };
}

export function createRawAssetPassThroughAdapter(options: RawAssetPassThroughAdapterOptions = {}): AssetPipelineAdapter {
  return new RawAssetPassThroughAdapter(options);
}

export class RawAssetPassThroughAdapter implements AssetPipelineAdapter {
  readonly config: AssetPipelineConfig;

  private readonly packageRoot: string;
  private readonly fallbackReason: string;
  private state: AssetPipelineLifecycleState = "idle";

  constructor(options: RawAssetPassThroughAdapterOptions = {}) {
    this.config = normalizeAssetPipelineConfig(options.config ?? defaultAssetPipelineConfig);
    this.packageRoot = options.packageRoot ?? process.cwd();
    this.fallbackReason = options.fallbackReason ?? "Optimization tooling is unavailable; using raw asset pass-through.";
  }

  get lifecycle(): AssetPipelineLifecycleState {
    return this.state;
  }

  async boot(): Promise<AssetPipelineResult> {
    if (this.state === "disposed") {
      return this.disposedResult("Raw asset pass-through adapter has been disposed.");
    }

    this.state = "idle";
    return createAssetPipelineResult("fallback", {
      value: {
        adapterId: this.config.adapterId
      },
      diagnostics: [this.fallbackDiagnostic()]
    });
  }

  async inspect(request: AssetBuildRequest): Promise<AssetBuildReport> {
    return this.createPassThroughReport(request, "fallback");
  }

  async build(request: AssetBuildRequest): Promise<AssetBuildReport> {
    return this.createPassThroughReport(request, "fallback");
  }

  async rebuild(request: AssetBuildRequest, previous?: AssetBuildReport): Promise<AssetBuildReport> {
    if (this.state === "disposed") {
      return this.disposedReport(request, "Cannot rebuild after asset pipeline disposal.");
    }

    const source = await this.readSource(request);
    if (!source.ok) {
      return this.failureReport(request, source.status, source.diagnostics);
    }

    const sourceHash = stableHash(source.bytes);
    if (previous && request.cachePolicy !== "force-rebuild" && previous.sourceHash === sourceHash && previous.profileHash === profileHash(this.config, request.profileId)) {
      this.state = "skipped";
      return this.reportFromSource(request, source.bytes.byteLength, sourceHash, "skipped", [
        createAssetPipelineDiagnostic("stale-source", "Source and profile are unchanged; pass-through rebuild skipped.", "info", false, {
          assetId: request.assetId
        })
      ]);
    }

    return this.reportFromSource(request, source.bytes.byteLength, sourceHash, "fallback", [this.fallbackDiagnostic()]);
  }

  async dispose(): Promise<AssetPipelineResult> {
    this.state = "disposed";
    return createAssetPipelineResult("success", {
      value: {
        adapterId: this.config.adapterId,
        lifecycle: this.lifecycle
      }
    });
  }

  private async createPassThroughReport(request: AssetBuildRequest, status: AssetPipelineResultStatus): Promise<AssetBuildReport> {
    if (this.state === "disposed") {
      return this.disposedReport(request, "Cannot inspect or build after asset pipeline disposal.");
    }

    const normalized = normalizeAssetBuildRequest(
      {
        ...request,
        sourcePath: request.sourcePath.replace(`${this.config.sourceRoot}/`, ""),
        outputArtifactPath: request.outputArtifactPath.replace(`${this.config.generatedArtifactPolicy.outputRoot}/`, "")
      },
      this.config
    );
    if (!normalized.ok) {
      return this.failureReport(request, normalized.status, normalized.diagnostics);
    }

    const source = await this.readSource(request);
    if (!source.ok) {
      return this.failureReport(request, source.status, source.diagnostics);
    }

    return this.reportFromSource(request, source.bytes.byteLength, stableHash(source.bytes), status, [this.fallbackDiagnostic()]);
  }

  private async readSource(request: AssetBuildRequest): Promise<
    | {
        ok: true;
        bytes: Uint8Array;
      }
    | {
        ok: false;
        status: AssetPipelineResultStatus;
        diagnostics: AssetPipelineDiagnostic[];
      }
  > {
    const sourcePath = resolve(this.packageRoot, request.sourcePath);
    try {
      const sourceStat = await stat(sourcePath);
      if (!sourceStat.isFile()) {
        return {
          ok: false,
          status: "missing-source",
          diagnostics: [createAssetPipelineDiagnostic("missing-source", `Asset source ${request.sourcePath} is not a file.`)]
        };
      }

      return {
        ok: true,
        bytes: await readFile(sourcePath)
      };
    } catch (error) {
      return {
        ok: false,
        status: "missing-source",
        diagnostics: [
          createAssetPipelineDiagnostic("missing-source", `Asset source ${request.sourcePath} could not be read.`, "error", false, {
            error: error instanceof Error ? `${error.name}: ${error.message}` : String(error)
          })
        ]
      };
    }
  }

  private reportFromSource(
    request: AssetBuildRequest,
    bytes: number,
    sourceHash: string,
    status: AssetPipelineResultStatus,
    diagnostics: AssetPipelineDiagnostic[]
  ): AssetBuildReport {
    this.state = status === "skipped" ? "skipped" : "reporting";
    const metrics = fallbackMetrics(bytes);
    const budget =
      this.config.budgets.find((candidate) => candidate.budgetId === request.budgetId) ?? this.config.budgets[0] ?? defaultAssetPipelineConfig.budgets[0];
    const budgetResult = evaluateAssetBudget(metrics, budget);
    const reportDiagnostics = [
      ...diagnostics,
      createAssetPipelineDiagnostic("budget-warning", "Raw pass-through asset was not optimized; review generated artifact policy.", "warning", true, {
        assetId: request.assetId
      }),
      ...budgetResult.diagnostics
    ];
    const profileDigest = profileHash(this.config, request.profileId);

    return {
      requestId: request.requestId,
      assetId: request.assetId,
      sourcePath: request.sourcePath,
      variantId: request.variantId,
      profileId: request.profileId,
      status,
      sourceHash,
      profileHash: profileDigest,
      metrics,
      budget: {
        ...budgetResult,
        diagnostics: cloneJson(budgetResult.diagnostics)
      },
      generatedArtifacts: [],
      manifestPatch: {
        patchId: `${request.requestId}:patch`,
        entries: [
          {
            manifestId: request.expectedManifestId ?? `${request.assetId}:${request.variantId}`,
            assetId: request.assetId,
            variantId: request.variantId,
            sourcePath: request.sourcePath,
            artifactPath: request.sourcePath,
            runtimeLoadHint: "source",
            sourceHash,
            metrics,
            diagnostics: cloneJson(reportDiagnostics)
          }
        ],
        conflicts: [],
        diagnostics: cloneJson(reportDiagnostics)
      },
      diagnostics: reportDiagnostics,
      reproducible: true
    };
  }

  private failureReport(
    request: AssetBuildRequest,
    status: AssetPipelineResultStatus,
    diagnostics: AssetPipelineDiagnostic[]
  ): AssetBuildReport {
    this.state = status === "unsupported-format" || status === "missing-source" ? "failed" : "reporting";
    const budget =
      this.config.budgets.find((candidate) => candidate.budgetId === request.budgetId) ?? this.config.budgets[0] ?? defaultAssetPipelineConfig.budgets[0];

    return {
      requestId: request.requestId,
      assetId: request.assetId,
      sourcePath: request.sourcePath,
      variantId: request.variantId,
      profileId: request.profileId,
      status,
      sourceHash: "",
      profileHash: profileHash(this.config, request.profileId),
      metrics: cloneJson(emptyMetrics),
      budget: {
        budgetId: budget.budgetId,
        status: "fail",
        metrics: cloneJson(emptyMetrics),
        limits: cloneJson(budget),
        diagnostics: cloneJson(diagnostics)
      },
      generatedArtifacts: [],
      manifestPatch: {
        patchId: `${request.requestId}:patch`,
        entries: [],
        conflicts: [],
        diagnostics: cloneJson(diagnostics)
      },
      diagnostics,
      reproducible: false
    };
  }

  private disposedReport(request: AssetBuildRequest, message: string): AssetBuildReport {
    const report = this.failureReport(request, "disposed", [createAssetPipelineDiagnostic("disposed-adapter", message)]);
    this.state = "disposed";
    return report;
  }

  private disposedResult(message: string): AssetPipelineResult {
    return createAssetPipelineResult("disposed", {
      diagnostics: [createAssetPipelineDiagnostic("disposed-adapter", message)]
    });
  }

  private fallbackDiagnostic(): AssetPipelineDiagnostic {
    return createAssetPipelineDiagnostic("fallback-used", this.fallbackReason, "warning", true, {
      adapter: "raw-pass-through"
    });
  }
}
