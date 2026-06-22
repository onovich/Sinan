import { createTaskRegistry, type TaskRegistry } from "./task-registry";
import {
  createTaskDiagnostic,
  createTaskResult,
  workerTaskDiagnosticCodes,
  type TaskCancellationToken,
  type TaskDiagnostic,
  type TaskJsonObject,
  type TaskJsonValue,
  type TaskRequest,
  type TaskResult,
  type TaskSnapshotRef,
  type TaskTransferPolicy,
  type TaskTransferableDescriptor,
  type WorkerTaskAdapter,
  type WorkerTaskConfig,
  type WorkerTaskLifecycleState,
  type WorkerTaskResultStatus
} from "./worker-task-types";

export type StaleSnapshotPredicate = (snapshot: TaskSnapshotRef, request: TaskRequest) => boolean;

export interface RegistryTaskExecutorOptions {
  config: WorkerTaskConfig;
  registry?: TaskRegistry;
  successStatus?: Extract<WorkerTaskResultStatus, "success" | "fallback">;
  bootDiagnostics?: () => TaskDiagnostic[];
  successDiagnostics?: (request: TaskRequest) => TaskDiagnostic[];
  isStaleSnapshot?: StaleSnapshotPredicate;
  disposedMessage?: string;
  now?: () => number;
}

function isTaskDiagnostic(error: unknown): error is TaskDiagnostic {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    workerTaskDiagnosticCodes.includes(error.code as TaskDiagnostic["code"]) &&
    "message" in error &&
    typeof error.message === "string"
  );
}

export class RegistryTaskExecutor implements WorkerTaskAdapter {
  readonly config: WorkerTaskConfig;

  private readonly registry: TaskRegistry;
  private readonly successStatus: Extract<WorkerTaskResultStatus, "success" | "fallback">;
  private readonly bootDiagnostics: () => TaskDiagnostic[];
  private readonly successDiagnostics: (request: TaskRequest) => TaskDiagnostic[];
  private readonly isStaleSnapshot: StaleSnapshotPredicate;
  private readonly disposedMessage: string;
  private readonly now: () => number;
  private readonly cancelledTokens = new Set<string>();
  private active = 0;
  private queued = 0;
  private state: WorkerTaskLifecycleState;

  constructor(options: RegistryTaskExecutorOptions) {
    this.config = options.config;
    this.registry = options.registry ?? createTaskRegistry();
    this.successStatus = options.successStatus ?? "success";
    this.bootDiagnostics = options.bootDiagnostics ?? (() => []);
    this.successDiagnostics = options.successDiagnostics ?? (() => []);
    this.isStaleSnapshot = options.isStaleSnapshot ?? (() => false);
    this.disposedMessage = options.disposedMessage ?? "Worker task executor has been disposed.";
    this.now = options.now ?? Date.now;
    this.state = this.config.lifecycle;
  }

  get lifecycle(): WorkerTaskLifecycleState {
    return this.state;
  }

  async boot(): Promise<TaskResult> {
    if (this.state === "disposed") {
      return createTaskResult("disposed", "adapter.boot", "boot", {
        diagnostics: [createTaskDiagnostic("worker-load-failed", "Cannot boot a disposed worker task executor.")]
      });
    }

    this.setLifecycle("ready");
    return createTaskResult("success", "adapter.boot", "boot", {
      diagnostics: this.bootDiagnostics()
    });
  }

  async dispose(): Promise<TaskResult> {
    this.cancelledTokens.clear();
    this.active = 0;
    this.setLifecycle("disposed");
    return createTaskResult("disposed", "adapter.dispose", "dispose");
  }

