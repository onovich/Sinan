import { describe, expect, test } from "vitest";
import { matureDependencySpikeBaseline } from "../baseline-entry";

describe("mature dependency spike baseline", () => {
  test("keeps the package isolated from Sinan mainline", () => {
    expect(matureDependencySpikeBaseline).toEqual({
      package: "sinan-mature-dependency-spikes",
      isolated: true
    });
  });
});
