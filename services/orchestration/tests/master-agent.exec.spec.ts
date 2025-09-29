import { describe, expect, it, vi } from "vitest";
import { MlxAdapter } from "../src/adapters/mlx.js";
import { OllamaAdapter } from "../src/adapters/ollama.js";
import { AvailabilityError } from "../src/adapters/base.js";
import { InMemoryAdapterRegistry, MasterAgentExecutor } from "../src/masterAgentExecutor.js";
import type { WorkflowDefinition } from "../src/langgraph/harness.js";

describe("MasterAgentExecutor", () => {
  const workflow: WorkflowDefinition = {
    name: "test",
    nodes: [
      {
        id: "collect",
        run: async (input) => ({
          collected: (input.topic as string | undefined) ?? "unknown",
        }),
      },
    ],
  };

  it("invokes the preferred adapter when available", async () => {
    const mlxRunner = { generate: vi.fn().mockResolvedValue("mlx-output") };
    const ollamaClient = {
      chat: vi.fn().mockResolvedValue({ message: { content: "ollama-output" } }),
    };

    const mlxAdapter = new MlxAdapter({
      runner: mlxRunner,
      availabilityProbe: () => true,
      clock: () => 10,
    });

    const ollamaAdapter = new OllamaAdapter({
      client: ollamaClient,
      model: "llama3",
      availabilityProbe: () => true,
      clock: () => 20,
    });

    const registry = new InMemoryAdapterRegistry([ollamaAdapter, mlxAdapter]);
    const executor = new MasterAgentExecutor(registry);

    const result = await executor.execute({
      prompt: "Explain the topic",
      variables: { topic: "agents" },
      workflow,
      preferredProvider: "mlx",
    });

    expect(mlxRunner.generate).toHaveBeenCalledWith("Explain the topic", {
      topic: "agents",
      workflow: expect.any(Object),
    });
    expect(result.provider).toBe("mlx");
    expect(result.output).toBe("mlx-output");
    expect(result.log).toHaveLength(1);
    expect(result.log[0]).toMatchObject({ nodeId: "collect" });
  });

  it("falls back to the first available adapter when preferred is unavailable", async () => {
    const mlxRunner = { generate: vi.fn().mockResolvedValue("mlx") };
    const mlxAdapter = new MlxAdapter({ runner: mlxRunner, availabilityProbe: () => true });

    const unavailableAdapter = {
      name: "offline",
      isAvailable: vi.fn().mockResolvedValue(false),
      invoke: vi.fn(),
    };

    const registry = new InMemoryAdapterRegistry([unavailableAdapter, mlxAdapter]);
    const executor = new MasterAgentExecutor(registry);

    const result = await executor.execute({ prompt: "status", workflow });

    expect(result.provider).toBe("mlx");
    expect(unavailableAdapter.isAvailable).toHaveBeenCalled();
    expect(mlxRunner.generate).toHaveBeenCalledTimes(1);
  });

  it("throws when no adapters are available", async () => {
    const offlineAdapter = {
      name: "offline",
      isAvailable: vi.fn().mockResolvedValue(false),
      invoke: vi.fn(),
    };

    const registry = new InMemoryAdapterRegistry([offlineAdapter]);
    const executor = new MasterAgentExecutor(registry);

    await expect(executor.execute({ prompt: "hi", workflow })).rejects.toThrow(
      "brAInwav master agent has no available adapters",
    );
  });

  it("propagates adapter invocation failures", async () => {
    const failingAdapter = {
      name: "mlx",
      isAvailable: vi.fn().mockResolvedValue(true),
      invoke: vi.fn().mockRejectedValue(new AvailabilityError("down")),
    };

    const registry = new InMemoryAdapterRegistry([failingAdapter]);
    const executor = new MasterAgentExecutor(registry);

    await expect(executor.execute({ prompt: "hello", workflow })).rejects.toThrow("down");
  });
});
