import { describe, expect, it } from "vitest";
import { createEvidence } from "../src/lib/phase-utils.js";
import {
	runBuildNode,
	runEvaluationNode,
	runStrategyNode,
} from "../src/nodes/index.js";
import { createInitialPRPState } from "../src/state.js";

describe("PRP nodes", () => {
	it("runs strategy, build and evaluation phases", async () => {
		const blueprint = {
			title: "Test",
			description: "desc",
			requirements: ["security", "backend"],
		};
		let state = createInitialPRPState(blueprint, { deterministic: true });

		state = await runStrategyNode(state);
		expect(state.validationResults.strategy?.passed).toBe(true);

		state = await runBuildNode(state);
		state.evidence.push(
			createEvidence(state, "extra", "test", "extra", {}, "build"),
		);
		expect(state.validationResults.build?.passed).toBe(true);

		state = await runEvaluationNode(state);
		expect(state.validationResults.evaluation?.passed).toBe(true);
	});
});
