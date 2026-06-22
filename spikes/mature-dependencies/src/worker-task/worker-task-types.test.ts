import { describe, expect, test } from "vitest";
import {
  createTaskDiagnostic,
  createTaskResult,
  workerTaskDiagnosticCodes,
  workerTaskLifecycleStates,
  workerTaskResultStatuses,
  type TaskRegistryEntry,
  type WorkerTaskAdapter,
  type WorkerTaskConfig
} from "./worker-task-types";

const config: WorkerTaskConfig = {
  adapterId: "worker-task-contract-test",
  lifecycle: "ready",
  queuePolicy: {
    maxQueued: 2,
    maxConcurrent: 1
  },
  defaultTimeoutMs: 250,
  transferPolicy: {
    allowTransfer: true,
    allowedKinds: ["array-buffer"],
    maxBytes: 1024
  },
  diagnosticsLevel: "verbose"
};

describe("WorkerTaskAdapter contract types", () => {
  test("defines Sinan-owned lifecycle, status, and diagnostic vocabularies", () => {
    expect(workerTaskLifecycleStates).toEqual(["unavailable", "booting", "ready", "busy", "degraded", "disposed"]);
    expect(workerTaskResultStatuses).toContain("timeout");
    expect(workerTaskResultStatuses).toContain("cancelled");
    expect(workerTaskResultStatuses).toContain("stale");
    expect(workerTaskResultStatuses).toContain("queue-overflow");
    expect(workerTaskResultStatuses).toContain("serialization-failed");
    expect(workerTaskDiagnosticCodes).toContain("unsupported-worker");
    expect(workerTaskDiagnosticCodes).toContain("worker-load-failed");
    expect(workerTaskDiagnosticCodes).toContain("fallback-used");
  });

  test("keeps task registry entries validator-owned and transport-free", () => {
    const entry: TaskRegistryEntry<{ value: number }, { doubled: number }> = {
      taskId: "contract.double-number",
      capabilityFlags: {
        supportsWorker: true,
        supportsMainThreadFallback: true,
        supportsTransfer: false,
        supportsCancellation: true,
        supportsProgress: false
      },
      inputValidator: (payload) => ({
        ok: typeof payload.value === "number",
        diagnostics: []
      }),
      outputValidator: (payload) => ({
        ok: typeof payload.doubled === "number",
        diagnostics: []
      }),
      transferPolicy: {
        allowTransfer: false,
        allowedKinds: []
      },
      fallbackPolicy: "allow-main-thread",
      defaultTimeoutMs: 250
    };

    expect(entry.inputValidator({ value: 2 }).ok).toBe(true);
    expect(entry.outputValidator({ doubled: 4 }).ok).toBe(true);
    expect(JSON.stringify(entry)).not.toMatch(/Comlink|Proxy|WorkerGlobalScope/i);
  });

  test("creates normalized task diagnostics and results", () => {
    const diagnostic = createTaskDiagnostic("timeout", "Task exceeded its deadline.", "error", true, {
      timeoutMs: 250
    });
    const result = createTaskResult("timeout", "contract.timeout", "correlation-1", {
      diagnostics: [diagnostic],
      durationMs: 251
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("timeout");
    expect(result.diagnostics[0]?.code).toBe("timeout");
    expect(result.durationMs).toBe(251);
  });

  test("exposes a Comlink-free adapter interface shape", async () => {
    const adapter: WorkerTaskAdapter = {
      config,
      lifecycle: "ready",
      boot: async () => createTaskResult("success", "adapter.boot", "boot"),
      dispose: async () => createTaskResult("disposed", "adapter.dispose", "dispose"),
      submit: async (request) => createTaskResult("success", request.taskId, request.correlationId),
      cancel: async (token) =>
        createTaskResult("cancelled", "adapter.cancel", token.id, {
          diagnostics: [createTaskDiagnostic("cancellation", token.reason ?? "Cancellation requested.", "info")]
        }),
      estimateLoad: async () =>
        createTaskResult("success", "adapter.load", "load", {
          output: {
            lifecycle: "ready",
            queued: 0,
            active: 0
          }
        })
    };

    const submitted = await adapter.submit({
      taskId: "contract.echo",
      correlationId: "correlation-2",
      input: {
        message: "hello"
      },
      submittedAt: 1
    });
    const load = await adapter.estimateLoad();

    expect(submitted.ok).toBe(true);
    expect(load.output?.lifecycle).toBe("ready");
    expect(JSON.stringify(adapter.config)).not.toMatch(/Comlink|WorkerGlobalScope|MessagePort/i);
  });
});
