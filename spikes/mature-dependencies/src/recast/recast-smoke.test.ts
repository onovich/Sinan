import { describe, expect, test } from "vitest";
import { runRecastNavigationSmoke } from "./recast-smoke";

describe("recast-navigation smoke", () => {
  test("initializes WASM, builds a simple navmesh, and computes a path", async () => {
    const result = await runRecastNavigationSmoke();

    expect(result.initialized).toBe(true);
    expect(result.navMeshGenerated).toBe(true);
    expect(result.pathPointCount).toBeGreaterThanOrEqual(2);
    expect(result.closestPointOverPoly).toBe(true);
  });
});
