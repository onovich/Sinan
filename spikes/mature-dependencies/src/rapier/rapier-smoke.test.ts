import { describe, expect, test } from "vitest";
import { probeBaseRapierImport, runRapierSmoke } from "./rapier-smoke";

describe("Rapier smoke", () => {
  test("steps a world, emits collision paths, and supports raycast through compat package", async () => {
    const result = await runRapierSmoke();

    expect(result.worldStepped).toBe(true);
    expect(result.raycastHit).toBe(true);
    expect(result.contactEvents).toBeGreaterThanOrEqual(1);
    expect(result.triggerEvents).toBeGreaterThanOrEqual(1);
    expect(result.dynamicBodyY).toBeLessThan(2.5);
  });

  test("records base package import diagnostics without forcing it as the smoke path", async () => {
    const probe = await probeBaseRapierImport();

    expect(typeof probe.ok).toBe("boolean");
    if (!probe.ok) {
      expect(probe.error).toContain("@dimforge/rapier3d");
    }
  });
});
