import { describe, expect, it } from "vitest";
import { createLangGraphAgent } from "../../src/agents/langgraph-agent.js";

describe("LangGraphAgent", () => {
  it("increments the counter", async () => {
    const agent = createLangGraphAgent();
    const result = await agent.execute({ input: { count: 1 } });
    expect(result.data?.count).toBe(2);
  });
});
