import { describe, expect, it } from "vitest";
import { SimplePRPGraph } from "../src/graph-simple.js";
import { MCPAdapter } from "../src/mcp/adapter.js";

describe("Type Safety Fixes", () => {
	it("should create valid Neuron objects from MCP tools", () => {
		const adapter = new MCPAdapter();
		const mockTool = {
			name: "test-tool",
			description: "Test tool",
			inputSchema: { type: "object" },
			execute: async () => ({ result: "success" }),
		};

		const neuron = adapter.createNeuronFromTool(mockTool, "strategy");

		// All required properties should exist
		expect(neuron).toHaveProperty("id");
		expect(neuron).toHaveProperty("role");
		expect(neuron).toHaveProperty("phase");
		expect(neuron).toHaveProperty("dependencies");
		expect(neuron).toHaveProperty("tools");
		expect(neuron).toHaveProperty("execute");
		expect(typeof neuron.execute).toBe("function");
	});

	it("should match PRPOrchestrator interface from prp-runner", () => {
		const mockOrchestrator = {
			getNeuronCount: () => 3,
			executeNeuron: async () => ({}), // Add missing method
		};

		const graph = new SimplePRPGraph(mockOrchestrator);
		expect(graph).toBeDefined();
	});
});
