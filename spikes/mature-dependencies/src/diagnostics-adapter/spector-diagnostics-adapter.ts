import {
  createDiagnosticsMessage,
  createDiagnosticsResult,
  type DiagnosticsAdapter,
  type DiagnosticsAvailabilityCommand,
  type DiagnosticsCaptureStartCommand,
  type DiagnosticsCaptureStopCommand,
  type DiagnosticsCleanupArtifactsCommand,
  type DiagnosticsConfig,
  type DiagnosticsDisposeCommand,
  type DiagnosticsPerformanceMarkerCommand,
  type DiagnosticsResult,
  type DiagnosticsStatus
} from "./diagnostics-adapter-types";
import { defaultDiagnosticsConfig } from "./performance-diagnostics-adapter";

export interface SpectorDiagnosticsAdapterOptions {
  config?: Partial<DiagnosticsConfig>;
  browserWindow?: unknown;
  loadSpector?: () => Promise<unknown>;
}

function normalizeDiagnosticsConfig(input: Partial<DiagnosticsConfig> = {}): DiagnosticsConfig {
  return {
    ...defaultDiagnosticsConfig,
    ...input,
    capabilityIds: input.capabilityIds ?? ["frame-capture"],
    artifactPolicy: {
      ...defaultDiagnosticsConfig.artifactPolicy,
      ...input.artifactPolicy
    }
  };
}

function hasSpectorConstructor(moduleValue: unknown): boolean {
  const candidate = moduleValue as {
    default?: { SPECTOR?: { Spector?: unknown } };
    SPECTOR?: { Spector?: unknown };
  };
  return typeof candidate.SPECTOR?.Spector === "function" || typeof candidate.default?.SPECTOR?.Spector === "function";
}

export function createSpectorDiagnosticsAdapter(options: SpectorDiagnosticsAdapterOptions = {}): DiagnosticsAdapter {
  return new SpectorDiagnosticsAdapter(options);
}

export class SpectorDiagnosticsAdapter implements DiagnosticsAdapter {
  readonly config: DiagnosticsConfig;

  private readonly browserWindow: unknown;
  private readonly loadSpector: () => Promise<unknown>;
  private state: DiagnosticsStatus = "unavailable";

  constructor(options: SpectorDiagnosticsAdapterOptions = {}) {
    this.config = normalizeDiagnosticsConfig({
      diagnosticsEnabled: false,
      captureEnabled: false,
      ...options.config
    });
    this.browserWindow = options.browserWindow ?? globalThis.window;
    this.loadSpector =
      options.loadSpector ??
      (async () => {
        throw new Error("Dev-only diagnostics loader was not configured.");
      });
    this.state = this.resolveBlockedStatus() ?? "ready";
  }

  get status(): DiagnosticsStatus {
    return this.state;
  }

  async queryAvailability(command: DiagnosticsAvailabilityCommand): Promise<DiagnosticsResult> {
    if (this.state === "disposed") {
      return this.disposedResult(command.commandId);
    }

    const blocked = this.blockedResult(command.commandId, "frame-capture");
    if (blocked) {
      return blocked;
    }

    this.state = "ready";
    return createDiagnosticsResult(command.commandId, "ready", {
      capabilityId: "frame-capture",
      messages: [
        createDiagnosticsMessage("diagnostics-ready", "Dev-only frame capture diagnostics are available.", "info", false, {
          capabilityId: "frame-capture"
        })
      ]
    });
  }

  async markPerformance(command: DiagnosticsPerformanceMarkerCommand): Promise<DiagnosticsResult> {
    return createDiagnosticsResult(command.commandId, "unavailable", {
      capabilityId: "performance-marker",
      messages: [
        createDiagnosticsMessage(
          "diagnostics-unavailable",
          "Frame capture diagnostics adapter does not own Performance marker commands.",
          "warning"
        )
      ]
    });
  }

