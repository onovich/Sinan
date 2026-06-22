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
  type DiagnosticsMessage,
  type DiagnosticsPerformanceMarkerCommand,
  type DiagnosticsResult,
  type DiagnosticsStatus
} from "./diagnostics-adapter-types";

export interface PerformanceLike {
  mark?: (markName: string) => void;
  measure?: (measureName: string, startMark?: string, endMark?: string) => void;
  getEntriesByName?: (name: string, type?: string) => Array<{ duration?: number }>;
  clearMarks?: (markName?: string) => void;
  clearMeasures?: (measureName?: string) => void;
}

export interface PerformanceDiagnosticsAdapterOptions {
  config?: Partial<DiagnosticsConfig>;
  performance?: PerformanceLike;
}

export const defaultDiagnosticsConfig: DiagnosticsConfig = {
  adapterId: "diagnostics-adapter",
  devMode: true,
  production: false,
  diagnosticsEnabled: true,
  captureEnabled: false,
  capabilityIds: ["performance-marker"],
  artifactPolicy: {
    retentionClass: "local-temporary",
    localOnly: true,
    maxArtifactBytes: 0,
    cleanupAfterSmoke: true,
    allowedExtensions: [".json"]
  }
};

function normalizeDiagnosticsConfig(input: Partial<DiagnosticsConfig> = {}): DiagnosticsConfig {
  return {
    ...defaultDiagnosticsConfig,
    ...input,
    artifactPolicy: {
      ...defaultDiagnosticsConfig.artifactPolicy,
      ...input.artifactPolicy
    },
    capabilityIds: input.capabilityIds ?? [...defaultDiagnosticsConfig.capabilityIds]
  };
}

function isValidMarkerName(markerName: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,127}$/.test(markerName);
}

function markerUnsupportedMessage(): DiagnosticsMessage {
  return createDiagnosticsMessage(
    "diagnostics-unavailable",
    "Performance marker diagnostics are unavailable in this environment.",
    "warning",
    false,
    {
      capabilityId: "performance-marker"
    }
  );
}

function productionDisabledMessage(): DiagnosticsMessage {
  return createDiagnosticsMessage(
    "production-disabled",
    "Diagnostics are disabled in production behavior.",
    "info",
    false
  );
}

function featureDisabledMessage(): DiagnosticsMessage {
  return createDiagnosticsMessage(
    "feature-disabled",
    "Diagnostics feature flag is disabled.",
    "info",
    false
  );
}

export function createPerformanceDiagnosticsAdapter(options: PerformanceDiagnosticsAdapterOptions = {}): DiagnosticsAdapter {
  return new PerformanceDiagnosticsAdapter(options);
}

export class PerformanceDiagnosticsAdapter implements DiagnosticsAdapter {
  readonly config: DiagnosticsConfig;

  private readonly performance?: PerformanceLike;
  private state: DiagnosticsStatus = "ready";

  constructor(options: PerformanceDiagnosticsAdapterOptions = {}) {
    this.config = normalizeDiagnosticsConfig(options.config);
    this.performance = options.performance ?? globalThis.performance;
    this.state = this.resolveInitialStatus();
  }

  get status(): DiagnosticsStatus {
    return this.state;
  }

  async queryAvailability(command: DiagnosticsAvailabilityCommand): Promise<DiagnosticsResult> {
    if (this.state === "disposed") {
      return this.disposedResult(command.commandId);
    }

    this.state = this.resolveInitialStatus();
    return createDiagnosticsResult(command.commandId, this.state, {
      capabilityId: "performance-marker",
      messages: [
        this.state === "production-disabled"
          ? productionDisabledMessage()
          : this.state === "ready"
            ? createDiagnosticsMessage("diagnostics-ready", "Performance marker diagnostics are ready.", "info", false, {
                capabilityId: "performance-marker"
              })
            : this.config.diagnosticsEnabled
              ? markerUnsupportedMessage()
              : featureDisabledMessage()
      ]
    });
  }