  async submit<TInput extends TaskJsonObject = TaskJsonObject, TOutput extends TaskJsonObject = TaskJsonObject>(
    request: TaskRequest<TInput>
  ): Promise<TaskResult<TOutput>> {
    const startedAt = this.now();

    if (this.state === "disposed") {
      return this.finish("disposed", request, startedAt, {
        diagnostics: [createTaskDiagnostic("worker-load-failed", this.disposedMessage)]
      });
    }

    if (this.isQueueOverflow()) {
      return this.finish("queue-overflow", request, startedAt, {
        diagnostics: [this.queueOverflowDiagnostic()]
      });
    }

    const lookup = this.registry.get(request.taskId);
    if (!lookup.ok || !lookup.entry) {
      return this.finish("failed", request, startedAt, {
        diagnostics: lookup.diagnostics
      });
    }

    const transferDiagnostics = this.validateTransferDescriptors(request.transferables ?? [], lookup.entry.transferPolicy);
    if (transferDiagnostics.length > 0) {
      return this.finish("serialization-failed", request, startedAt, {
        diagnostics: transferDiagnostics
      });
    }

    const inputSerializationDiagnostics = this.validateSerializableValue(request.input, "input");
    if (inputSerializationDiagnostics.length > 0) {
      return this.finish("serialization-failed", request, startedAt, {
        diagnostics: inputSerializationDiagnostics
      });
    }

    const inputValidation = this.registry.validateInput(request);
    if (!inputValidation.ok) {
      return this.finish("invalid-input", request, startedAt, {
        diagnostics: inputValidation.diagnostics
      });
    }

    if (request.snapshot && this.isStaleSnapshot(request.snapshot, request)) {
      return this.finish("stale", request, startedAt, {
        diagnostics: [this.staleSnapshotDiagnostic(request.snapshot)]
      });
    }

    if (this.isCancelled(request.cancellationToken)) {
      return this.finish("cancelled", request, startedAt, {
        diagnostics: [this.cancellationDiagnostic(request.cancellationToken)]
      });
    }

    this.active += 1;
    this.setLifecycle("busy");

    try {
      const execution = await this.runWithTimeout(lookup.entry.handler(request), this.effectiveTimeoutMs(request, lookup.entry.defaultTimeoutMs));

      if (execution.kind === "timeout") {
        return this.finish("timeout", request, startedAt, {
          diagnostics: [this.timeoutDiagnostic(this.effectiveTimeoutMs(request, lookup.entry.defaultTimeoutMs), request.taskId)]
        });
      }

      if (execution.kind === "error") {
        throw execution.error;
      }

      const output = execution.output;
      const outputSerializationDiagnostics = this.validateSerializableValue(output, "output");
      if (outputSerializationDiagnostics.length > 0) {
        return this.finish("serialization-failed", request, startedAt, {
          diagnostics: outputSerializationDiagnostics
        });
      }

      if (this.isCancelled(request.cancellationToken)) {
        return this.finish("cancelled", request, startedAt, {
          diagnostics: [this.cancellationDiagnostic(request.cancellationToken)]
        });
      }

      const outputValidation = this.registry.validateOutput(request.taskId, output);
      if (!outputValidation.ok) {
        return this.finish("invalid-output", request, startedAt, {
          diagnostics: outputValidation.diagnostics
        });
      }

      return this.finish(this.successStatus, request, startedAt, {
        output: output as TOutput,
        diagnostics: this.successDiagnostics(request)
      });
    } catch (error) {
      const diagnostic = isTaskDiagnostic(error)
        ? error
        : createTaskDiagnostic("transport-crash", error instanceof Error ? error.message : "Task handler failed.");

      return this.finish("failed", request, startedAt, {
        diagnostics: [diagnostic]
      });
    } finally {
      this.active = Math.max(0, this.active - 1);
      if (!this.isDisposed()) {
        this.setLifecycle("ready");
      }
    }
  }

  async cancel(token: TaskCancellationToken): Promise<TaskResult> {
    this.cancelledTokens.add(token.id);
    return createTaskResult("cancelled", "adapter.cancel", token.id, {
      diagnostics: [this.cancellationDiagnostic(token)]
    });
  }

  async estimateLoad(): Promise<TaskResult<{ lifecycle: WorkerTaskLifecycleState; queued: number; active: number }>> {
    return createTaskResult("success", "adapter.load", "load", {
      output: {
        lifecycle: this.state,
        queued: 0,
        active: this.active
      }
    });
  }

  private isQueueOverflow(): boolean {
    const { maxConcurrent, maxQueued } = this.config.queuePolicy;
    return this.active >= maxConcurrent && this.queued >= maxQueued;
  }

  private queueOverflowDiagnostic(): TaskDiagnostic {
    return createTaskDiagnostic("queue-overflow", "Worker task queue capacity has been exceeded.", "error", true, {
      active: this.active,
      queued: this.queued,
      maxConcurrent: this.config.queuePolicy.maxConcurrent,
      maxQueued: this.config.queuePolicy.maxQueued
    });
  }

  private staleSnapshotDiagnostic(snapshot: TaskSnapshotRef): TaskDiagnostic {
    return createTaskDiagnostic("stale-snapshot", "Task snapshot is stale and must be refreshed before execution.", "warning", true, {
      snapshotSource: snapshot.source,
      snapshotId: snapshot.id,
      snapshotVersion: snapshot.version
    });
  }

  private timeoutDiagnostic(timeoutMs: number, taskId: string): TaskDiagnostic {
    return createTaskDiagnostic("timeout", "Worker task exceeded its timeout.", "error", true, {
      taskId,
      timeoutMs
    });
  }

