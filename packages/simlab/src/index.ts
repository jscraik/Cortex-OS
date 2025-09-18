/**
 * @fileoverview SimLab - Simulation harness for Cortex-OS
 * @version 1.0.0
 * @author Cortex-OS Team
 */

export type {
	AgentRequest,
	AgentResponse,
	PRPExecutor,
} from './agent-adapter.js';
export { AgentAdapter, RealPRPExecutor } from './agent-adapter.js';
export { generateTests } from './auto-test.js';
export type { FailureInjector } from './failure-injector.js';
export { RandomFailureInjector } from './failure-injector.js';
export type { JudgeConfig } from './judge.js';
export { Judge } from './judge.js';
export { SimReporter } from './report.js';
export type { SimRunnerConfig } from './runner.js';
export { SimRunner } from './runner.js';
// Re-export types from schemas
export type {
	SimBatchResult,
	SimReport,
	SimResult,
	SimScenario,
	SimScores,
	SimTurn,
} from './types.js';
export { UserSimulator } from './user-sim.js';

import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// HTTP handler for gateway integration
export async function handleSimlab(input: unknown): Promise<string> {
	const schema = z.object({
		action: z.enum(['ping', 'status']).default('status'),
	});
	const { action } = schema.parse(input ?? {});

	if (action === 'ping') {
		return JSON.stringify({
			status: 'ok',
			timestamp: new Date().toISOString(),
		});
	}

	const scenarioDir = join(
		dirname(fileURLToPath(new URL('./index.ts', import.meta.url))),
		'../sim/scenarios',
	);
	let scenarioCount = 0;
	try {
		scenarioCount = readdirSync(scenarioDir).filter((f) => f.endsWith('.json')).length;
	} catch {
		scenarioCount = 0;
	}
	return JSON.stringify({
		status: 'ok',
		scenarios: scenarioCount,
		timestamp: new Date().toISOString(),
	});
}

export {
	createSimlabBus,
	createSimlabSchemaRegistry,
	type SimlabBusConfig,
} from './a2a.js';
// A2A Events
export {
	type AgentCreatedEvent,
	createSimLabEvent,
	type ExperimentResultEvent,
	SIMLAB_EVENT_SOURCE,
	type SimulationCompletedEvent,
	type SimulationStartedEvent,
} from './events/simlab-events.js';
// MCP Integration
export { simlabMcpTools } from './mcp/tools.js';
