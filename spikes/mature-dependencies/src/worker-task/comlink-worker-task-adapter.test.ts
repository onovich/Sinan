import { describe, expect, test } from "vitest";
import { createComlinkWorkerTaskAdapter } from "./comlink-worker-task-adapter";
import { createWorkerTaskHost } from "./comlink-worker-task-host";
import type { TaskJsonObject, TaskRequest } from "./worker-task-types";

function request(taskId: string, input: TaskJsonObject): TaskRequest {
  return {
    taskId,
    correlationId: `${taskId}-correlation`,
    input,
    submittedAt: 1
  };
}

describe("ComlinkWorkerTaskAdapter host lifecycle", () => {
  test("executes registered fixture tasks through the worker host contract", async () => {
    const host = createWorkerTaskHost();

    const boot = await host.boot();
    const result = await host.submit(request("sum-float32", { values: [1, 2.5, 3] }));
    const load = await host.estimateLoad();

    expect(boot.status).toBe("success");
    expect(result).toMatchObject({
      status: "success",
      ok: true,
      fallback: false,
      output: {
        sum: 6.5,
        count: 3
      }
    });
    expect(load.output?.lifecycle).toBe("ready");
    expect(JSON.stringify(result)).not.toMatch(/fallback-used|editor|runtime world|Three|Dexie|Rapier/i);
  });

  test("delegates adapter lifecycle to an injected remote host", async () => {
    const adapter = createComlinkWorkerTaskAdapter({
      remote: createWorkerTaskHost()
    });

    const boot = await adapter.boot();
    const result = await adapter.submit(request("echo-json", { value: "worker-path" }));
    const disposed = await adapter.dispose();

    expect(boot.status).toBe("success");
    expect(adapter.lifecycle).toBe("disposed");
    expect(result).toMatchObject({
      status: "success",
      ok: true,
      fallback: false,
      output: {
        echo: "worker-path"
      }
    });
    expect(disposed.status).toBe("disposed");
    expect(JSON.stringify(adapter.config)).not.toMatch(/WorkerGlobalScope|MessagePort/i);
  });

  test("returns structured unsupported diagnostics when Worker is unavailable", async () => {
    const adapter = createComlinkWorkerTaskAdapter();

    const boot = await adapter.boot();
    const result = await adapter.submit(request("echo-json", { value: "missing-worker" }));

    expect(boot.status).toBe("unavailable");
    expect(boot.diagnostics[0]?.code).toBe("unsupported-worker");
    expect(result.status).toBe("unavailable");
    expect(result.diagnostics[0]?.code).toBe("unsupported-worker");
    expect(adapter.lifecycle).toBe("unavailable");
  });

  test("maps worker factory creation errors to worker-load-failed", async () => {
    const adapter = createComlinkWorkerTaskAdapter({
      workerFactory: () => {
        throw new Error("factory failed");
      }
    });

    const boot = await adapter.boot();

    expect(boot.status).toBe("unavailable");
    expect(boot.diagnostics[0]).toMatchObject({
      code: "worker-load-failed",
      message: "factory failed"
    });
  });
});
