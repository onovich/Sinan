import { describe, expect, test } from "vitest";
import { runGltfTransformSmoke } from "./gltf-transform-smoke";

describe("glTF Transform smoke", () => {
  test("creates, inspects, transforms, serializes, and reports a minimal GLB", async () => {
    const result = await runGltfTransformSmoke();

    expect(result.meshoptReady).toBe(true);
    expect(result.glbBytes).toBeGreaterThan(0);
    expect(result.sceneCount).toBe(1);
    expect(result.meshCount).toBe(1);
    expect(result.deterministicReportKeys).toContain("scenes");
    expect(result.adapterBoundary).toContain("offline adapter");
  });
});
