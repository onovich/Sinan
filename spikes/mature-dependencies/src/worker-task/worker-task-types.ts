export type TaskJsonPrimitive = string | number | boolean | null;
export type TaskJsonValue = TaskJsonPrimitive | TaskJsonValue[] | { [key: string]: TaskJsonValue };
export type TaskJsonObject = { [key: string]: TaskJsonValue };

export const workerTaskLifecycleStates = ["unavailable", "booting", "ready", "busy", "degraded", "disposed"] as const;

export type WorkerTaskLifecycleState = (typeof workerTaskLifecycleStates)[number];

export const workerTaskResultStatuses = [
  "success",
  "failed",
  "invalid-input",
  "invalid-output",
  "timeout",
  "cancelled",
  "stale",
  "queue-overflow",
  "serialization-failed",
  "unavailable",
  "disposed",
  "fallback"
] as const;

export type WorkerTaskResultStatus = (typeof workerTaskResultStatuses)[number];

export const workerTaskDiagnosticCodes = [
  "unsupported-worker",
  "worker-load-failed",
  "unknown-task",
  "validation-failure",
  "serialization-failure",
  "timeout",
  "cancellation",
  "stale-snapshot",
  "queue-overflow",
  "transport-crash",
  "fallback-used"
] as const;

export type WorkerTaskDiagnosticCode = (typeof workerTaskDiagnosticCodes)[number];

export type WorkerTaskDiagnosticSeverity = "info" | "warning" | "error";

export interface TaskDiagnostic {
  code: WorkerTaskDiagnosticCode;
  severity: WorkerTaskDiagnosticSeverity;
  message: string;
  retryable: boolean;
  detail?: TaskJsonObject;
}

export interface TaskValidationResult {
  ok: boolean;
  diagnostics: TaskDiagnostic[];
}

export type TaskValidator<TPayload extends TaskJsonValue = TaskJsonValue> = (payload: TPayload) => TaskValidationResult;

export interface TaskTransferableDescriptor {
  id: string;
  kind: "array-buffer";
  byteLength: number;
  ownership: "copy" | "transfer";
}

export interface TaskTransferPolicy {
  allowTransfer: boolean;
  allowedKinds: TaskTransferableDescriptor["kind"][];
  maxBytes?: number;
}

export interface TaskQueuePolicy {
  maxQueued: number;
  maxConcurrent: number;
}

export interface TaskSnapshotRef {
  source: "data-json" | "editor-session" | "runtime-snapshot" | "smoke-fixture";
  id: string;
  version: number;
  checksum?: string;
}

export interface TaskCancellationToken {
  id: string;
  requested: boolean;
  reason?: string;
}

export interface TaskRequest<TInput extends TaskJsonObject = TaskJsonObject> {
  taskId: string;
  correlationId: string;
  input: TInput;
  snapshot?: TaskSnapshotRef;
  timeoutMs?: number;
  cancellationToken?: TaskCancellationToken;
  transferables?: TaskTransferableDescriptor[];
  submittedAt: number;
}

export interface TaskProgressEvent {
  taskId: string;
  correlationId: string;
  phase: "queued" | "running" | "transferring" | "completed" | "failed";
  percent?: number;
  diagnostics: TaskDiagnostic[];
}

export interface TaskResult<TOutput extends TaskJsonObject = TaskJsonObject> {
  taskId: string;
  correlationId: string;
  status: WorkerTaskResultStatus;
  ok: boolean;
  output?: TOutput;
  diagnostics: TaskDiagnostic[];
  snapshot?: TaskSnapshotRef;
  stale: boolean;
  fallback: boolean;
  durationMs: number;
}

export interface TaskCapabilityFlags {
  supportsWorker: boolean;
  supportsMainThreadFallback: boolean;
  supportsTransfer: boolean;
  supportsCancellation: boolean;
  supportsProgress: boolean;
}

export interface TaskRegistryEntry<TInput extends TaskJsonObject = TaskJsonObject, TOutput extends TaskJsonObject = TaskJsonObject> {
  taskId: string;
  capabilityFlags: TaskCapabilityFlags;
  inputValidator: TaskValidator<TInput>;
  outputValidator: TaskValidator<TOutput>;
  transferPolicy: TaskTransferPolicy;
  fallbackPolicy: "allow-main-thread" | "worker-only" | "disabled";
  defaultTimeoutMs: number;
}

export interface WorkerTaskConfig {
  adapterId: string;
  lifecycle: WorkerTaskLifecycleState;
  queuePolicy: TaskQueuePolicy;
  defaultTimeoutMs: number;
  transferPolicy: TaskTransferPolicy;
  diagnosticsLevel: "minimal" | "standard" | "verbose";
}

export interface WorkerTaskAdapter {
  readonly config: WorkerTaskConfig;
  readonly lifecycle: WorkerTaskLifecycleState;

  boot(): Promise<TaskResult>;
  dispose(): Promise<TaskResult>;
  submit<TInput extends TaskJsonObject = TaskJsonObject, TOutput extends TaskJsonObject = TaskJsonObject>(
    request: TaskRequest<TInput>
  ): Promise<TaskResult<TOutput>>;
  cancel(token: TaskCancellationToken): Promise<TaskResult>;
  estimateLoad(): Promise<TaskResult<{ lifecycle: WorkerTaskLifecycleState; queued: number; active: number }>>;
}

export function createTaskDiagnostic(
  code: WorkerTaskDiagnosticCode,
  message: string,
  severity: WorkerTaskDiagnosticSeverity = "error",
  retryable = false,
  detail?: TaskJsonObject
): TaskDiagnostic {
  return {
    code,
    severity,
    message,
    retryable,
    ...(detail ? { detail } : {})
  };
}

export function createTaskResult<TOutput extends TaskJsonObject = TaskJsonObject>(
  status: WorkerTaskResultStatus,
  taskId: string,
  correlationId: string,
  options: {
    output?: TOutput;
    diagnostics?: TaskDiagnostic[];
    snapshot?: TaskSnapshotRef;
    fallback?: boolean;
    durationMs?: number;
  } = {}
): TaskResult<TOutput> {
  return {
    taskId,
    correlationId,
    status,
    ok: status === "success" || status === "fallback",
    output: options.output,
    diagnostics: options.diagnostics ?? [],
    snapshot: options.snapshot,
    stale: status === "stale",
    fallback: options.fallback ?? status === "fallback",
    durationMs: options.durationMs ?? 0
  };
}
