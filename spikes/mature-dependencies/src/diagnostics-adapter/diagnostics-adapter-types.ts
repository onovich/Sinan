export type DiagnosticsJsonPrimitive = string | number | boolean | null;
export type DiagnosticsJsonValue =
  | DiagnosticsJsonPrimitive
  | DiagnosticsJsonValue[]
  | { [key: string]: DiagnosticsJsonValue };
export type DiagnosticsJsonObject = { [key: string]: DiagnosticsJsonValue };

export const diagnosticsLifecycleStates = [
  "production-disabled",
  "unavailable",
  "loading",
  "ready",
  "capturing",
  "complete",
  "failed",
  "disposed"
] as const;

export type DiagnosticsLifecycleState = (typeof diagnosticsLifecycleStates)[number];
export type DiagnosticsStatus = DiagnosticsLifecycleState;

export const diagnosticsCommandTypes = [
  "query-availability",
  "mark-performance",
  "start-capture",
  "stop-capture",
  "cleanup-artifacts",
  "dispose"
] as const;

export type DiagnosticsCommandType = (typeof diagnosticsCommandTypes)[number];

export const diagnosticsMessageCodes = [
  "diagnostics-ready",
  "diagnostics-unavailable",
  "production-disabled",
  "feature-disabled",
  "performance-marker-recorded",
  "performance-marker-invalid",
  "capture-started",
  "capture-complete",
  "capture-failed",
  "artifacts-cleaned",
  "disposed-adapter"
] as const;

export type DiagnosticsMessageCode = (typeof diagnosticsMessageCodes)[number];
export type DiagnosticsMessageSeverity = "info" | "warning" | "error";
export type DiagnosticsRetentionClass = "none" | "local-temporary" | "manual-delete";

export interface DiagnosticsMessage {
  code: DiagnosticsMessageCode;
  severity: DiagnosticsMessageSeverity;
  text: string;
  retryable: boolean;
  detail?: DiagnosticsJsonObject;
}

export interface DiagnosticsCapability {
  capabilityId: string;
  label: string;
  devOnly: boolean;
  enabledByDefault: boolean;
  retentionClass: DiagnosticsRetentionClass;
}

export interface DiagnosticsArtifactPolicy {
  retentionClass: DiagnosticsRetentionClass;
  localOnly: boolean;
  maxArtifactBytes: number;
  cleanupAfterSmoke: boolean;
  allowedExtensions: string[];
}

export interface DiagnosticsConfig {
  adapterId: string;
  devMode: boolean;
  production: boolean;
  diagnosticsEnabled: boolean;
  captureEnabled: boolean;
  capabilityIds: string[];
  artifactPolicy: DiagnosticsArtifactPolicy;
}

export interface DiagnosticsCommandBase {
  commandId: string;
  type: DiagnosticsCommandType;
  requestedAt: string;
  metadata?: DiagnosticsJsonObject;
}

export interface DiagnosticsAvailabilityCommand extends DiagnosticsCommandBase {
  type: "query-availability";
}

export interface DiagnosticsPerformanceMarkerCommand extends DiagnosticsCommandBase {
  type: "mark-performance";
  markerName: string;
  label?: string;
}

export interface DiagnosticsCaptureStartCommand extends DiagnosticsCommandBase {
  type: "start-capture";
  capabilityId: string;
  frameBudgetMs?: number;
}

export interface DiagnosticsCaptureStopCommand extends DiagnosticsCommandBase {
  type: "stop-capture";
  capabilityId: string;
}

export interface DiagnosticsCleanupArtifactsCommand extends DiagnosticsCommandBase {
  type: "cleanup-artifacts";
  retentionClass?: DiagnosticsRetentionClass;
}

export interface DiagnosticsDisposeCommand extends DiagnosticsCommandBase {
  type: "dispose";
}

export type DiagnosticsCommand =
  | DiagnosticsAvailabilityCommand
  | DiagnosticsPerformanceMarkerCommand
  | DiagnosticsCaptureStartCommand
  | DiagnosticsCaptureStopCommand
  | DiagnosticsCleanupArtifactsCommand
  | DiagnosticsDisposeCommand;

export interface DiagnosticsMetric {
  metricId: string;
  label: string;
  value: number;
  unit: "ms" | "count" | "bytes";
}

export interface DiagnosticsArtifact {
  artifactId: string;
  capabilityId: string;
  createdAt: string;
  localPath?: string;
  bytes: number;
  retentionClass: DiagnosticsRetentionClass;
  localOnly: boolean;
  committed: false;
  metadata?: DiagnosticsJsonObject;
}

export interface DiagnosticsResult {
  commandId: string;
  status: DiagnosticsStatus;
  ok: boolean;
  capabilityId?: string;
  messages: DiagnosticsMessage[];
  metrics: DiagnosticsMetric[];
  artifacts: DiagnosticsArtifact[];
}

export interface DiagnosticsAdapter {
  readonly config: DiagnosticsConfig;
  readonly status: DiagnosticsStatus;

  queryAvailability(command: DiagnosticsAvailabilityCommand): Promise<DiagnosticsResult>;
  markPerformance(command: DiagnosticsPerformanceMarkerCommand): Promise<DiagnosticsResult>;
  startCapture(command: DiagnosticsCaptureStartCommand): Promise<DiagnosticsResult>;
  stopCapture(command: DiagnosticsCaptureStopCommand): Promise<DiagnosticsResult>;
  cleanupArtifacts(command: DiagnosticsCleanupArtifactsCommand): Promise<DiagnosticsResult>;
  dispose(command: DiagnosticsDisposeCommand): Promise<DiagnosticsResult>;
}

export function createDiagnosticsMessage(
  code: DiagnosticsMessageCode,
  text: string,
  severity: DiagnosticsMessageSeverity = "info",
  retryable = false,
  detail?: DiagnosticsJsonObject
): DiagnosticsMessage {
  return {
    code,
    severity,
    text,
    retryable,
    ...(detail ? { detail } : {})
  };
}

export function createDiagnosticsResult(
  commandId: string,
  status: DiagnosticsStatus,
  options: {
    capabilityId?: string;
    messages?: DiagnosticsMessage[];
    metrics?: DiagnosticsMetric[];
    artifacts?: DiagnosticsArtifact[];
  } = {}
): DiagnosticsResult {
  return {
    commandId,
    status,
    ok: status === "ready" || status === "capturing" || status === "complete",
    capabilityId: options.capabilityId,
    messages: options.messages ?? [],
    metrics: options.metrics ?? [],
    artifacts: options.artifacts ?? []
  };
}
