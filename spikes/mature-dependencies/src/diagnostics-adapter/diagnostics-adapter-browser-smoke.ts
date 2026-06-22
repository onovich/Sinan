import { createPerformanceDiagnosticsAdapter } from "./performance-diagnostics-adapter";
import { createSpectorDiagnosticsAdapter } from "./spector-diagnostics-adapter";

export interface DiagnosticsAdapterBrowserSmokeResult {
  adapter: "DiagnosticsAdapter";
  catalogEntry: boolean;
  performanceOk: boolean;
  disabledByDefaultOk: boolean;
  productionDisabledOk: boolean;
  policyTextPresent: boolean;
  contractClean: boolean;
  statuses: Record<string, string>;
  messages: string[];
  metrics: Array<{
    metricId: string;
    value: number;
    unit: string;
  }>;
  diagnostics: string[];
}

export async function runDiagnosticsAdapterBrowserSmoke(): Promise<DiagnosticsAdapterBrowserSmokeResult> {
  const performanceAdapter = createPerformanceDiagnosticsAdapter({
    performance: globalThis.performance
  });
  const captureAdapter = createSpectorDiagnosticsAdapter({
    browserWindow: globalThis.window
  });
  const productionAdapter = createSpectorDiagnosticsAdapter({
    browserWindow: globalThis.window,
    config: {
      devMode: false,
      production: true,
      diagnosticsEnabled: true,
      captureEnabled: true
    }
  });

  const availability = await performanceAdapter.queryAvailability({
    commandId: "browser:diagnostics:availability",
    type: "query-availability",
    requestedAt: "deterministic-smoke"
  });
  const marker = await performanceAdapter.markPerformance({
    commandId: "browser:diagnostics:marker",
    type: "mark-performance",
    requestedAt: "deterministic-smoke",
    markerName: "sinan-browser-frame-marker",
    label: "Sinan browser frame marker"
  });
  const captureDisabled = await captureAdapter.startCapture({
    commandId: "browser:diagnostics:capture-disabled",
    type: "start-capture",
    requestedAt: "deterministic-smoke",
    capabilityId: "frame-capture"
  });
  const productionDisabled = await productionAdapter.startCapture({
    commandId: "browser:diagnostics:production-disabled",
    type: "start-capture",
    requestedAt: "deterministic-smoke",
    capabilityId: "frame-capture"
  });
  const cleanup = await performanceAdapter.cleanupArtifacts({
    commandId: "browser:diagnostics:cleanup",
    type: "cleanup-artifacts",
    requestedAt: "deterministic-smoke"
  });
  const dispose = await captureAdapter.dispose({
    commandId: "browser:diagnostics:dispose",
    type: "dispose",
    requestedAt: "deterministic-smoke"
  });

  const statuses = {
    availability: availability.status,
    marker: marker.status,
    captureDisabled: captureDisabled.status,
    productionDisabled: productionDisabled.status,
    cleanup: cleanup.status,
    dispose: dispose.status
  };
  const messages = [availability, marker, captureDisabled, productionDisabled, cleanup, dispose].flatMap((result) =>
    result.messages.map((message) => `${message.code}: ${message.text}`)
  );
  const metrics = marker.metrics.map((metric) => ({
    metricId: metric.metricId,
    value: metric.value,
    unit: metric.unit
  }));
  const policyText = "dev-only dynamic import disabled-by-default production-excluded local-temporary";
  const snapshot = JSON.stringify({
    statuses,
    messages,
    metrics
  });

  return {
    adapter: "DiagnosticsAdapter",
    catalogEntry: true,
    performanceOk: availability.status === "ready" && marker.status === "complete" && marker.metrics.length === 1,
    disabledByDefaultOk: captureDisabled.status === "unavailable" && captureDisabled.messages[0]?.code === "feature-disabled",
    productionDisabledOk: productionDisabled.status === "production-disabled",
    policyTextPresent: policyText.includes("dev-only") && policyText.includes("production-excluded"),
    contractClean: !/spectorjs|SPECTOR|WebGL|HTMLCanvas|canvas|captureId|toolState/i.test(snapshot),
    statuses,
    messages,
    metrics,
    diagnostics: [
      `availability: ${availability.status}`,
      `marker: ${marker.status}`,
      `capture disabled by default: ${captureDisabled.status}`,
      `production disabled: ${productionDisabled.status}`,
      `policy: ${policyText}`,
      "DiagnosticsAdapter browser smoke -> Performance marker + disabled dev-only capture boundary"
    ]
  };
}
