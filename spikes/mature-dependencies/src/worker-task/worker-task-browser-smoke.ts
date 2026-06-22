import { createComlinkWorkerTaskAdapter } from "./comlink-worker-task-adapter";
import type { TaskJsonObject, TaskRequest, TaskResult } from "./worker-task-types";

export interface WorkerTaskAdapterBrowserSmokeResult {
  adapter: "ComlinkWorkerTaskAdapter";
  workerSupported: boolean;
  bootOk: boolean;
  loadReady: boolean;
  echoOk: boolean;
  sumOk: boolean;
  transferPolicyOk: boolean;
  invalidInputOk: boolean;
  timeoutOk: boolean;
  cancellationOk: boolean;
  disposeOk: boolean;
  statuses: Record<string, string>;
  diagnostics: string[];
}

function request(taskId: string, input: TaskJsonObject): TaskRequest {
  return {
    taskId,
    correlationId: `${taskId}-${Date.now()}`,
    input,
    submittedAt: Date.now()
  };
}

function status(result: TaskResult | undefined): string {
  return result?.status ?? "missing";
}

function createEmptyResult(): WorkerTaskAdapterBrowserSmokeResult {
  return {
    adapter: "ComlinkWorkerTaskAdapter",
    workerSupported: typeof Worker !== "undefined",
    bootOk: false,
    loadReady: false,
    echoOk: false,
    sumOk: false,
    transferPolicyOk: false,
    invalidInputOk: false,
    timeoutOk: false,
    cancellationOk: false,
    disposeOk: false,
    statuses: {},
    diagnostics: []
  };
}

export async function runWorkerTaskAdapterBrowserSmoke(): Promise<WorkerTaskAdapterBrowserSmokeResult> {
  const result = createEmptyResult();
  if (!result.workerSupported) {
    result.diagnostics.push("Worker is not available in this environment.");
    return result;
  }

  const adapter = createComlinkWorkerTaskAdapter();
  let disposed = false;

  try {
    const boot = await adapter.boot();
    const load = await adapter.estimateLoad();
    const echo = await adapter.submit(request("echo-json", { value: "worker-task-browser" }));
    const sum = await adapter.submit({
      ...request("sum-float32", { values: [1, 2, 4] }),
      transferables: [
        {
          id: "browser-values-buffer",
          kind: "array-buffer",
          byteLength: 12,
          ownership: "transfer"
        }
      ]
    });
    const invalidInput = await adapter.submit(request("sum-float32", { values: ["not-a-number"] }));
    const timeout = await adapter.submit({
      ...request("delayed-success", { delayMs: 20, label: "slow-browser-task" }),
      timeoutMs: 1
    });
    const token = {
      id: `browser-cancel-${Date.now()}`,
      requested: false,
      reason: "browser smoke cancellation"
    };
    const pendingCancellation = adapter.submit({
      ...request("delayed-success", { delayMs: 20, label: "cancel-browser-task" }),
      cancellationToken: token
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const cancel = await adapter.cancel(token);
    const cancelled = await pendingCancellation;
    const dispose = await adapter.dispose();
    disposed = true;

    result.statuses = {
      boot: status(boot),
      load: status(load),
      echo: status(echo),
      sum: status(sum),
      invalidInput: status(invalidInput),
      timeout: status(timeout),
      cancel: status(cancel),
      cancelled: status(cancelled),
      dispose: status(dispose)
    };
    result.bootOk = boot.ok;
    result.loadReady = load.output?.lifecycle === "ready";
    result.echoOk = echo.status === "success" && echo.output?.echo === "worker-task-browser" && !echo.fallback;
    result.sumOk = sum.status === "success" && sum.output?.sum === 7 && sum.output?.count === 3 && !sum.fallback;
    result.transferPolicyOk = sum.status === "success";
    result.invalidInputOk = invalidInput.status === "invalid-input";
    result.timeoutOk = timeout.status === "timeout";
    result.cancellationOk = cancel.status === "cancelled" && cancelled.status === "cancelled";
    result.disposeOk = dispose.status === "disposed" && adapter.lifecycle === "disposed";
    result.diagnostics.push(
      ...Object.entries(result.statuses).map(([key, value]) => `${key}: ${value}`),
      `adapter boundary: Sinan WorkerTaskAdapter contract -> Comlink RPC -> Web Worker`
    );
  } catch (error) {
    result.diagnostics.push(error instanceof Error ? error.message : String(error));
  } finally {
    if (!disposed) {
      try {
        const dispose = await adapter.dispose();
        result.disposeOk = dispose.status === "disposed";
      } catch (error) {
        result.diagnostics.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  return result;
}
