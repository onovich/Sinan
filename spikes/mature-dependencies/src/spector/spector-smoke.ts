export interface PerformanceMarkerResult {
  supported: boolean;
  measureName: string;
  durationMs: number;
}

export interface SpectorDevOnlyResult {
  loaded: boolean;
  reason?: string;
  constructorFound?: boolean;
}

export interface SpectorSmokeResult {
  performance: PerformanceMarkerResult;
  spector: SpectorDevOnlyResult;
  productionIsolation: string;
}

export function runPerformanceMarkerSmoke(measureName = "sinan-spike-frame"): PerformanceMarkerResult {
  if (!globalThis.performance?.mark || !globalThis.performance.measure) {
    return {
      supported: false,
      measureName,
      durationMs: 0
    };
  }

  const start = `${measureName}:start`;
  const end = `${measureName}:end`;
  globalThis.performance.mark(start);
  globalThis.performance.mark(end);
  globalThis.performance.measure(measureName, start, end);
  const entries = globalThis.performance.getEntriesByName(measureName, "measure");
  const latest = entries.at(-1);
  globalThis.performance.clearMarks(start);
  globalThis.performance.clearMarks(end);
  globalThis.performance.clearMeasures(measureName);

  return {
    supported: true,
    measureName,
    durationMs: latest?.duration ?? 0
  };
}

export async function loadSpectorDevOnly(enabled: boolean): Promise<SpectorDevOnlyResult> {
  if (!enabled) {
    return { loaded: false, reason: "feature flag disabled" };
  }

  if (!import.meta.env.DEV) {
    return { loaded: false, reason: "not a dev build" };
  }

  if (typeof window === "undefined") {
    return { loaded: false, reason: "no browser window" };
  }

  const { loadSpectorConstructorFound } = await import("./spector-dev-only-loader");

  return {
    loaded: true,
    constructorFound: await loadSpectorConstructorFound()
  };
}

export async function runSpectorSmoke(options: { enableCapture?: boolean } = {}): Promise<SpectorSmokeResult> {
  return {
    performance: runPerformanceMarkerSmoke(),
    spector: await loadSpectorDevOnly(options.enableCapture ?? false),
    productionIsolation: "feature flag + import.meta.env.DEV guard + dynamic import"
  };
}
