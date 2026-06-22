import { createTaskRegistry, type TaskRegistry } from "./task-registry";
import {
  createTaskDiagnostic,
  createTaskResult,
  workerTaskDiagnosticCodes,
  type TaskCancellationToken,
  type TaskDiagnostic,
  type TaskJsonObject,
  type TaskRequest,
  type TaskResult,
  type WorkerTaskAdapter,
  type WorkerTaskConfig,
  type WorkerTaskLifecycleState
} from "./worker-task-types";

export interface FakeWorkerTaskAdapterOptions {
  config?: Partial<WorkerTaskConfig>;
  registry?: TaskRegistry;
  fallbackReason?: string;
  now?: () => number;
}

const defaultConfig: WorkerTaskConfig = {
  adapterId: "fake-worker-task-adapter",
  lifecycle: "ready",
  queuePolicy: {
    maxQueued: 2,
    maxConcurrent: 1
  },
  defaultTimeoutMs: 250,
  transferPolicy: {
    allowTransfer: true,
    allowedKinds: ["array-buffer"],
    maxBytes: 1024 * 1024
  },
  diagnosticsLevel: "standard"
};

function mergeConfig(config: Partial<WorkerTaskConfig> | undefined): WorkerTaskConfig {
  return {
    ...defaultConfig,
    ...config,
    queuePolicy: {
      ...defaultConfig.queuePolicy,
      ...config?.queuePolicy
    },
    transferPolicy: {
      ...defaultConfig.transferPolicy,
      ...config?.transferPolicy
    }
  };
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

export function createFakeWorkerTaskAdapter(options: FakeWorkerTaskAdapterOptions = {}): WorkerTaskAdapter {
  return new FakeWorkerTaskAdapter(options);
}

export class FakeWorkerTaskAdapter implements WorkerTaskAdapter {
  readonly config: WorkerTaskConfig;

  private readonly registry: TaskRegistry;
  private readonly fallbackReason: string;
  private readonly now: () => number;
  private readonly cancelledTokens = new Set<string>();
  private active = 0;
  private state: WorkerTaskLifecycleState;

  constructor(options: FakeWorkerTaskAdapterOptions = {}) {
    this.config = mergeConfig(options.config);
    this.registry = options.registry ?? createTaskRegistry();
    this.fallbackReason = options.fallbackReason ?? "Worker unavailable; executed by fake main-thread adapter.";
    this.now = options.now ?? Date.now;
    this.state = this.config.lifecycle;
  }

  get lifecycle(): WorkerTaskLifecycleState {
    return this.state;
  }

  async boot(): Promise<TaskResult> {
    if (this.state === "disposed") {
      return createTaskResult("disposed", "adapter.boot", "boot", {
        diagnostics: [createTaskDiagnostic("worker-load-failed", "Cannot boot a disposed fake worker task adapter.")]
      });
    }

    this.setLifecycle("ready");
    return createTaskResult("success", "adapter.boot", "boot", {
      diagnostics: [createTaskDiagnostic("fallback-used", this.fallbackReason, "info")]
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
        diagnostics: [createTaskDiagnostic("worker-load-failed", "Fake worker task adapter has been disposed.")]
      });
    }

    const lookup = this.registry.get(request.taskId);
    if (!lookup.ok || !lookup.entry) {
      return this.finish("failed", request, startedAt, {
        diagnostics: lookup.diagnostics
      });
    }

    const inputValidation = this.registry.validateInput(request);
    if (!inputValidation.ok) {
      return this.finish("invalid-input", request, startedAt, {
        diagnostics: inputValidation.diagnostics
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
      const output = await lookup.entry.handler(request);

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

      return this.finish("fallback", request, startedAt, {
        output: output as TOutput,
        diagnostics: [createTaskDiagnostic("fallback-used", this.fallbackReason, "info")]
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
