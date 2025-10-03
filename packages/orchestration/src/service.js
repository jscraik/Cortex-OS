import { createCerebrumGraph } from './langgraph/create-cerebrum-graph.js';

// Defer hooks init to runtime to avoid build order issues; dynamic import inside method
const DEFAULT_FACADE_CONFIG = {
	maxConcurrentOrchestrations: 10,
	defaultStrategy: 'adaptive',
	enableMultiAgentCoordination: true,
	enableAdaptiveDecisions: true,
	planningTimeout: 300_000,
	executionTimeout: 1_800_000,
	qualityThreshold: 0.8,
	performanceMonitoring: true,
};
export function provideOrchestration(_config = {}, _logger) {
	const engine = { kind: 'langgraph' };
	const graph = createCerebrumGraph();
	const config = {
		...DEFAULT_FACADE_CONFIG,
		..._config,
		defaultStrategy: _config.defaultStrategy ?? DEFAULT_FACADE_CONFIG.defaultStrategy,
	};
	return {
		engine,
		config,
		run: async (task, _agents, _context = {}, _neurons = []) => {
			// Minimal mapping from Task -> graph input for now
			const input = task.title || task.description || 'run';
			const result = await graph.invoke({ input });
			// As this facade provides a minimal runtime mapping to the LangGraph program,
			// the invoke payload is intentionally simple to avoid brittle cross-package
			// type requirements during incremental refactors.
			return result;
		},
		shutdown: async () => {
			// Noop for now (no persistent resources yet)
		},
	};
}
export class OrchestrationService {
	service;
	constructor(service) {
		this.service = service;
	}
	async handle(input) {
		// Ensure hooks are initialized and watcher is running once per process
		try {
			const mod = await import('@cortex-os/hooks');
			if (mod && typeof mod === 'object' && 'initHooksSingleton' in mod) {
				const init = mod.initHooksSingleton;
				if (typeof init === 'function') await init();
			}
		} catch {
			// ignore hooks init failures
		}
		const result = await this.service.execute(input);
		return result;
	}
}
//# sourceMappingURL=service.js.map
