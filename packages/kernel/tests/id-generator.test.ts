import { beforeEach, describe, expect, it } from "vitest";
import { ExampleCaptureSystem } from "../src/teaching/example-capture.js";
import { generateId, resetIdCounter } from "../src/utils/id.js";

describe("ID generator", () => {
	beforeEach(() => {
		resetIdCounter();
	});

	it("creates deterministic ids when flagged", () => {
		const first = generateId("test", true);
		const second = generateId("test", true);
		resetIdCounter();
		const repeat = generateId("test", true);
		expect(first).toBe("test-000001");
		expect(second).toBe("test-000002");
		expect(repeat).toBe("test-000001");
	});

	it("creates unique ids by default", () => {
		const a = generateId("test");
		const b = generateId("test");
		expect(a).not.toBe(b);
	});

	it("captures deterministic example ids when flagged", () => {
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
		expect(ex1.id).toBe("example-000001");
		expect(ex2.id).toBe("example-000002");
		expect(repeat.id).toBe("example-000001");
	});
});
