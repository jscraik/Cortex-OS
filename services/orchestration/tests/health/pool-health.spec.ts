import { describe, expect, it } from "vitest";
import { calculatePoolHealth } from "../../src/health/poolHealth.js";

describe("calculatePoolHealth", () => {
  it("aggregates totals dynamically", () => {
    const summary = calculatePoolHealth([
      { id: "primary", running: 3, queued: 1, capacity: 5 },
      { id: "secondary", running: 2, queued: 4, capacity: 8 },
    ]);

    expect(summary.totalRunning).toBe(5);
    expect(summary.totalQueued).toBe(5);
    expect(summary.totalCapacity).toBe(13);
    expect(summary.utilisation).toBeCloseTo(5 / 13);
  });

  it("returns zeroed summary for empty pools", () => {
    const summary = calculatePoolHealth([]);
    expect(summary).toEqual({
      members: [],
      totalRunning: 0,
      totalQueued: 0,
      totalCapacity: 0,
      utilisation: 0,
    });
  });

  it("guards against negative metrics", () => {
    expect(() =>
      calculatePoolHealth([
        { id: "broken", running: -1, queued: 0, capacity: 1 },
      ]),
    ).toThrow("brAInwav pool metrics must be non-negative");
  });
});
