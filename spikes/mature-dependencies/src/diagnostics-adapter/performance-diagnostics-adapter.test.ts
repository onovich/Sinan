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
});
