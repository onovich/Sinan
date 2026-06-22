import { describe, expect, test } from "vitest";
import {
  createDiagnosticsMessage,
  createDiagnosticsResult,
  diagnosticsCommandTypes,
  diagnosticsLifecycleStates,
  diagnosticsMessageCodes,
  type DiagnosticsAdapter,
  type DiagnosticsArtifact,
  type DiagnosticsCommand,
  type DiagnosticsConfig,
  type DiagnosticsResult
} from "./diagnostics-adapter-types";

describe("DiagnosticsAdapter contract types", () => {
  test("defines dev-only lifecycle states and command vocabulary", () => {
    expect(diagnosticsLifecycleStates).toEqual([
      "production-disabled",
      "unavailable",
      "loading",
      "ready",
      "capturing",
      "complete",
      "failed",
      "disposed"
    ]);
    expect(diagnosticsCommandTypes).toEqual([
      "query-availability",
      "mark-performance",
      "start-capture",
      "stop-capture",
      "cleanup-artifacts",
      "dispose"
    ]);
    expect(diagnosticsMessageCodes).toContain("production-disabled");
    expect(diagnosticsMessageCodes).toContain("capture-failed");
  });

  test("creates normalized messages and results", () => {
    const message = createDiagnosticsMessage("diagnostics-ready", "Diagnostics are ready.", "info", false, {
      capabilityId: "performance-marker"
    });
    const result = createDiagnosticsResult("command:availability", "ready", {
      capabilityId: "performance-marker",
      messages: [message],
      metrics: [
        {
          metricId: "frame-marker",
          label: "Frame marker",
          value: 1,
          unit: "count"
        }
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("ready");
    expect(result.messages[0]).toEqual(message);
    expect(createDiagnosticsResult("command:prod", "production-disabled").ok).toBe(false);
    expect(createDiagnosticsResult("command:complete", "complete").ok).toBe(true);
  });

  test("keeps public contract Sinan-owned and serializable", () => {
    const config: DiagnosticsConfig = {
      adapterId: "diagnostics-adapter",
      devMode: true,
      production: false,
      diagnosticsEnabled: false,
      captureEnabled: false,
      capabilityIds: ["performance-marker", "frame-capture"],
      artifactPolicy: {
        retentionClass: "local-temporary",
        localOnly: true,
        maxArtifactBytes: 0,
        cleanupAfterSmoke: true,
        allowedExtensions: [".json"]
      }
    };
    const command: DiagnosticsCommand = {
      commandId: "command:capture-start",
      type: "start-capture",
      requestedAt: "deterministic-smoke",
      capabilityId: "frame-capture"
    };
    const artifact: DiagnosticsArtifact = {
      artifactId: "artifact:frame-capture:metadata",
      capabilityId: "frame-capture",
      createdAt: "deterministic-smoke",
      bytes: 0,
      retentionClass: "local-temporary",
      localOnly: true,
      committed: false,
      metadata: {
        owner: "Sinan diagnostics boundary"
      }
    };
    const result: DiagnosticsResult = createDiagnosticsResult(command.commandId, "complete", {
      capabilityId: command.capabilityId,
      artifacts: [artifact],
      messages: [createDiagnosticsMessage("capture-complete", "Frame capture metadata recorded.")]
    });
    const adapterShape = {
      config,
      status: result.status
    } satisfies Pick<DiagnosticsAdapter, "config" | "status">;

    expect(adapterShape.config.artifactPolicy.localOnly).toBe(true);
    expect(result.artifacts[0]?.committed).toBe(false);
    expect(JSON.stringify({ config, command, result })).not.toMatch(/Spector|WebGL|canvas|HTMLCanvas|captureId|toolState|__proto__/i);
  });
});
