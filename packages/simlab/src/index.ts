/**
 * @fileoverview SimLab - Simulation harness for Cortex-OS
 * @version 1.0.0
 * @author Cortex-OS Team
 */

export type { AgentRequest, AgentResponse, PRPExecutor } from "./agent-adapter.js";
export { AgentAdapter, RealPRPExecutor } from "./agent-adapter.js";
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
export type { FailureInjector } from "./failure-injector.js";
export { RandomFailureInjector } from "./failure-injector.js";
export { generateTests } from "./auto-test.js";
import { z } from "zod";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

// HTTP handler for gateway integration
export async function handleSimlab(input: unknown): Promise<string> {
        const schema = z.object({ action: z.enum(["ping", "status"]).default("status") });
        const { action } = schema.parse(input ?? {});

        if (action === "ping") {
                return JSON.stringify({ status: "ok", timestamp: new Date().toISOString() });
        }

        const scenarioDir = join(
                dirname(fileURLToPath(new URL("./index.ts", import.meta.url))),
                "../sim/scenarios",
        );
        let scenarioCount = 0;
        try {
                scenarioCount = readdirSync(scenarioDir).filter((f) => f.endsWith(".json")).length;
        } catch {
                scenarioCount = 0;
        }
        return JSON.stringify({
                status: "ok",
                scenarios: scenarioCount,
                timestamp: new Date().toISOString(),
        });
}
