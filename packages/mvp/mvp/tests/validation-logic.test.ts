import { describe, expect, it } from "vitest";
import { BuildNode } from "../src/nodes/build.js";
import { EvaluationNode } from "../src/nodes/evaluation.js";

describe("Validation Logic Fixes", () => {
	it("should fail API validation when schema is missing", async () => {
		const buildNode = new BuildNode();

		// Mock state with API but no schema
		const mockState: any = {
			blueprint: {
				title: "API Test",
				description: "Has API",
				requirements: ["REST API"],
			},
			outputs: {
				"api-check": { hasAPI: true, hasSchema: false },
			},
			evidence: [],
		};

		const result = await buildNode.execute(mockState);

		// Should properly fail when schema is missing
		expect(result.validationResults.build?.passed).toBe(false);
		expect(result.validationResults.build?.blockers).toContain(
			"API schema validation failed",
		);
	});

	it("should require ALL phases to pass for cerebrum promotion", async () => {
		const evaluationNode = new EvaluationNode();

		// Mock state with mixed validation results
		const mockState: any = {
			validationResults: {
				strategy: {
					passed: true,
					blockers: [],
					majors: [],
					evidence: [],
					timestamp: new Date().toISOString(),
				},
				build: {
					passed: false,
					blockers: ["API schema missing"],
					majors: [],
					evidence: [],
					timestamp: new Date().toISOString(),
				}, // Failed!
				evaluation: {
					passed: true,
					blockers: [],
					majors: [],
					evidence: [],
					timestamp: new Date().toISOString(),
				},
			},
			evidence: [], // Add required evidence array
		};

		const result = await evaluationNode.execute(mockState);

		// Should be false when any phase fails
		expect(result.validationResults.evaluation?.passed).toBe(false);
	});
});
