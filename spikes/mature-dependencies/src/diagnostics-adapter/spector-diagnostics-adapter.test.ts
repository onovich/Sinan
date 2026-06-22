import { describe, expect, test } from "vitest";
import { createSpectorDiagnosticsAdapter } from "./spector-diagnostics-adapter";

function commandBase(commandId: string) {
  return {
    commandId,
    requestedAt: "deterministic-smoke"
  };
}

function captureCommand(commandId: string) {
  return {
    ...commandBase(commandId),
    type: "start-capture" as const,
    capabilityId: "frame-capture",
    frameBudgetMs: 16
  };
}

describe("SpectorDiagnosticsAdapter dev-only loader", () => {
  test("is disabled by default and does not invoke the dynamic loader", async () => {
    let loadCount = 0;
    const adapter = createSpectorDiagnosticsAdapter({
      browserWindow: {},
      loadSpector: async () => {
        loadCount += 1;
        return false;
      }
    });

    const result = await adapter.startCapture(captureCommand("command:disabled"));

    expect(result.status).toBe("unavailable");
    expect(result.messages[0]?.code).toBe("feature-disabled");
    expect(loadCount).toBe(0);
  });

  test("returns production-disabled outside dev mode", async () => {
    let loadCount = 0;
    const adapter = createSpectorDiagnosticsAdapter({
      browserWindow: {},
      config: {
        devMode: false,
        diagnosticsEnabled: true,
        captureEnabled: true
      },
      loadSpector: async () => {
        loadCount += 1;
        return false;
      }
    });

    const result = await adapter.startCapture(captureCommand("command:non-dev"));

    expect(result.status).toBe("production-disabled");
    expect(result.messages[0]?.code).toBe("production-disabled");
    expect(loadCount).toBe(0);
  });

  test("returns unavailable without a browser window", async () => {
    let loadCount = 0;
    const adapter = createSpectorDiagnosticsAdapter({
      browserWindow: undefined,
      config: {
        diagnosticsEnabled: true,
        captureEnabled: true
      },
      loadSpector: async () => {
        loadCount += 1;
        return false;
      }
    });

    const result = await adapter.startCapture(captureCommand("command:no-window"));

    expect(result.status).toBe("unavailable");
    expect(result.messages[0]?.code).toBe("diagnostics-unavailable");
    expect(loadCount).toBe(0);
  });

  test("loads dynamically only when dev flags and browser are present", async () => {
    let loadCount = 0;
    const adapter = createSpectorDiagnosticsAdapter({
      browserWindow: {},
      config: {
        diagnosticsEnabled: true,
        captureEnabled: true
      },
      loadSpector: async () => {
        loadCount += 1;
        return true;
      }
    });

    const result = await adapter.startCapture(captureCommand("command:capture"));

    expect(result.status).toBe("capturing");
    expect(result.messages[0]?.code).toBe("capture-started");
    expect(loadCount).toBe(1);
    expect(JSON.stringify(result)).not.toMatch(/SPECTOR|Spector|WebGL|canvas|captureId|toolState/);
  });

  test("normalizes dynamic import failure", async () => {
    const adapter = createSpectorDiagnosticsAdapter({
      browserWindow: {},
      config: {
        diagnosticsEnabled: true,
        captureEnabled: true
      },
      loadSpector: async () => {
        throw new Error("dynamic import failed");
      }
    });

    const result = await adapter.startCapture(captureCommand("command:import-failed"));

    expect(result.status).toBe("failed");
    expect(result.messages[0]?.code).toBe("capture-failed");
    expect(result.messages[0]?.detail?.error).toContain("dynamic import failed");
  });

  test("disposes and blocks later work", async () => {
    const adapter = createSpectorDiagnosticsAdapter({
      browserWindow: {},
      config: {
        diagnosticsEnabled: true,
        captureEnabled: true
      }
    });

    const disposed = await adapter.dispose({
      ...commandBase("command:dispose"),
      type: "dispose"
    });
    const later = await adapter.startCapture(captureCommand("command:after-dispose"));

    expect(disposed.status).toBe("disposed");
    expect(later.status).toBe("disposed");
    expect(later.messages[0]?.code).toBe("disposed-adapter");
  });
});
