import type { Agent } from "../../ports/Agent.js";
import type { AgentSpec, Task, Result } from "../../domain/types.js";
import type { Tool } from "../../ports/Tool.js";

export class RagAgent implements Agent {
  constructor(private tools: { memories: Tool }) {}
  spec(): AgentSpec {
    return {
      id: "agent.rag",
      version: "0.1.0",
      capabilities: ["rag.search", "mem.write"],
      inputs: "about:blank#rag.in",
      outputs: "about:blank#rag.out",
    };
  }
  async act(t: Task): Promise<Result> {
    const q = typeof t.input === "string" ? t.input : (t.input as any).query;
    const hits = await this.tools.memories.call({
      name: "search",
      input: { text: q, topK: 5 },
    });
    return { taskId: t.id, ok: true, output: { query: q, hits } };
  }
}

