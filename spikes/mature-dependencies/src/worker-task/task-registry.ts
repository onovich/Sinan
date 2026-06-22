import {
  createTaskDiagnostic,
  type TaskDiagnostic,
  type TaskJsonObject,
  type TaskJsonValue,
  type TaskRegistryEntry,
  type TaskRequest,
  type TaskValidationResult
} from "./worker-task-types";

export type FixtureTaskId = "echo-json" | "sum-float32" | "delayed-success" | "throw-diagnostic";

export type FixtureTaskHandler = (request: TaskRequest) => Promise<TaskJsonObject> | TaskJsonObject;

export interface FixtureTaskDefinition extends TaskRegistryEntry {
  taskId: FixtureTaskId;
  handler: FixtureTaskHandler;
}

export interface TaskLookupResult {
  ok: boolean;
  entry?: FixtureTaskDefinition;
  diagnostics: TaskDiagnostic[];
}

export interface TaskRegistry {
  list(): FixtureTaskDefinition[];
  get(taskId: string): TaskLookupResult;
  validateInput(request: TaskRequest): TaskValidationResult;
  validateOutput(taskId: string, output: TaskJsonObject): TaskValidationResult;
}

function isJsonObject(value: TaskJsonValue | undefined): value is TaskJsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function success(): TaskValidationResult {
  return {
    ok: true,
    diagnostics: []
  };
}

function validationFailure(message: string, detail?: TaskJsonObject): TaskValidationResult {
  return {
    ok: false,
    diagnostics: [createTaskDiagnostic("validation-failure", message, "error", false, detail)]
  };
}

function unknownTask(taskId: string): TaskLookupResult {
  return {
    ok: false,
    diagnostics: [
      createTaskDiagnostic("unknown-task", `Task ${taskId} is not registered.`, "error", false, {
        taskId
      })
    ]
  };
}

function numberArray(value: TaskJsonValue | undefined): value is number[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "number" && Number.isFinite(entry));
}

function echoJsonTask(): FixtureTaskDefinition {
  return {
    taskId: "echo-json",
    capabilityFlags: {
      supportsWorker: true,
      supportsMainThreadFallback: true,
      supportsTransfer: false,
      supportsCancellation: false,
      supportsProgress: false
    },
    inputValidator: (payload) => (isJsonObject(payload) && "value" in payload ? success() : validationFailure("echo-json requires a value field.")),
    outputValidator: (payload) => (isJsonObject(payload) && "echo" in payload ? success() : validationFailure("echo-json output requires echo.")),
    transferPolicy: {
      allowTransfer: false,
      allowedKinds: []
    },
    fallbackPolicy: "allow-main-thread",
    defaultTimeoutMs: 250,
    handler: (request) => ({
      echo: request.input.value ?? null
    })
  };
}

function sumFloat32Task(): FixtureTaskDefinition {
  return {
    taskId: "sum-float32",
    capabilityFlags: {
      supportsWorker: true,
      supportsMainThreadFallback: true,
      supportsTransfer: true,
      supportsCancellation: false,
      supportsProgress: false
    },
    inputValidator: (payload) =>
      isJsonObject(payload) && numberArray(payload.values) ? success() : validationFailure("sum-float32 requires numeric values."),
    outputValidator: (payload) =>
      isJsonObject(payload) && typeof payload.sum === "number" && typeof payload.count === "number"
        ? success()
        : validationFailure("sum-float32 output requires sum and count."),
    transferPolicy: {
      allowTransfer: true,
      allowedKinds: ["array-buffer"],
      maxBytes: 1024 * 1024
    },
    fallbackPolicy: "allow-main-thread",
    defaultTimeoutMs: 500,
    handler: (request) => {
      const values = numberArray(request.input.values) ? request.input.values : [];
      return {
        sum: values.reduce((total, value) => total + value, 0),
        count: values.length
      };
    }
  };
}

function delayedSuccessTask(): FixtureTaskDefinition {
  return {
    taskId: "delayed-success",
    capabilityFlags: {
      supportsWorker: true,
      supportsMainThreadFallback: true,
      supportsTransfer: false,
      supportsCancellation: true,
      supportsProgress: true
    },
    inputValidator: (payload) =>
      isJsonObject(payload) && typeof payload.delayMs === "number" && payload.delayMs >= 0 && typeof payload.label === "string"
        ? success()
        : validationFailure("delayed-success requires delayMs and label."),
    outputValidator: (payload) =>
      isJsonObject(payload) && payload.delayed === true && typeof payload.label === "string"
        ? success()
        : validationFailure("delayed-success output requires delayed and label."),
    transferPolicy: {
      allowTransfer: false,
      allowedKinds: []
    },
    fallbackPolicy: "allow-main-thread",
    defaultTimeoutMs: 1000,
    handler: async (request) => {
      const delayMs = typeof request.input.delayMs === "number" ? request.input.delayMs : 0;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return {
        delayed: true,
        label: typeof request.input.label === "string" ? request.input.label : "unknown"
      };
    }
  };
}

function throwDiagnosticTask(): FixtureTaskDefinition {
  return {
    taskId: "throw-diagnostic",
    capabilityFlags: {
      supportsWorker: true,
      supportsMainThreadFallback: true,
      supportsTransfer: false,
      supportsCancellation: false,
      supportsProgress: false
    },
    inputValidator: (payload) =>
      isJsonObject(payload) && typeof payload.message === "string" ? success() : validationFailure("throw-diagnostic requires message."),
    outputValidator: (payload) =>
      isJsonObject(payload) && payload.failed === true ? success() : validationFailure("throw-diagnostic output requires failed."),
    transferPolicy: {
      allowTransfer: false,
      allowedKinds: []
    },
    fallbackPolicy: "allow-main-thread",
    defaultTimeoutMs: 250,
    handler: (request) => {
      throw createTaskDiagnostic("validation-failure", String(request.input.message), "error", false, {
        taskId: "throw-diagnostic"
      });
    }
  };
}

export function createFixtureTaskDefinitions(): FixtureTaskDefinition[] {
  return [echoJsonTask(), sumFloat32Task(), delayedSuccessTask(), throwDiagnosticTask()];
}

export function createTaskRegistry(definitions: FixtureTaskDefinition[] = createFixtureTaskDefinitions()): TaskRegistry {
  const entries = new Map(definitions.map((entry) => [entry.taskId, entry]));

  return {
    list: () => [...entries.values()],
    get: (taskId) => {
      const entry = entries.get(taskId as FixtureTaskId);
      return entry ? { ok: true, entry, diagnostics: [] } : unknownTask(taskId);
    },
    validateInput: (request) => {
      const lookup = entries.get(request.taskId as FixtureTaskId);
      return lookup ? lookup.inputValidator(request.input) : validationFailure(`Unknown task ${request.taskId}.`, { taskId: request.taskId });
    },
    validateOutput: (taskId, output) => {
      const lookup = entries.get(taskId as FixtureTaskId);
      return lookup ? lookup.outputValidator(output) : validationFailure(`Unknown task ${taskId}.`, { taskId });
    }
  };
}
