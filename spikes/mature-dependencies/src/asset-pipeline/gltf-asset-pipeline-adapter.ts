import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { inspect, prune, reorder } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
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
import { compareAssetBuildReproducibility } from "./asset-pipeline-rebuild";

export interface GltfAssetPipelineAdapterOptions {
  config?: AssetPipelineConfigInput;
  packageRoot?: string;
  existingManifestIds?: string[];
  usedArtifactPaths?: string[];
}

interface SourceReadResult {
  bytes: Uint8Array;
  hash: string;
  absolutePath: string;
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
  return stableHash(JSON.stringify(profile ?? { profileId }));
}

function extensionOf(path: string): string {
  const fileName = path.replace(/\\/g, "/").split("/").at(-1) ?? "";
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

export function createGltfAssetPipelineAdapter(options: GltfAssetPipelineAdapterOptions = {}): AssetPipelineAdapter {
  return new GltfAssetPipelineAdapter(options);
}

export class GltfAssetPipelineAdapter implements AssetPipelineAdapter {
  readonly config: AssetPipelineConfig;

  private readonly packageRoot: string;
  private readonly existingManifestIds: string[];
  private readonly usedArtifactPaths: string[];
  private state: AssetPipelineLifecycleState = "idle";
  private io?: NodeIO;

  constructor(options: GltfAssetPipelineAdapterOptions = {}) {
    this.config = normalizeAssetPipelineConfig(options.config ?? defaultAssetPipelineConfig);
    this.packageRoot = options.packageRoot ?? process.cwd();
    this.existingManifestIds = options.existingManifestIds ?? [];
    this.usedArtifactPaths = options.usedArtifactPaths ?? [];
  }

  get lifecycle(): AssetPipelineLifecycleState {
    return this.state;
  }

  async boot(): Promise<AssetPipelineResult> {
    if (this.state === "disposed") {
      return this.disposedResult("glTF asset pipeline adapter has been disposed.");
    }

    try {
      await MeshoptEncoder.ready;
      this.io = new NodeIO();
      this.state = "idle";
      return createAssetPipelineResult("success", {
        value: {
          adapterId: this.config.adapterId,
          toolchain: "offline-gltf-pipeline"
        }
      });
    } catch (error) {
      this.state = "failed";
      return createAssetPipelineResult("tool-failed", {
        diagnostics: [this.toolFailureDiagnostic("Tool initialization failed.", error)]
      });
    }
  }

  async inspect(request: AssetBuildRequest): Promise<AssetBuildReport> {
    if (this.state === "disposed") {
      return this.disposedReport(request, "Cannot inspect after asset pipeline disposal.");
    }

    const normalized = this.validateRequest(request);
    if (!normalized.ok) {
      return this.failureReport(request, normalized.status, normalized.diagnostics);
    }

    const safeRequest = normalized.value!.request;
    const source = await this.readSource(safeRequest);
    if (!source.ok) {
      return this.failureReport(safeRequest, source.status, source.diagnostics);
    }

    try {
      this.state = "inspecting";
      const io = this.io ?? new NodeIO();
      const document = await io.read(source.absolutePath);
      const inspection = inspect(document);
      const metrics = this.metricsFromDocument(document, source.bytes.byteLength);
      const diagnostics = [
        createAssetPipelineDiagnostic("fallback-used", "Inspect completed without writing generated artifacts.", "info", false, {
          phase: "inspect-only"
        })
      ];

      this.state = "reporting";
      return this.reportFromMetrics(safeRequest, source, metrics, "success", diagnostics, {
        reportKeys: Object.keys(inspection).sort()
      });
    } catch (error) {
      this.state = "failed";
      return this.failureReport(safeRequest, "tool-failed", [this.toolFailureDiagnostic("glTF inspection failed.", error)]);
    }
  }

  async build(request: AssetBuildRequest): Promise<AssetBuildReport> {
    if (this.state === "disposed") {
      return this.disposedReport(request, "Cannot build after asset pipeline disposal.");
    }

    const normalized = this.validateRequest(request);
    if (!normalized.ok) {
      return this.failureReport(request, normalized.status, normalized.diagnostics);
    }

    const safeRequest = normalized.value!.request;
    const source = await this.readSource(safeRequest);
    if (!source.ok) {
      return this.failureReport(safeRequest, source.status, source.diagnostics);
    }

    try {
      this.state = "transforming";
      await MeshoptEncoder.ready;
      const io = this.io ?? new NodeIO();
      const document = await io.read(source.absolutePath);
      const profile = this.config.profiles.find((candidate) => candidate.profileId === safeRequest.profileId);

      if (profile?.pipelineIntent !== "inspect-only") {
        await document.transform(reorder({ encoder: MeshoptEncoder }), prune());
      }

      const glb = await io.writeBinary(document);
      const artifactPath = resolve(this.packageRoot, safeRequest.outputArtifactPath);
      await mkdir(dirname(artifactPath), { recursive: true });
      await writeFile(artifactPath, glb);

      const roundTrip = await io.readBinary(glb);
      const roundTripInspection = inspect(roundTrip);
      const metrics = this.metricsFromDocument(roundTrip, glb.byteLength);
      const artifactHash = stableHash(glb);

      this.state = "reporting";
      return this.reportFromMetrics(safeRequest, source, metrics, "success", [], {
        reportKeys: Object.keys(roundTripInspection).sort(),
        artifact: {
          hash: artifactHash,
          bytes: glb.byteLength
        }
      });
    } catch (error) {
      this.state = "failed";
      return this.failureReport(safeRequest, "tool-failed", [this.toolFailureDiagnostic("glTF transform/write failed.", error)]);
    }
  }

  async rebuild(request: AssetBuildRequest, previous?: AssetBuildReport): Promise<AssetBuildReport> {
    if (this.state === "disposed") {
      return this.disposedReport(request, "Cannot rebuild after asset pipeline disposal.");
    }

    const normalized = this.validateRequest(request);
    if (!normalized.ok) {
      return this.failureReport(request, normalized.status, normalized.diagnostics);
    }

    const safeRequest = normalized.value!.request;
    const source = await this.readSource(safeRequest);
    if (!source.ok) {
      return this.failureReport(safeRequest, source.status, source.diagnostics);
    }

    const digest = profileHash(this.config, safeRequest.profileId);
    if (
      previous &&
      safeRequest.cachePolicy !== "force-rebuild" &&
      safeRequest.cachePolicy !== "disabled" &&
      previous.sourceHash === source.hash &&
      previous.profileHash === digest
    ) {
      this.state = "skipped";
      return {
        ...previous,
        status: "skipped",
        diagnostics: [
          ...previous.diagnostics,
          createAssetPipelineDiagnostic("stale-source", "Source and profile are unchanged; generated artifact rebuild skipped.", "info", false, {
            assetId: safeRequest.assetId
          })
        ],
        manifestPatch: {
          ...previous.manifestPatch,
          diagnostics: [
            ...previous.manifestPatch.diagnostics,
            createAssetPipelineDiagnostic("stale-source", "Source and profile are unchanged; generated artifact rebuild skipped.", "info", false, {
              assetId: safeRequest.assetId
            })
          ]
        }
      };
    }

    const rebuilt = await this.build(safeRequest);
    if (!previous) {
      return rebuilt;
    }

    const rebuildDiagnostics = compareAssetBuildReproducibility(previous, rebuilt);
    if (rebuildDiagnostics.length === 0) {
      return rebuilt;
    }

    const status = rebuildDiagnostics.some((diagnostic) => diagnostic.code === "non-reproducible") ? "non-reproducible" : rebuilt.status;
    return {
      ...rebuilt,
      status,
      reproducible: status !== "non-reproducible",
      diagnostics: [...rebuilt.diagnostics, ...rebuildDiagnostics],
      manifestPatch: {
        ...rebuilt.manifestPatch,
        diagnostics: [...rebuilt.manifestPatch.diagnostics, ...rebuildDiagnostics]
      }
    };
  }

  async dispose(): Promise<AssetPipelineResult> {
    this.io = undefined;
    this.state = "disposed";
    return createAssetPipelineResult("success", {
      value: {
        adapterId: this.config.adapterId,
        lifecycle: this.lifecycle
      }
    });
  }

  private validateRequest(request: AssetBuildRequest): ReturnType<typeof normalizeAssetBuildRequest> {
    return normalizeAssetBuildRequest(
      {
        ...request,
        sourcePath: request.sourcePath.replace(`${this.config.sourceRoot}/`, ""),
        outputArtifactPath: request.outputArtifactPath.replace(`${this.config.generatedArtifactPolicy.outputRoot}/`, "")
      },
      this.config,
      this.existingManifestIds,
      this.usedArtifactPaths,
      this.packageRoot
    );
  }

  private async readSource(request: AssetBuildRequest): Promise<
    | {
        ok: true;
      } & SourceReadResult
    | {
        ok: false;
        status: AssetPipelineResultStatus;
        diagnostics: AssetPipelineDiagnostic[];
      }
  > {
    if (![".gltf", ".glb"].includes(extensionOf(request.sourcePath))) {
      return {
        ok: false,
        status: "unsupported-format",
        diagnostics: [
          createAssetPipelineDiagnostic("unsupported-format", `Asset source ${request.sourcePath} is not a supported glTF source.`, "error", false, {
            sourcePath: request.sourcePath
          })
        ]
      };
    }

    const absolutePath = resolve(this.packageRoot, request.sourcePath);
    try {
      const bytes = await readFile(absolutePath);
      return {
        ok: true,
        bytes,
        hash: stableHash(bytes),
        absolutePath
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

  private metricsFromDocument(
    document: {
      getRoot(): {
        listNodes(): unknown[];
        listMeshes(): Array<{
          listPrimitives(): unknown[];
        }>;
        listMaterials(): unknown[];
        listTextures(): unknown[];
      };
    },
    bytes: number
  ): AssetMetrics {
    const root = document.getRoot();
    return {
      bytes,
      nodes: root.listNodes().length,
      meshes: root.listMeshes().length,
      materials: root.listMaterials().length,
      textures: root.listTextures().length,
      triangles: root.listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().length, 0)
    };
  }

  private reportFromMetrics(
    request: AssetBuildRequest,
    source: SourceReadResult,
    metrics: AssetMetrics,
    status: AssetPipelineResultStatus,
    diagnostics: AssetPipelineDiagnostic[],
    detail: {
      reportKeys: string[];
      artifact?: {
        hash: string;
        bytes: number;
      };
    }
  ): AssetBuildReport {
    const budget =
      this.config.budgets.find((candidate) => candidate.budgetId === request.budgetId) ?? this.config.budgets[0] ?? defaultAssetPipelineConfig.budgets[0];
    const budgetResult = evaluateAssetBudget(metrics, budget);
    const reportDiagnostics = [...diagnostics, ...budgetResult.diagnostics];
    const digest = profileHash(this.config, request.profileId);

    return {
      requestId: request.requestId,
      assetId: request.assetId,
      sourcePath: request.sourcePath,
      variantId: request.variantId,
      profileId: request.profileId,
      status: budgetResult.status === "fail" ? "budget-failed" : budgetResult.status === "warning" ? "warning" : status,
      sourceHash: source.hash,
      profileHash: digest,
      metrics,
      budget: budgetResult,
      generatedArtifacts: detail.artifact
        ? [
            {
              artifactId: `${request.assetId}:${request.variantId}:artifact`,
              artifactPath: request.outputArtifactPath,
              mediaType: "model/gltf-binary",
              bytes: detail.artifact.bytes,
              sourceHash: source.hash,
              profileHash: digest,
              generatedAt: "deterministic-smoke",
              committed: false,
              rebuildable: true
            }
          ]
        : [],
      manifestPatch: {
        patchId: `${request.requestId}:inspect-patch`,
        entries: [
          {
            manifestId: request.expectedManifestId ?? `${request.assetId}:${request.variantId}`,
            assetId: request.assetId,
            variantId: request.variantId,
            sourcePath: request.sourcePath,
            artifactPath: detail.artifact ? request.outputArtifactPath : request.sourcePath,
            runtimeLoadHint: detail.artifact ? "generated" : "source",
            sourceHash: source.hash,
            ...(detail.artifact ? { artifactHash: detail.artifact.hash } : {}),
            metrics,
            diagnostics: cloneJson(reportDiagnostics)
          }
        ],
        conflicts: [],
        diagnostics: cloneJson(reportDiagnostics)
      },
      diagnostics: [
        ...reportDiagnostics,
        createAssetPipelineDiagnostic("fallback-used", "Inspect report normalized to Sinan asset pipeline shape.", "info", false, {
          reportKeys: detail.reportKeys.join(",")
        })
      ],
      reproducible: true
    };
  }

  private failureReport(
    request: AssetBuildRequest,
    status: AssetPipelineResultStatus,
    diagnostics: AssetPipelineDiagnostic[]
  ): AssetBuildReport {
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
        patchId: `${request.requestId}:inspect-patch`,
        entries: [],
        conflicts: [],
        diagnostics: cloneJson(diagnostics)
      },
      diagnostics,
      reproducible: false
    };
  }

  private disposedReport(request: AssetBuildRequest, message: string): AssetBuildReport {
    return this.failureReport(request, "disposed", [createAssetPipelineDiagnostic("disposed-adapter", message)]);
  }

  private disposedResult(message: string): AssetPipelineResult {
    return createAssetPipelineResult("disposed", {
      diagnostics: [createAssetPipelineDiagnostic("disposed-adapter", message)]
    });
  }

  private toolFailureDiagnostic(message: string, error: unknown): AssetPipelineDiagnostic {
    return createAssetPipelineDiagnostic("tool-failed", message, "error", true, {
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    });
  }
}