  private validateTransferDescriptors(descriptors: TaskTransferableDescriptor[], taskPolicy: TaskTransferPolicy): TaskDiagnostic[] {
    return descriptors.flatMap((descriptor) => {
      const diagnostics: TaskDiagnostic[] = [];
      const effectiveMaxBytes = Math.min(
        this.config.transferPolicy.maxBytes ?? Number.POSITIVE_INFINITY,
        taskPolicy.maxBytes ?? Number.POSITIVE_INFINITY
      );

      if (!this.config.transferPolicy.allowTransfer || !taskPolicy.allowTransfer) {
        diagnostics.push(this.serializationDiagnostic("Transferables are not allowed for this adapter or task.", descriptor));
      }

      if (!this.config.transferPolicy.allowedKinds.includes(descriptor.kind) || !taskPolicy.allowedKinds.includes(descriptor.kind)) {
        diagnostics.push(this.serializationDiagnostic(`Transferable kind ${descriptor.kind} is not allowed.`, descriptor));
      }

      if (!Number.isFinite(descriptor.byteLength) || descriptor.byteLength < 0 || descriptor.byteLength > effectiveMaxBytes) {
        diagnostics.push(this.serializationDiagnostic("Transferable byteLength exceeds the effective policy.", descriptor));
      }

      return diagnostics;
    });
  }

  private validateSerializableValue(value: unknown, path: string): TaskDiagnostic[] {
    return this.isSerializableJson(value)
      ? []
      : [
          this.serializationDiagnostic(`Task ${path} is not JSON-serializable.`, {
            id: path,
            kind: "array-buffer",
            byteLength: 0,
            ownership: "copy"
          })
        ];
  }

  private isSerializableJson(value: unknown): value is TaskJsonValue {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
      return true;
    }

    if (typeof value === "number") {
      return Number.isFinite(value);
    }

    if (Array.isArray(value)) {
      return value.every((entry) => this.isSerializableJson(entry));
    }

    if (typeof value === "object" && value !== null) {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        return false;
      }

      return Object.values(value as Record<string, unknown>).every((entry) => this.isSerializableJson(entry));
    }

    return false;
  }

  private serializationDiagnostic(message: string, descriptor: TaskTransferableDescriptor): TaskDiagnostic {
    return createTaskDiagnostic("serialization-failure", message, "error", false, {
      transferId: descriptor.id,
      kind: descriptor.kind,
      byteLength: descriptor.byteLength,
      ownership: descriptor.ownership
    });
  }

  private setLifecycle(state: WorkerTaskLifecycleState): void {
    this.state = state;
    this.config.lifecycle = state;
  }

  private isDisposed(): boolean {
    return this.state === "disposed";
  }

  private isCancelled(token: TaskCancellationToken | undefined): boolean {
    return Boolean(token?.requested || (token && this.cancelledTokens.has(token.id)));
  }

  private cancellationDiagnostic(token: TaskCancellationToken | undefined): TaskDiagnostic {
    return createTaskDiagnostic("cancellation", token?.reason ?? "Cancellation requested.", "info", false, {
      tokenId: token?.id ?? "unknown"
    });
  }

  private effectiveTimeoutMs(request: TaskRequest, taskDefaultTimeoutMs: number): number {
    return request.timeoutMs ?? taskDefaultTimeoutMs ?? this.config.defaultTimeoutMs;
  }

  private async runWithTimeout<TOutput extends TaskJsonObject>(
    operation: Promise<TOutput> | TOutput,
    timeoutMs: number
  ): Promise<{ kind: "timeout" } | { kind: "output"; output: TOutput } | { kind: "error"; error: unknown }> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const operationPromise = Promise.resolve(operation);
    const timeoutPromise = new Promise<"timeout">((resolve) => {
      timeoutId = setTimeout(() => resolve("timeout"), Math.max(0, timeoutMs));
    });

    try {
      const result = await Promise.race([
        operationPromise.then((output) => ({ kind: "output" as const, output })),
        timeoutPromise.then(() => ({ kind: "timeout" as const }))
      ]);

      if (result.kind === "timeout") {
        operationPromise.catch(() => undefined);
        return {
          kind: "timeout"
        };
      }

      return {
        kind: "output",
        output: result.output
      };
    } catch (error) {
      return {
        kind: "error",
        error
      };
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  private finish<TOutput extends TaskJsonObject>(
    status: TaskResult<TOutput>["status"],
    request: Pick<TaskRequest, "taskId" | "correlationId" | "snapshot">,
    startedAt: number,
    options: {
      output?: TOutput;
      diagnostics?: TaskDiagnostic[];
    } = {}
  ): TaskResult<TOutput> {
    return createTaskResult(status, request.taskId, request.correlationId, {
      ...options,
      snapshot: request.snapshot,
      durationMs: Math.max(0, this.now() - startedAt)
    });
  }
}
