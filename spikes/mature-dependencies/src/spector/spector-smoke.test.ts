import { describe, expect, test } from "vitest";
import { runSpectorSmoke } from "./spector-smoke";

describe("Spector and Performance API smoke", () => {
  test("records performance markers and keeps Spector behind a disabled dev-only flag", async () => {
    const result = await runSpectorSmoke({ enableCapture: false });

    expect(result.performance.supported).toBe(true);
    expect(result.performance.measureName).toBe("sinan-spike-frame");
    expect(result.spector.loaded).toBe(false);
    expect(result.spector.reason).toBe("feature flag disabled");
    expect(result.productionIsolation).toContain("dynamic import");
  });
});
