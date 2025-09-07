import { describe, it, expect } from "vitest";
import type { SimScenario } from "../src";
import { AgentAdapter, type AgentRequest, RealPRPExecutor } from "../src";

const scenario: SimScenario = {
  id: "scn-prp",
  name: "PRP Test",
  description: "ensure real executor returns content",
  goal: "provide info",
  persona: { locale: "en-US", tone: "neutral", tech_fluency: "med" },
  initial_context: {},
  sop_refs: [],
  kb_refs: [],
  success_criteria: ["info"],
  difficulty: "basic",
  category: "support",
  tags: ["smoke"],
};

describe("Real PRP executor", () => {
  it("produces content via orchestrator", async () => {
    const adapter = new AgentAdapter(new RealPRPExecutor());
    const req: AgentRequest = { scenario, conversationHistory: [], userMessage: "hi" };
    const res = await adapter.execute(req);
    expect(res.content).toContain("PRP");
  });
});
