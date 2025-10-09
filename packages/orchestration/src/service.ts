import { resolve } from 'node:path';
import type { Logger } from 'winston';

import { createOrchestrationBus } from './events/orchestration-bus.js';
import { createCerebrumGraph } from './langgraph/create-cerebrum-graph.js';
import { PolicyRouter } from './routing/policy-router.js';
import {
	type Agent,
	type OrchestrationConfig,
	OrchestrationStrategy,
	type PlanningContext,
	type Task,
} from './types.js';

// Defer hooks init to runtime to avoid build order issues; dynamic import inside method

const DEFAULT_FACADE_CONFIG: OrchestrationConfig = {
	maxConcurrentOrchestrations: 10,
	defaultStrategy: OrchestrationStrategy.ADAPTIVE,
	enableMultiAgentCoordination: true,
	enableAdaptiveDecisions: true,
	planningTimeout: 300_000,
	executionTimeout: 1_800_000,
	qualityThreshold: 0.8,
	performanceMonitoring: true,
};

export interface OrchestrationFacade {
	engine: { kind: 'langgraph' };
	config: OrchestrationConfig;
	run: (
		task: Task,
		agents: Agent[],
		context?: Partial<PlanningContext>,
		neurons?: unknown[],
	) => Promise<unknown>;
	router: PolicyRouter;
	shutdown: () => Promise<void>;
}

export function provideOrchestration(
	_config: Partial<OrchestrationConfig> = {},
	_logger?: Logger,
): OrchestrationFacade {
	const engine = { kind: 'langgraph' as const };
	const bus = createOrchestrationBus();
	const policyPath = resolve(process.cwd(), '.cortex/policy/routing/routing-policy.yaml');
	const router = new PolicyRouter(policyPath, { bus });
	const graph = createCerebrumGraph({ routing: router });
	const config: OrchestrationConfig = {
		...DEFAULT_FACADE_CONFIG,
		..._config,
		defaultStrategy:
			_config.defaultStrategy ??
			DEFAULT_FACADE_CONFIG.defaultStrategy ??
			OrchestrationStrategy.SEQUENTIAL,
	};

	return {
		engine,
		config,
		router,
		run: async (
			task: Task,
			_agents: Agent[],
			_context: Partial<PlanningContext> = {},
			_neurons: unknown[] = [],
		) => {
			// Minimal mapping from Task -> graph input for now
			const input = task.title || task.description || 'run';
			const result = await graph.invoke({ input });
			// As this facade provides a minimal runtime mapping to the LangGraph program,
			// the invoke payload is intentionally simple to avoid brittle cross-package
			// type requirements during incremental refactors.
			return result;
		},
		shutdown: async () => {
			await router.close();
		},
	};
}

export class OrchestrationService {
	constructor(private readonly service: { execute: (input: string) => Promise<unknown> }) {}

	async handle(input: string) {
		// Ensure hooks are initialized and watcher is running once per process
		try {
			const mod: unknown = await import('@cortex-os/hooks');
			if (mod && typeof mod === 'object' && 'initHooksSingleton' in mod) {
				const init = (mod as { initHooksSingleton?: () => Promise<unknown> }).initHooksSingleton;
				if (typeof init === 'function') await init();
			}
		} catch {
			// ignore hooks init failures
		}
		const result = await this.service.execute(input);
		return result;
	}
}
