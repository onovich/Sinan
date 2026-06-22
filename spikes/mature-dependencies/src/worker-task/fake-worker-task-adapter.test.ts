import { describe, expect, test } from "vitest";
import { createFakeWorkerTaskAdapter } from "./fake-worker-task-adapter";
import { createFixtureTaskDefinitions, createTaskRegistry, type FixtureTaskDefinition } from "./task-registry";
import type { TaskJsonObject, TaskRequest } from "./worker-task-types";

function request(taskId: string, input: TaskJsonObject): TaskRequest {
  return {
    taskId,
    correlationId: `${taskId}-correlation`,
    input,
    submittedAt: 1
  };
}

describe("FakeWorkerTaskAdapter", () => {
  test("boots as a main-thread fallback and reports load without worker transport", async () => {
    const adapter = createFakeWorkerTaskAdapter();

    const boot = await adapter.boot();
    const load = await adapter.estimateLoad();

    expect(boot.status).toBe("success");
    expect(boot.diagnostics[0]?.code).toBe("fallback-used");
    expect(adapter.lifecycle).toBe("ready");
    expect(load.output).toEqual({
      lifecycle: "ready",
      queued: 0,
      active: 0
    });
    expect(JSON.stringify(adapter.config)).not.toMatch(/Comlink|WorkerGlobalScope|MessagePort/i);
  });

  test("submits fixture tasks through the registry with normalized fallback results", async () => {
    const adapter = createFakeWorkerTaskAdapter();

    const result = await adapter.submit(request("echo-json", { value: { hello: "world" } }));

    expect(result).toMatchObject({
      taskId: "echo-json",
      correlationId: "echo-json-correlation",
      status: "fallback",
      ok: true,
      fallback: true,
      stale: false,
      output: {
        echo: {
          hello: "world"
        }
      }
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["fallback-used"]);
  });

  test("returns adapter-owned diagnostics for unknown tasks and invalid inputs", async () => {
    const adapter = createFakeWorkerTaskAdapter();

    const unknown = await adapter.submit(request("missing-task", { value: true }));
    const invalidInput = await adapter.submit(request("sum-float32", { values: ["1"] }));

    expect(unknown.status).toBe("failed");
    expect(unknown.diagnostics[0]?.code).toBe("unknown-task");
    expect(invalidInput.status).toBe("invalid-input");
    expect(invalidInput.diagnostics[0]?.code).toBe("validation-failure");
  });

  test("validates handler output before returning a result", async () => {
    const [echo] = createFixtureTaskDefinitions();
    const badEcho: FixtureTaskDefinition = {
      ...echo,
      handler: () => ({
        wrong: true
      })
    };
    const adapter = createFakeWorkerTaskAdapter({
      registry: createTaskRegistry([badEcho])
    });

    const result = await adapter.submit(request("echo-json", { value: "ping" }));

    expect(result.status).toBe("invalid-output");
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain("echo-json output");
  });

  test("maps thrown task diagnostics without exposing transport details", async () => {
    const adapter = createFakeWorkerTaskAdapter();

    const result = await adapter.submit(request("throw-diagnostic", { message: "fixture failed" }));

    expect(result.status).toBe("failed");
    expect(result.diagnostics[0]).toMatchObject({
      code: "validation-failure",
      message: "fixture failed"
    });
    expect(JSON.stringify(result)).not.toMatch(/Comlink|WorkerGlobalScope|MessagePort/i);
  });

  test("honors cancellation tokens before running a fallback task", async () => {
    const adapter = createFakeWorkerTaskAdapter();
    const token = {
      id: "cancel-before-submit",
      requested: false,
      reason: "test cancellation"
    };

    await adapter.cancel(token);
    const result = await adapter.submit({
      ...request("delayed-success", { delayMs: 0, label: "cancelled" }),
      cancellationToken: token
    });

    expect(result.status).toBe("cancelled");
    expect(result.diagnostics[0]).toMatchObject({
      code: "cancellation",
      message: "test cancellation"
    });
  });

  test("rejects submissions after dispose with the shared result shape", async () => {
    const adapter = createFakeWorkerTaskAdapter();

    const disposed = await adapter.dispose();
    const result = await adapter.submit(request("echo-json", { value: "after-dispose" }));
    const load = await adapter.estimateLoad();

    expect(disposed.status).toBe("disposed");
    expect(adapter.lifecycle).toBe("disposed");
    expect(result.status).toBe("disposed");
    expect(result.ok).toBe(false);
    expect(load.output?.lifecycle).toBe("disposed");
  });
});
