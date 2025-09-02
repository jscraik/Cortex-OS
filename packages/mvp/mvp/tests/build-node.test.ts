import { describe, expect, it } from "vitest";
import { BuildNode } from "../src/nodes/build.js";
import { createInitialPRPState } from "../src/state.js";

describe("BuildNode API schema validation", () => {
	it("fails when API requirement lacks schema", async () => {
		const blueprint = {
			title: "API Project",
			description: "Test missing schema",
			requirements: ["Expose API"],
		};
		const state: any = {
			...createInitialPRPState(blueprint),
			outputs: {
				"api-check": {
					hasAPI: true,
					hasSchema: false, // Missing schema
				},
			},
		};
		const node = new BuildNode();
		const result = await node.execute(state);
		expect(result.validationResults.build?.blockers).toContain(
			"API schema validation failed",
		);
	});

	it("passes when valid API schema provided", async () => {
		const blueprint = {
			title: "API Project",
			description: "Test with schema",
			requirements: ["Expose API"],
		};
		const state: any = {
			...createInitialPRPState(blueprint),
			outputs: {
				"api-check": {
					hasAPI: true,
					hasSchema: true, // Valid schema
				},
			},
		};
		const node = new BuildNode();
		const result = await node.execute(state);

		// Should pass validation when valid schema is provided
		// Note: Other validation criteria might still cause this to fail, but not the API schema check
		// We're specifically testing that the API schema validation passes
		const hasAPISchemaFailure =
			result.validationResults.build?.blockers?.includes(
				"API schema validation failed",
			);
		expect(hasAPISchemaFailure).toBe(false);
	});

	it("fails when backend resources are absent", async () => {
		const blueprint = {
			title: "Frontend Project",
			description: "No backend present",
			requirements: ["UI"],
		};
		const state = createInitialPRPState(blueprint);
		const node = new BuildNode();
		const result = await node.execute(state);
		expect(result.validationResults.build?.blockers).toContain(
			"Backend compilation or tests failed",
		);
	});
});
