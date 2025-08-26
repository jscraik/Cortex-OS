import { describe, it, expect } from "vitest";
import { createExecutor } from "../src/service/Executor.js";
import { withTimeout } from "../src/service/Middleware.js";
import { EchoAgent } from "../src/adapters/agents/EchoAgent.js";

describe("Executor", () => {
  it("runs EchoAgent and returns usage", async () => {
    const exec = createExecutor((h) => withTimeout()(h));
    const agent = new EchoAgent();
    const res = await exec(agent, {
      id: "00000000-0000-0000-0000-000000000000",
      kind: "custom",
      input: { hello: "world" },
      budget: { wallClockMs: 1000, maxSteps: 5 },
    });
    expect(res.ok).toBe(true);
    expect(res.usage?.durationMs).toBeTypeOf("number");
  });
});

