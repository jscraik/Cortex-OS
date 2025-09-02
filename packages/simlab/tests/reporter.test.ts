import { describe, expect, it } from "vitest";
import type { SimBatchResult, SimResult } from "../src";
import { SimReporter } from "../src";

const makeResult = (id: string, passed: boolean, failures: string[] = []) =>
	({
		scenarioId: id,
		runId: `${id}-1-det`,
		passed,
		scores: { goal: passed ? 1 : 0.5, sop: 1, brand: 1, factual: 1 },
		judgeNotes: "",
		failures,
		turns: [],
		timestamp: new Date().toISOString(),
	}) satisfies SimResult;

describe("SimReporter", () => {
	it("computes batch summary and overall metrics", () => {
		const reporter = new SimReporter();
		const r1 = makeResult("a", true);
		const r2 = makeResult("b", false, ["missing_evidence"]);
		const batch: SimBatchResult = reporter.createBatchResult("batch-1", [
			r1,
			r2,
		]);
		expect(batch.summary.totalScenarios).toBe(2);
		expect(batch.summary.passed).toBe(1);
		expect(batch.summary.failed).toBe(1);
		expect(batch.summary.passRate).toBeCloseTo(0.5, 5);

		const report = reporter.createReport([batch]);
		expect(report.overall.passRate).toBeCloseTo(0.5, 5);
		expect(report.overall.criticalFailures).toBe(1);
	});

	it("applies quality gates thresholds", () => {
		const reporter = new SimReporter();
		const pass = makeResult("a", true);
		const failCritical = makeResult("b", false, ["sop_violation"]);
		const batch = reporter.createBatchResult("batch-1", [pass, failCritical]);
		const report = reporter.createReport([batch]);
		const gates = reporter.checkQualityGates(report);
		expect(gates.passed).toBe(false);
		expect(gates.failures.join(" ")).toMatch(/Critical failures|Pass rate/);
	});
});
