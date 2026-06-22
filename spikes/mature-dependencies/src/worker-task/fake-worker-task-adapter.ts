import { createTaskRegistry, type TaskRegistry } from "./task-registry";
import {
  createTaskDiagnostic,
  type TaskRequest,
  type TaskSnapshotRef,
  type WorkerTaskAdapter,
  type WorkerTaskConfig
} from "./worker-task-types";
import { RegistryTaskExecutor } from "./registry-task-executor";

export interface FakeWorkerTaskAdapterOptions {
  config?: Partial<WorkerTaskConfig>;
  registry?: TaskRegistry;
  fallbackReason?: string;
  isStaleSnapshot?: (snapshot: TaskSnapshotRef, request: TaskRequest) => boolean;
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

export function createFakeWorkerTaskAdapter(options: FakeWorkerTaskAdapterOptions = {}): WorkerTaskAdapter {
  return new FakeWorkerTaskAdapter(options);
}

export class FakeWorkerTaskAdapter extends RegistryTaskExecutor {
  constructor(options: FakeWorkerTaskAdapterOptions = {}) {
    const config = mergeConfig(options.config);
    const fallbackReason = options.fallbackReason ?? "Worker unavailable; executed by fake main-thread adapter.";

    super({
      config,
      registry: options.registry ?? createTaskRegistry(),
      successStatus: "fallback",
      bootDiagnostics: () => [createTaskDiagnostic("fallback-used", fallbackReason, "info")],
      successDiagnostics: () => [createTaskDiagnostic("fallback-used", fallbackReason, "info")],
      isStaleSnapshot: options.isStaleSnapshot,
      disposedMessage: "Fake worker task adapter has been disposed.",
      now: options.now
    });
  }
}
