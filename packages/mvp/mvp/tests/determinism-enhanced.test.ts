import { beforeEach, describe, expect, it } from "vitest";
import { SimplePRPGraph } from "../src/graph-simple.js";
import { createInitialPRPState } from "../src/state.js";
import { ExampleCaptureSystem } from "../src/teaching/example-capture.js";
import { resetIdCounter } from "../src/utils/id.js";

describe("Enhanced Determinism", () => {
	beforeEach(() => {
		resetIdCounter();
	});
	it("should produce identical results for identical inputs with deterministic mode", async () => {
		const mockOrchestrator = { getNeuronCount: () => 3 };
		const graph = new SimplePRPGraph(mockOrchestrator);

		const blueprint = {
			title: "Determinism Test",
			description: "Should be deterministic",
			requirements: ["Test determinism"],
		};

		// Run workflows with identical inputs and deterministic mode
		const result1 = await graph.runPRPWorkflow(blueprint, {
			runId: "deterministic-test",
			deterministic: true,
		});

		const result2 = await graph.runPRPWorkflow(blueprint, {
			runId: "deterministic-test",
			deterministic: true,
		});

		// Should produce identical results
		expect(result1).toEqual(result2);
	});

	it("should generate deterministic IDs when deterministic mode enabled", () => {
		const state1 = createInitialPRPState(
			{ title: "Test", description: "Test", requirements: [] },
			{ id: "fixed-id", runId: "fixed-run-id", deterministic: true },
		);

		const state2 = createInitialPRPState(
			{ title: "Test", description: "Test", requirements: [] },
			{ id: "fixed-id", runId: "fixed-run-id", deterministic: true },
		);

		// Should have identical IDs and timestamps
		expect(state1.id).toBe(state2.id);
		expect(state1.runId).toBe(state2.runId);
		expect(state1.metadata.startTime).toBe(state2.metadata.startTime);
	});

	it("should capture deterministic example IDs when flag enabled", () => {
		const blueprint = { title: "Test", description: "Test", requirements: [] };
		const system1 = new ExampleCaptureSystem();
		const ex1 = system1.captureExample(
			"workflow",
			{ prpPhase: "strategy", blueprint, inputState: {} },
			{
				type: "workflow_modification",
				description: "test",
				parameters: {},
				timestamp: "2020-01-01T00:00:00.000Z",
			},
			{ resultingState: {}, success: true, learningValue: 1 },
			{},
			true,
		);
		const ex2 = system1.captureExample(
			"workflow",
			{ prpPhase: "strategy", blueprint, inputState: {} },
			{
				type: "workflow_modification",
				description: "test",
				parameters: {},
				timestamp: "2020-01-01T00:00:00.000Z",
			},
			{ resultingState: {}, success: true, learningValue: 1 },
			{},
			true,
		);
		resetIdCounter();
		const system2 = new ExampleCaptureSystem();
		const repeat = system2.captureExample(
			"workflow",
			{ prpPhase: "strategy", blueprint, inputState: {} },
			{
				type: "workflow_modification",
				description: "test",
				parameters: {},
				timestamp: "2020-01-01T00:00:00.000Z",
			},
			{ resultingState: {}, success: true, learningValue: 1 },
			{},
			true,
		);
		expect(ex1?.id).toBe("example-000001");
		expect(ex2?.id).toBe("example-000002");
		expect(repeat?.id).toBe("example-000001");
	});
});
