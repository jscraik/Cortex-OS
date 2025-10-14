import { describe, expect, test } from "vitest";
import { routeByTier } from "../src/router";
import cfg from "../../../configs/router.config.yaml";

describe("routing SLOs", () => {
  test("respects latency p95 guardrail in degrade path", async () => {
    const start = Date.now();
    const res = await routeByTier({ id: "t1", input: "Summarize local policy.", tools: [] }, cfg);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThanOrEqual(2000);
    expect(["mlx", "ollama", "cloud"]).toContain(res.route.tier);
  });

  test("honors per-request token cap", async () => {
    const res = await routeByTier({ id: "t2", input: "Generate long essay ...", tools: [] }, cfg);
    expect(res.usage.output_tokens).toBeLessThanOrEqual(cfg.budgets.request.max_output_tokens);
  });
});