  async markPerformance(command: DiagnosticsPerformanceMarkerCommand): Promise<DiagnosticsResult> {
    if (this.state === "disposed") {
      return this.disposedResult(command.commandId);
    }

    const blocked = this.blockedResult(command.commandId, "performance-marker");
    if (blocked) {
      return blocked;
    }

    if (!isValidMarkerName(command.markerName)) {
      this.state = "failed";
      return createDiagnosticsResult(command.commandId, "failed", {
        capabilityId: "performance-marker",
        messages: [
          createDiagnosticsMessage("performance-marker-invalid", "Performance marker name is invalid.", "error", false, {
            markerName: command.markerName
          })
        ]
      });
    }

    if (!this.isPerformanceSupported()) {
      this.state = "unavailable";
      return createDiagnosticsResult(command.commandId, "unavailable", {
        capabilityId: "performance-marker",
        messages: [markerUnsupportedMessage()]
      });
    }

    const start = `${command.markerName}:start`;
    const end = `${command.markerName}:end`;
    try {
      this.performance!.mark!(start);
      this.performance!.mark!(end);
      this.performance!.measure!(command.markerName, start, end);
      const latest = this.performance!.getEntriesByName?.(command.markerName, "measure").at(-1);
      this.performance!.clearMarks?.(start);
      this.performance!.clearMarks?.(end);
      this.performance!.clearMeasures?.(command.markerName);
      this.state = "complete";

      return createDiagnosticsResult(command.commandId, "complete", {
        capabilityId: "performance-marker",
        messages: [
          createDiagnosticsMessage("performance-marker-recorded", "Performance marker recorded and cleaned.", "info", false, {
            markerName: command.markerName,
            label: command.label ?? command.markerName
          })
        ],
        metrics: [
          {
            metricId: command.markerName,
            label: command.label ?? command.markerName,
            value: latest?.duration ?? 0,
            unit: "ms"
          }
        ]
      });
    } catch (error) {
      this.state = "failed";
      return createDiagnosticsResult(command.commandId, "failed", {
        capabilityId: "performance-marker",
        messages: [
          createDiagnosticsMessage("capture-failed", "Performance marker command failed.", "error", true, {
            error: error instanceof Error ? `${error.name}: ${error.message}` : String(error)
          })
        ]
      });
    }
  }

  async startCapture(command: DiagnosticsCaptureStartCommand): Promise<DiagnosticsResult> {
    if (this.state === "disposed") {
      return this.disposedResult(command.commandId);
    }

    const blocked = this.blockedResult(command.commandId, command.capabilityId);
    if (blocked) {
      return blocked;
    }

    return createDiagnosticsResult(command.commandId, "unavailable", {
      capabilityId: command.capabilityId,
      messages: [
        createDiagnosticsMessage(
          "diagnostics-unavailable",
          "Performance marker adapter does not provide frame capture.",
          "warning",
          false,
          { capabilityId: command.capabilityId }
        )
      ]
    });
  }

  async stopCapture(command: DiagnosticsCaptureStopCommand): Promise<DiagnosticsResult> {
    if (this.state === "disposed") {
      return this.disposedResult(command.commandId);
    }

    const blocked = this.blockedResult(command.commandId, command.capabilityId);
    if (blocked) {
      return blocked;
    }

    return createDiagnosticsResult(command.commandId, "unavailable", {
      capabilityId: command.capabilityId,
      messages: [
        createDiagnosticsMessage(
          "diagnostics-unavailable",
          "Performance marker adapter does not provide frame capture.",
          "warning",
          false,
          { capabilityId: command.capabilityId }
        )
      ]
    });
  }

  async cleanupArtifacts(command: DiagnosticsCleanupArtifactsCommand): Promise<DiagnosticsResult> {
    if (this.state === "disposed") {
      return this.disposedResult(command.commandId);
    }

    this.performance?.clearMarks?.();
    this.performance?.clearMeasures?.();
    return createDiagnosticsResult(command.commandId, "complete", {
      messages: [createDiagnosticsMessage("artifacts-cleaned", "Performance marker artifacts were cleared.")]
    });
  }

  async dispose(command: DiagnosticsDisposeCommand): Promise<DiagnosticsResult> {
    this.performance?.clearMarks?.();
    this.performance?.clearMeasures?.();
    this.state = "disposed";
    return this.disposedResult(command.commandId);
  }

  private resolveInitialStatus(): DiagnosticsStatus {
    if (this.config.production) {
      return "production-disabled";
    }

    if (!this.config.diagnosticsEnabled) {
      return "unavailable";
    }

    return this.isPerformanceSupported() ? "ready" : "unavailable";
  }

  private isPerformanceSupported(): boolean {
    return Boolean(this.performance?.mark && this.performance.measure && this.performance.getEntriesByName);
  }

  private disposedResult(commandId: string): DiagnosticsResult {
    return createDiagnosticsResult(commandId, "disposed", {
      messages: [createDiagnosticsMessage("disposed-adapter", "Diagnostics adapter has been disposed.")]
    });
  }

  private blockedResult(commandId: string, capabilityId: string): DiagnosticsResult | undefined {
    const status = this.resolveInitialStatus();
    if (status === "production-disabled") {
      this.state = "production-disabled";
      return createDiagnosticsResult(commandId, "production-disabled", {
        capabilityId,
        messages: [productionDisabledMessage()]
      });
    }

    if (!this.config.diagnosticsEnabled) {
      this.state = "unavailable";
      return createDiagnosticsResult(commandId, "unavailable", {
        capabilityId,
        messages: [featureDisabledMessage()]
      });
    }

    return undefined;
  }
}
