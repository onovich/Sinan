import { describe, expect, test } from "vitest";
import { createPerformanceDiagnosticsAdapter, type PerformanceLike } from "./performance-diagnostics-adapter";

function commandBase(commandId: string) {
  return {
    commandId,
    requestedAt: "deterministic-smoke"
  };
}

function fakePerformance(): PerformanceLike & {
  marks: string[];
  measures: string[];
  clearMarkCalls: Array<string | undefined>;
  clearMeasureCalls: Array<string | undefined>;
} {
  const entries = new Map<string, Array<{ duration: number }>>();
  return {
    marks: [],
    measures: [],
    clearMarkCalls: [],
    clearMeasureCalls: [],
    mark(markName: string) {
      this.marks.push(markName);
    },
    measure(measureName: string) {
      this.measures.push(measureName);
      entries.set(measureName, [{ duration: 1.5 }]);
    },
    getEntriesByName(name: string) {
      return entries.get(name) ?? [];
    },
    clearMarks(markName?: string) {
      this.clearMarkCalls.push(markName);
    },
    clearMeasures(measureName?: string) {
      this.clearMeasureCalls.push(measureName);
      if (measureName) {
        entries.delete(measureName);
      }
    }
  };
}

describe("PerformanceDiagnosticsAdapter", () => {
  test("records normalized Performance API marker metrics and cleans marks", async () => {
    const performance = fakePerformance();
    const adapter = createPerformanceDiagnosticsAdapter({ performance });

    const result = await adapter.markPerformance({
      ...commandBase("command:mark"),
      type: "mark-performance",
      markerName: "sinan-frame-marker",
      label: "Sinan frame marker"
    });

    expect(result.status).toBe("complete");
    expect(result.ok).toBe(true);
    expect(result.metrics[0]).toEqual({
      metricId: "sinan-frame-marker",
      label: "Sinan frame marker",
      value: 1.5,
      unit: "ms"
    });
    expect(performance.marks).toEqual(["sinan-frame-marker:start", "sinan-frame-marker:end"]);
    expect(performance.measures).toEqual(["sinan-frame-marker"]);
    expect(performance.clearMarkCalls).toEqual(["sinan-frame-marker:start", "sinan-frame-marker:end"]);
    expect(performance.clearMeasureCalls).toEqual(["sinan-frame-marker"]);
    expect(JSON.stringify(result)).not.toMatch(/PerformanceEntry|WebGL|Spector|canvas/i);
  });

  test("reports unavailable when Performance API marker methods are missing", async () => {
    const adapter = createPerformanceDiagnosticsAdapter({ performance: {} });

    const availability = await adapter.queryAvailability({
      ...commandBase("command:availability"),
      type: "query-availability"
    });
    const marker = await adapter.markPerformance({
      ...commandBase("command:missing-api"),
      type: "mark-performance",
      markerName: "sinan-frame-marker"
    });

    expect(availability.status).toBe("unavailable");
    expect(marker.status).toBe("unavailable");
    expect(marker.messages[0]?.code).toBe("diagnostics-unavailable");
  });

  test("rejects invalid marker names without touching Performance API", async () => {
    const performance = fakePerformance();
    const adapter = createPerformanceDiagnosticsAdapter({ performance });

    const result = await adapter.markPerformance({
      ...commandBase("command:bad-marker"),
      type: "mark-performance",
      markerName: "../bad marker"
    });

    expect(result.status).toBe("failed");
    expect(result.messages[0]?.code).toBe("performance-marker-invalid");
    expect(performance.marks).toEqual([]);
    expect(performance.measures).toEqual([]);
  });

  test("cleans marks and measures on cleanup command", async () => {
    const performance = fakePerformance();
    const adapter = createPerformanceDiagnosticsAdapter({ performance });

    const result = await adapter.cleanupArtifacts({
      ...commandBase("command:cleanup"),
      type: "cleanup-artifacts"
    });

    expect(result.status).toBe("complete");
    expect(result.messages[0]?.code).toBe("artifacts-cleaned");
    expect(performance.clearMarkCalls).toEqual([undefined]);
    expect(performance.clearMeasureCalls).toEqual([undefined]);
  });

  test("returns production-disabled without touching marker APIs", async () => {
    const performance = fakePerformance();
    const adapter = createPerformanceDiagnosticsAdapter({
      performance,
      config: {
        production: true,
        devMode: false
      }
    });

    const availability = await adapter.queryAvailability({
      ...commandBase("command:production-availability"),
      type: "query-availability"
    });
    const marker = await adapter.markPerformance({
      ...commandBase("command:production-marker"),
      type: "mark-performance",
      markerName: "sinan-frame-marker"
    });

    expect(availability.status).toBe("production-disabled");
    expect(marker.status).toBe("production-disabled");
    expect(marker.messages[0]?.code).toBe("production-disabled");
    expect(performance.marks).toEqual([]);
  });

  test("returns unavailable when diagnostics feature flag is disabled", async () => {
    const performance = fakePerformance();
    const adapter = createPerformanceDiagnosticsAdapter({
      performance,
      config: {
        diagnosticsEnabled: false
      }
    });

    const result = await adapter.markPerformance({
      ...commandBase("command:feature-disabled"),
      type: "mark-performance",
      markerName: "sinan-frame-marker"
    });

    expect(result.status).toBe("unavailable");
    expect(result.messages[0]?.code).toBe("feature-disabled");
    expect(performance.marks).toEqual([]);
  });

  test("normalizes marker API exceptions to failed diagnostics", async () => {
    const adapter = createPerformanceDiagnosticsAdapter({
      performance: {
        mark() {
          throw new Error("marker failed");
        },
        measure() {
          throw new Error("measure should not run");
        },
        getEntriesByName() {
          return [];
        }
      }
    });

    const result = await adapter.markPerformance({
      ...commandBase("command:marker-failure"),
      type: "mark-performance",
      markerName: "sinan-frame-marker"
    });

    expect(result.status).toBe("failed");
    expect(result.messages[0]?.code).toBe("capture-failed");
    expect(result.messages[0]?.detail?.error).toContain("marker failed");
  });

  test("disposes and blocks later marker work", async () => {
    const adapter = createPerformanceDiagnosticsAdapter({ performance: fakePerformance() });

    const disposed = await adapter.dispose({
      ...commandBase("command:dispose"),
      type: "dispose"
    });
    const later = await adapter.markPerformance({
      ...commandBase("command:after-dispose"),
      type: "mark-performance",
      markerName: "sinan-frame-marker"
    });

    expect(disposed.status).toBe("disposed");
    expect(later.status).toBe("disposed");
    expect(later.messages[0]?.code).toBe("disposed-adapter");
  });
});
