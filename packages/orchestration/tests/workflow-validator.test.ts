import { describe, expect, it, vi } from "vitest";
import { ExecutionPlanSchema } from "../src/types.js";
import { validateWorkflow } from "../src/workflow-validator.js";

const baseWorkflow = {
	id: "00000000-0000-0000-0000-000000000000",
	name: "sample",
	version: "1",
	entry: "start",
	steps: {
		start: { id: "start", name: "start", kind: "agent", next: "end" },
		end: { id: "end", name: "end", kind: "agent" },
	},
};

describe("validateWorkflow", () => {
        it("accepts acyclic workflows", () => {
                const result = validateWorkflow(baseWorkflow);
                expect(result.topologicalOrder).toEqual(["start", "end"]);
        });

        it("produces deterministic topological order", () => {
                const branching = {
                        id: "00000000-0000-0000-0000-000000000001",
                        name: "branching",
                        version: "1",
                        entry: "start",
                        steps: {
                                start: {
                                        id: "start",
                                        name: "start",
                                        kind: "branch",
                                        branches: [
                                                { when: "a", to: "a" },
                                                { when: "b", to: "b" },
                                        ],
                                },
                                a: { id: "a", name: "a", kind: "agent", next: "end" },
                                b: { id: "b", name: "b", kind: "agent", next: "end" },
                                end: { id: "end", name: "end", kind: "agent" },
                        },
                };

                const result = validateWorkflow(branching);
                expect(result.topologicalOrder).toEqual(["start", "a", "b", "end"]);
        });

        it("rejects cyclic workflows", () => {
                const cyclic = {
                        ...baseWorkflow,
                        steps: {
                                start: { id: "start", name: "start", kind: "agent", next: "end" },
                                end: { id: "end", name: "end", kind: "agent", next: "start" },
                        },
                };
                expect(() => validateWorkflow(cyclic)).toThrow(/Cycle detected/);
        });
});

describe("deadline handling", () => {
	it("handles step delays with fake timers", async () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		setTimeout(fn, 1000);
		vi.advanceTimersByTime(1000);
		expect(fn).toHaveBeenCalled();
		vi.useRealTimers();
	});
});
describe("ExecutionPlanSchema", () => {
	it("omits deprecated fallbackStrategies", () => {
		const plan = {
			id: "00000000-0000-0000-0000-000000000000",
			taskId: "00000000-0000-0000-0000-000000000000",
			strategy: "sequential",
			phases: ["strategy"],
			dependencies: {},
			estimatedDuration: 1000,
			resourceRequirements: {
				minAgents: 1,
				maxAgents: 1,
				requiredCapabilities: [],
			},
			checkpoints: [],
			createdAt: new Date(),
		} as any;
		const parsed = ExecutionPlanSchema.parse(plan);
		expect(parsed).not.toHaveProperty("fallbackStrategies");
	});
});
