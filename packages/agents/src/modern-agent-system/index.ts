import { createSessionContextManager } from '@cortex-os/agent-toolkit';
import { createApprovalGate } from './approval-gate.js';
import { createMemoryCoordinator } from './memory-adapter.js';
import { createPlanner } from './planner.js';
import { createToolRouter } from './tool-router.js';
import {
	type ModernAgentSystem,
	type ModernAgentSystemConfig,
	ModernAgentSystemConfigSchema,
} from './types.js';
import { createWorkerRegistry } from './worker-registry.js';
import { createWorkerRunner } from './worker-runner.js';

export const createModernAgentSystem = (rawConfig: ModernAgentSystemConfig): ModernAgentSystem => {
	const config = ModernAgentSystemConfigSchema.parse(rawConfig);
	const workerRegistry = createWorkerRegistry(config.workers);
	const approvalGate = createApprovalGate(config.approvals);
	const memory = createMemoryCoordinator(config.memory);
	const sessionContext = createSessionContextManager();
	const toolRouter = createToolRouter({
		localTools: config.tools,
		mcp: config.mcp,
		sessionContext,
	});
	const runner = createWorkerRunner({
		approvalGate,
		registry: workerRegistry,
		memory,
		tools: toolRouter,
	});
	const planner = createPlanner({ registry: workerRegistry, memory, runner });
	return { planner, workerRegistry, toolRouter } satisfies ModernAgentSystem;
};

export type {
	ModernAgentSystemConfig,
	Planner,
	PlannerExecutionResult,
	PlannerGoal,
} from './types.js';
