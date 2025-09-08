import { describe, it, expect } from "vitest";
import { simulateDSP } from "../src/utils/dsp.js";

describe("simulateDSP", () => {
  it("returns step sequence based on outcomes", () => {
    const steps = simulateDSP([true, true, false], { initialStep: 1, maxStep: 4 });
    expect(steps).toEqual([1, 2, 3]);
  });
});
