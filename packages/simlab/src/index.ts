/**
 * @fileoverview SimLab - Simulation harness for Cortex-OS
 * @version 1.0.0
 * @author Cortex-OS Team
 */

export type { AgentRequest, AgentResponse, PRPExecutor } from "./agent-adapter.js";
export { AgentAdapter } from "./agent-adapter.js";
export type { JudgeConfig } from "./judge.js";
export { Judge } from "./judge.js";
export { SimReporter } from "./report.js";
export type { SimRunnerConfig } from "./runner.js";
export { SimRunner } from "./runner.js";
// Re-export types from schemas
export type {
	SimBatchResult,
	SimReport,
	SimResult,
	SimScenario,
	SimScores,
	SimTurn,
} from "./types.js";
export { UserSimulator } from "./user-sim.js";

// Minimal HTTP handler for gateway integration
export async function handleSimlab(_input: unknown): Promise<string> {
	// Placeholder implementation until full contract wiring
	return JSON.stringify({ status: "not_implemented", module: "simlab" });
}
