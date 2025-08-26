import { describe, it, expect } from "vitest";
import { RagAgent } from "../src/adapters/agents/RagAgent.js";
import { MemoriesTool } from "../src/adapters/tools/tool.memories.js";

describe("RagAgent", () => {
  it("returns hits from memories tool", async () => {
    // Minimal fake MemoryService implementing the needed surface
    const fakeSvc = {
      async search(q: any) {
        return { hits: [{ id: "m1", text: q.text, score: 0.9 }] } as any;
      },
    } as any;
    const tool = new MemoriesTool(fakeSvc);
    const agent = new RagAgent({ memories: tool });

    const res = await agent.act({
      id: "00000000-0000-0000-0000-000000000000",
      kind: "rag",
      input: { query: "hello" },
      budget: { wallClockMs: 1000, maxSteps: 3 },
    } as any);

    expect(res.ok).toBe(true);
    const out = res.output as any;
    expect(out.query).toBe("hello");
    expect(out.hits.hits[0].id).toBe("m1");
  });
});

