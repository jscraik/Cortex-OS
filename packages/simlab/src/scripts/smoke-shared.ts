import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SimRunner } from "../runner.js";
import type { SimBatchResult, SimScenario } from "../types.js";

export interface RunSmokeOptions {
	scenarioFile: string; // relative to cwd, e.g., 'sim/scenarios/critical.json'
	count?: number; // number of scenarios to run
	seed?: number;
	maxTurns?: number;
	timeout?: number;
	gatePassRate?: number; // default 0.8
	label?: string; // label for output filename, default 'smoke'
}

export interface RunSmokeResult {
	batch: SimBatchResult;
	jsonlPath: string;
}

export async function runSmoke(opts: RunSmokeOptions): Promise<RunSmokeResult> {
	const {
		scenarioFile,
		count = 5,
		seed = process.env.SIMLAB_SEED
			? parseInt(process.env.SIMLAB_SEED, 10)
			: 12345,
		maxTurns = 8,
		timeout = 30_000,
		gatePassRate = 0.8,
		label = "smoke",
	} = opts;

	// Load scenarios
	const abs = join(process.cwd(), scenarioFile);
	const scenarios: SimScenario[] = JSON.parse(readFileSync(abs, "utf-8"));
	const selected = scenarios.slice(0, count);

	console.log(`📊 Running ${selected.length} scenarios from ${scenarioFile}`);

	const runner = new SimRunner({
		deterministic: true,
		seed,
		maxTurns,
		timeout,
	});
	const batch = await runner.runBatch(selected);

	// Basic reporting
	const { passRate, passed, failed, totalScenarios } = {
		passRate: batch.summary.passRate,
		passed: batch.summary.passed,
		failed: batch.summary.failed,
		totalScenarios: batch.summary.totalScenarios,
	};

	console.log("\n📈 Results:");
	console.log(`  ✅ Passed: ${passed}/${totalScenarios}`);
	console.log(`  ❌ Failed: ${failed}`);
	console.log(`  📊 Pass Rate: ${(passRate * 100).toFixed(1)}%`);

	// Gate check
	if (passRate < gatePassRate) {
		throw new Error(
			`GATE FAILURE: Pass rate ${(passRate * 100).toFixed(1)}% below ${(
				gatePassRate * 100
			).toFixed(1)}% threshold`,
		);
	}

	// Save JSONL for reporting
	const resultsDir = join(process.cwd(), "sim/runs");
	mkdirSync(resultsDir, { recursive: true });
	const stamp = new Date().toISOString().split("T")[0];
	const filename = `${stamp}-${label}-results.jsonl`;
	const jsonlPath = join(resultsDir, filename);
	const jsonl = batch.scenarios.map((s) => JSON.stringify(s)).join("\n");
	writeFileSync(jsonlPath, jsonl);
	console.log(`💾 Results saved to sim/runs/${filename}`);

	return { batch, jsonlPath };
}

export default runSmoke;
