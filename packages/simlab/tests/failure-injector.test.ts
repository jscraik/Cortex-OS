import { describe, it, expect } from "vitest";
import type { SimScenario } from "../src";
import { SimRunner } from "../src";
import type { FailureInjector } from "../src";

const baseScenario: SimScenario = {
  id: "scn-fail",
  name: "Failure Injection",
  description: "Test injected failures",
  goal: "cause failure",
  persona: { locale: "en-US", tone: "neutral", tech_fluency: "med" },
  initial_context: {},
  sop_refs: [],
  kb_refs: [],
  success_criteria: ["success"],
  difficulty: "basic",
  category: "support",
  tags: ["smoke"],
};

class AlwaysFailInjector implements FailureInjector {
  maybeInject() {
    return { content: "simulated failure", completed: true, metadata: { injected: true } };
  }
}

describe("Failure injector", () => {
  it("replaces agent response when configured", async () => {
    const runner = new SimRunner({ deterministic: true, failureInjector: new AlwaysFailInjector() });
    const result = await runner.runScenario(baseScenario);
    const agentTurns = result.turns.filter((t) => t.role === "agent");
    expect(agentTurns[0].content).toBe("simulated failure");
  });
});
