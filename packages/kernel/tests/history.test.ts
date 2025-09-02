/**
 * @file history.test.ts
 * @description Tests for execution history helper
 */

import { describe, expect, it } from "vitest";
import {
	addToHistory,
	createHistory,
	getExecutionHistory,
} from "../src/lib/history.js";
import { createInitialPRPState } from "../src/state.js";

describe("Execution History Helper", () => {
	it("stores and retrieves states by runId", () => {
		const history = createHistory();
		const blueprint = {
			title: "History Test",
			description: "Verify history helper",
			requirements: [],
		};
		const state = createInitialPRPState(blueprint, { runId: "run-1" });
		addToHistory(history, "run-1", state);

		const retrieved = getExecutionHistory(history, "run-1");
		expect(retrieved).toEqual([state]);
	});
});
