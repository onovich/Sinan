import * as Comlink from "comlink";
import type { WorkerTaskRemoteApi } from "./comlink-worker-task-host";
import {
  createTaskDiagnostic,
  createTaskResult,
  type TaskCancellationToken,
  type TaskJsonObject,
  type TaskRequest,
  type TaskResult,
  type WorkerTaskAdapter,
  type WorkerTaskConfig,
  type WorkerTaskLifecycleState
} from "./worker-task-types";

export type WorkerTaskWorkerFactory = () => Worker;

export interface ComlinkWorkerTaskAdapterOptions {
  config?: Partial<WorkerTaskConfig>;
  remote?: WorkerTaskRemoteApi;
  workerFactory?: WorkerTaskWorkerFactory;
}

const defaultAdapterConfig: WorkerTaskConfig = {
  adapterId: "comlink-worker-task-adapter",
  lifecycle: "unavailable",
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

function defaultWorkerFactory(): Worker {
  return new Worker(new URL("./comlink-worker-task.worker.ts", import.meta.url), { type: "module" });
}

function mergeConfig(config: Partial<WorkerTaskConfig> | undefined): WorkerTaskConfig {
  return {
    ...defaultAdapterConfig,
    ...config,
    queuePolicy: {
      ...defaultAdapterConfig.queuePolicy,
      ...config?.queuePolicy
    },
    transferPolicy: {
      ...defaultAdapterConfig.transferPolicy,
      ...config?.transferPolicy
    }
  };
}

function workerFactoryFromEnvironment(): WorkerTaskWorkerFactory | undefined {
  return typeof Worker === "undefined" ? undefined : defaultWorkerFactory;
}

function transportFailure(message: string): TaskResult {
  return createTaskResult("failed", "adapter.transport", "transport", {
    diagnostics: [createTaskDiagnostic("transport-crash", message, "error", true)]
  });
}

export function createComlinkWorkerTaskAdapter(options: ComlinkWorkerTaskAdapterOptions = {}): WorkerTaskAdapter {
  return new ComlinkWorkerTaskAdapter(options);
}

export class ComlinkWorkerTaskAdapter implements WorkerTaskAdapter {
  readonly config: WorkerTaskConfig;

  private readonly workerFactory: WorkerTaskWorkerFactory | undefined;
  private remote: WorkerTaskRemoteApi | undefined;
  private worker: Worker | undefined;
  private state: WorkerTaskLifecycleState;

  constructor(options: ComlinkWorkerTaskAdapterOptions = {}) {
    this.config = mergeConfig(options.config);
    this.remote = options.remote;
    this.workerFactory = options.workerFactory ?? (options.remote ? undefined : workerFactoryFromEnvironment());
    this.state = options.remote ? "booting" : this.config.lifecycle;
    this.config.lifecycle = this.state;
  }

  get lifecycle(): WorkerTaskLifecycleState {
    return this.state;
  }

  async boot(): Promise<TaskResult> {
    if (this.state === "disposed") {
      return createTaskResult("disposed", "adapter.boot", "boot", {
        diagnostics: [createTaskDiagnostic("worker-load-failed", "Cannot boot a disposed Comlink worker task adapter.")]
      });
    }

    const remoteResult = this.ensureRemote();
    if (!remoteResult.ok || !remoteResult.remote) {
      this.setLifecycle("unavailable");
      return createTaskResult("unavailable", "adapter.boot", "boot", {
        diagnostics: remoteResult.diagnostics
      });
    }

    try {
      const result = await remoteResult.remote.boot();
      this.setLifecycle(result.ok ? "ready" : "degraded");
      return result;
    } catch (error) {
      this.setLifecycle("degraded");
      return transportFailure(error instanceof Error ? error.message : "Comlink boot failed.");
    }
  }

  async dispose(): Promise<TaskResult> {
    const remote = this.remote;
    let result = createTaskResult("disposed", "adapter.dispose", "dispose");

    try {
      if (remote) {
        result = await remote.dispose();
      }
    } catch (error) {
      result = transportFailure(error instanceof Error ? error.message : "Comlink dispose failed.");
    } finally {
      this.releaseRemote();
      this.worker?.terminate();
      this.worker = undefined;
      this.remote = undefined;
      this.setLifecycle("disposed");
    }

    return result;
  }

  async submit<TInput extends TaskJsonObject = TaskJsonObject, TOutput extends TaskJsonObject = TaskJsonObject>(
    request: TaskRequest<TInput>
  ): Promise<TaskResult<TOutput>> {
    if (this.state === "disposed") {
      return createTaskResult("disposed", request.taskId, request.correlationId, {
        diagnostics: [createTaskDiagnostic("worker-load-failed", "Comlink worker task adapter has been disposed.")]
      });
    }

    const remote = await this.getBootedRemote();
    if (!remote) {
      return createTaskResult("unavailable", request.taskId, request.correlationId, {
        diagnostics: [createTaskDiagnostic("unsupported-worker", "Worker is not available for ComlinkWorkerTaskAdapter.")]
      });
    }

    try {
      const result = await remote.submit(request);
      this.setLifecycle(result.ok ? "ready" : "degraded");
      return result as TaskResult<TOutput>;
    } catch (error) {
      this.setLifecycle("degraded");
      return createTaskResult("failed", request.taskId, request.correlationId, {
        diagnostics: [createTaskDiagnostic("transport-crash", error instanceof Error ? error.message : "Comlink submit failed.", "error", true)]
      });
    }
  }

  async cancel(token: TaskCancellationToken): Promise<TaskResult> {
    const remote = await this.getBootedRemote();
    if (!remote) {
      return createTaskResult("unavailable", "adapter.cancel", token.id, {
        diagnostics: [createTaskDiagnostic("unsupported-worker", "Worker is not available for cancellation.")]
      });
    }

    return remote.cancel(token);
  }

  async estimateLoad(): Promise<TaskResult<{ lifecycle: WorkerTaskLifecycleState; queued: number; active: number }>> {
    const remote = this.remote;
    if (!remote) {
      return createTaskResult("success", "adapter.load", "load", {
        output: {
          lifecycle: this.state,
          queued: 0,
          active: 0
        }
      });
    }

    return remote.estimateLoad();
  }

  private async getBootedRemote(): Promise<WorkerTaskRemoteApi | undefined> {
    const remoteResult = this.ensureRemote();
    if (!remoteResult.ok || !remoteResult.remote) {
      this.setLifecycle("unavailable");
      return undefined;
    }

    if (this.state !== "ready") {
      const boot = await this.boot();
      if (!boot.ok) {
        return undefined;
      }
    }

    return remoteResult.remote;
  }

  private ensureRemote(): { ok: boolean; remote?: WorkerTaskRemoteApi; diagnostics: ReturnType<typeof createTaskDiagnostic>[] } {
    if (this.remote) {
      return {
        ok: true,
        remote: this.remote,
        diagnostics: []
      };
    }

    if (!this.workerFactory) {
      return {
        ok: false,
        diagnostics: [createTaskDiagnostic("unsupported-worker", "Worker is not available for ComlinkWorkerTaskAdapter.")]
      };
    }

    try {
      this.worker = this.workerFactory();
      this.remote = Comlink.wrap<WorkerTaskRemoteApi>(this.worker);
      this.setLifecycle("booting");
      return {
        ok: true,
        remote: this.remote,
        diagnostics: []
      };
    } catch (error) {
      return {
        ok: false,
        diagnostics: [
          createTaskDiagnostic("worker-load-failed", error instanceof Error ? error.message : "Failed to create WorkerTask worker.", "error", true)
        ]
      };
    }
  }

  private releaseRemote(): void {
    const remote = this.remote as unknown as { [Comlink.releaseProxy]?: () => void } | undefined;
    remote?.[Comlink.releaseProxy]?.();
  }

  private setLifecycle(state: WorkerTaskLifecycleState): void {
    this.state = state;
    this.config.lifecycle = state;
  }
}
