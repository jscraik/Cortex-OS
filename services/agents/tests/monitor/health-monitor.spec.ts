import { describe, expect, it, vi } from "vitest";
import { HealthMonitor } from "../../src/healthMonitor.js";

describe("HealthMonitor", () => {
  it("executes all registered checks", async () => {
    const dbCheck = vi.fn().mockResolvedValue({ name: "database", healthy: true });
    const queueCheck = vi.fn().mockResolvedValue({ name: "queue", healthy: true, details: { depth: 1 } });
    const langGraphCheck = vi.fn().mockResolvedValue({ name: "langgraph", healthy: true });

    const monitor = new HealthMonitor([dbCheck, queueCheck, langGraphCheck]);
    const results = await monitor.run();

    expect(results).toHaveLength(3);
    expect(dbCheck).toHaveBeenCalled();
    expect(queueCheck).toHaveBeenCalled();
    expect(langGraphCheck).toHaveBeenCalled();
  });

  it("throws when created without checks", () => {
    expect(() => new HealthMonitor([])).toThrow(
      "brAInwav agent health monitor requires at least one check",
    );
  });
});
