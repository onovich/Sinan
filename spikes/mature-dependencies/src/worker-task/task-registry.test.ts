import { describe, expect, test } from "vitest";
import { createFixtureTaskDefinitions, createTaskRegistry } from "./task-registry";
import type { TaskJsonObject, TaskRequest } from "./worker-task-types";

function request(taskId: string, input: TaskJsonObject): TaskRequest {
  return {
    taskId,
    correlationId: `${taskId}-correlation`,
    input,
    submittedAt: 1
  };
}

describe("TaskRegistry fixtures", () => {
  test("exposes stable fixture task ids and capability flags", () => {
    const taskIds = createFixtureTaskDefinitions().map((entry) => entry.taskId);

    expect(taskIds).toEqual(["echo-json", "sum-float32", "delayed-success", "throw-diagnostic"]);

    const registry = createTaskRegistry();
    expect(registry.get("sum-float32").entry?.capabilityFlags.supportsTransfer).toBe(true);
    expect(registry.get("delayed-success").entry?.capabilityFlags.supportsCancellation).toBe(true);
    expect(registry.get("echo-json").entry?.fallbackPolicy).toBe("allow-main-thread");
  });

  test("validates known task inputs and outputs", () => {
    const registry = createTaskRegistry();

    expect(registry.validateInput(request("echo-json", { value: { hello: "world" } })).ok).toBe(true);
    expect(registry.validateOutput("echo-json", { echo: { hello: "world" } }).ok).toBe(true);
    expect(registry.validateInput(request("sum-float32", { values: [1, 2, 3.5] })).ok).toBe(true);
    expect(registry.validateOutput("sum-float32", { sum: 6.5, count: 3 }).ok).toBe(true);
    expect(registry.validateInput(request("delayed-success", { delayMs: 0, label: "ready" })).ok).toBe(true);
    expect(registry.validateOutput("delayed-success", { delayed: true, label: "ready" }).ok).toBe(true);
  });

  test("returns structured diagnostics for unknown and invalid payloads", () => {
    const registry = createTaskRegistry();
    const unknown = registry.get("missing-task");
    const invalidInput = registry.validateInput(request("sum-float32", { values: ["not-a-number"] }));
    const invalidOutput = registry.validateOutput("echo-json", { wrong: true });

    expect(unknown.ok).toBe(false);
    expect(unknown.diagnostics[0]?.code).toBe("unknown-task");
    expect(invalidInput.ok).toBe(false);
    expect(invalidInput.diagnostics[0]?.code).toBe("validation-failure");
    expect(invalidOutput.ok).toBe(false);
    expect(invalidOutput.diagnostics[0]?.message).toContain("echo-json output");
  });

  test("keeps fixture handlers transport-free and deterministic", async () => {
    const registry = createTaskRegistry();
    const echo = registry.get("echo-json").entry;
    const sum = registry.get("sum-float32").entry;
    const delayed = registry.get("delayed-success").entry;
    const throwing = registry.get("throw-diagnostic").entry;

    await expect(Promise.resolve(echo?.handler(request("echo-json", { value: "ping" })))).resolves.toEqual({ echo: "ping" });
    await expect(Promise.resolve(sum?.handler(request("sum-float32", { values: [1, 2, 4] })))).resolves.toEqual({
      sum: 7,
      count: 3
    });
    await expect(Promise.resolve(delayed?.handler(request("delayed-success", { delayMs: 0, label: "done" })))).resolves.toEqual({
      delayed: true,
      label: "done"
    });
    expect(() => throwing?.handler(request("throw-diagnostic", { message: "fixture-failure" }))).toThrow();
    expect(JSON.stringify(createFixtureTaskDefinitions())).not.toMatch(/Comlink|editor|runtime world|Three|Dexie|Rapier/i);
  });
});