  async startCapture(command: DiagnosticsCaptureStartCommand): Promise<DiagnosticsResult> {
    if (this.state === "disposed") {
      return this.disposedResult(command.commandId);
    }

    const blocked = this.blockedResult(command.commandId, command.capabilityId);
    if (blocked) {
      return blocked;
    }

    this.state = "loading";
    try {
      const moduleValue = await this.loadSpector();
      if (!hasSpectorConstructor(moduleValue)) {
        this.state = "failed";
        return createDiagnosticsResult(command.commandId, "failed", {
          capabilityId: command.capabilityId,
          messages: [
            createDiagnosticsMessage("capture-failed", "Dev-only frame capture constructor was not found.", "error", true)
          ]
        });
      }

      this.state = "capturing";
      return createDiagnosticsResult(command.commandId, "capturing", {
        capabilityId: command.capabilityId,
        messages: [
          createDiagnosticsMessage("capture-started", "Dev-only frame capture command accepted.", "info", false, {
            capabilityId: command.capabilityId,
            frameBudgetMs: command.frameBudgetMs ?? null
          })
        ]
      });
    } catch (error) {
      this.state = "failed";
      return createDiagnosticsResult(command.commandId, "failed", {
        capabilityId: command.capabilityId,
        messages: [
          createDiagnosticsMessage("capture-failed", "Dev-only frame capture dependency failed to load.", "error", true, {
            error: error instanceof Error ? `${error.name}: ${error.message}` : String(error)
          })
        ]
      });
    }
  }

  async stopCapture(command: DiagnosticsCaptureStopCommand): Promise<DiagnosticsResult> {
    if (this.state === "disposed") {
      return this.disposedResult(command.commandId);
    }

    this.state = "complete";
    return createDiagnosticsResult(command.commandId, "complete", {
      capabilityId: command.capabilityId,
      messages: [createDiagnosticsMessage("capture-complete", "Dev-only frame capture command completed.")]
    });
  }

  async cleanupArtifacts(command: DiagnosticsCleanupArtifactsCommand): Promise<DiagnosticsResult> {
    if (this.state === "disposed") {
      return this.disposedResult(command.commandId);
    }

    return createDiagnosticsResult(command.commandId, "complete", {
      messages: [createDiagnosticsMessage("artifacts-cleaned", "Dev-only diagnostics capture artifacts were cleared.")]
    });
  }

  async dispose(command: DiagnosticsDisposeCommand): Promise<DiagnosticsResult> {
    this.state = "disposed";
    return this.disposedResult(command.commandId);
  }

  private resolveBlockedStatus(): DiagnosticsStatus | undefined {
    if (this.config.production || !this.config.devMode) {
      return "production-disabled";
    }

    if (!this.config.diagnosticsEnabled || !this.config.captureEnabled) {
      return "unavailable";
    }

    if (!this.browserWindow) {
      return "unavailable";
    }

    return undefined;
  }

  private blockedResult(commandId: string, capabilityId: string): DiagnosticsResult | undefined {
    const blockedStatus = this.resolveBlockedStatus();
    if (!blockedStatus) {
      return undefined;
    }

    this.state = blockedStatus;
    return createDiagnosticsResult(commandId, blockedStatus, {
      capabilityId,
      messages: [
        blockedStatus === "production-disabled"
          ? createDiagnosticsMessage("production-disabled", "Dev-only frame capture diagnostics are excluded from production behavior.")
          : createDiagnosticsMessage(
              !this.config.diagnosticsEnabled || !this.config.captureEnabled ? "feature-disabled" : "diagnostics-unavailable",
              !this.config.diagnosticsEnabled || !this.config.captureEnabled
                ? "Dev-only frame capture feature flag is disabled."
                : "Dev-only frame capture requires a browser window.",
              "warning"
            )
      ]
    });
  }

  private disposedResult(commandId: string): DiagnosticsResult {
    return createDiagnosticsResult(commandId, "disposed", {
      messages: [createDiagnosticsMessage("disposed-adapter", "Dev-only diagnostics adapter has been disposed.")]
    });
  }
}
