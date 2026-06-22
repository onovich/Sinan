import { createTaskRegistry, type TaskRegistry } from "./task-registry";
import { RegistryTaskExecutor } from "./registry-task-executor";
import type {
  TaskCancellationToken,
  TaskRequest,
  TaskResult,
  WorkerTaskConfig,
  WorkerTaskLifecycleState
} from "./worker-task-types";

export interface WorkerTaskRemoteApi {
  boot(): Promise<TaskResult>;
  dispose(): Promise<TaskResult>;
  submit(request: TaskRequest): Promise<TaskResult>;
  cancel(token: TaskCancellationToken): Promise<TaskResult>;
  estimateLoad(): Promise<TaskResult<{ lifecycle: WorkerTaskLifecycleState; queued: number; active: number }>>;
}

export interface WorkerTaskHostOptions {
  config?: Partial<WorkerTaskConfig>;
  registry?: TaskRegistry;
  now?: () => number;
}

const defaultHostConfig: WorkerTaskConfig = {
  adapterId: "comlink-worker-task-host",
  lifecycle: "booting",
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
    ...defaultHostConfig,
    ...config,
    queuePolicy: {
      ...defaultHostConfig.queuePolicy,
      ...config?.queuePolicy
    },
    transferPolicy: {
      ...defaultHostConfig.transferPolicy,
      ...config?.transferPolicy
    }
  };
}

export function createWorkerTaskHost(options: WorkerTaskHostOptions = {}): WorkerTaskRemoteApi {
  const executor = new RegistryTaskExecutor({
    config: mergeConfig(options.config),
    registry: options.registry ?? createTaskRegistry(),
    successStatus: "success",
    disposedMessage: "Comlink worker task host has been disposed.",
    now: options.now
  });

  return {
    boot: () => executor.boot(),
    dispose: () => executor.dispose(),
    submit: (request) => executor.submit(request),
    cancel: (token) => executor.cancel(token),
    estimateLoad: () => executor.estimateLoad()
  };
}
