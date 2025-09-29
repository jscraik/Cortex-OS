import { describe, expect, it, vi } from "vitest";
import { LangGraphHarness } from "../src/langgraph/harness.js";
import { MasterAgentExecutor, InMemoryAdapterRegistry } from "../src/masterAgentExecutor.js";
import type { WorkflowDefinition } from "../src/langgraph/harness.js";
import type { ModelAdapter } from "../src/adapters/base.js";

describe("LangGraph harness integration", () => {
  it("records each node execution and surfaces the final payload", async () => {
    const workflow: WorkflowDefinition = {
      name: "sample",
      nodes: [
        {
          id: "prepare",
          run: async (input) => ({
            prompt: `Summarise ${input.topic}`,
          }),
        },
        {
          id: "augment",
          run: async (input) => ({
            details: `${input.prompt} with metrics`,
          }),
        },
      ],
    };

    const adapter: ModelAdapter = {
      name: "mlx",
      isAvailable: vi.fn().mockResolvedValue(true),
      invoke: vi.fn(async (ctx) => ({
        output: `Executed: ${ctx.prompt} :: ${JSON.stringify(ctx.variables.workflow)}`,
        latencyMs: 5,
        provider: "mlx",
      })),
    };

    const registry = new InMemoryAdapterRegistry([adapter]);
    const executor = new MasterAgentExecutor(registry);

    const result = await executor.execute({
      prompt: "Base prompt",
      variables: { topic: "LangGraph" },
      workflow,
    });

    expect(result.workflowOutput).toMatchObject({
      prompt: "Summarise LangGraph",
      details: "Summarise LangGraph with metrics",
    });
    expect(result.log.map((entry) => entry.nodeId)).toEqual(["prepare", "augment"]);
    expect(result.output).toContain("Executed: Base prompt");
    expect(adapter.invoke).toHaveBeenCalledTimes(1);
  });

  it("throws when constructing a harness without nodes", () => {
    expect(() => new LangGraphHarness({ name: "invalid", nodes: [] })).toThrow(
      "brAInwav LangGraph harness requires at least one node",
    );
  });
});
