import type { Logger } from 'winston';
import type { Agent, OrchestrationConfig, PlanningContext, Task } from './types.js';
export interface OrchestrationFacade {
	engine: {
		kind: 'langgraph';
	};
	config: OrchestrationConfig;
	run: (
		task: Task,
		agents: Agent[],
		context?: Partial<PlanningContext>,
		neurons?: unknown[],
	) => Promise<unknown>;
	shutdown: () => Promise<void>;
}
export declare function provideOrchestration(
	_config?: Partial<OrchestrationConfig>,
	_logger?: Logger,
): OrchestrationFacade;
export declare class OrchestrationService {
	private readonly service;
	constructor(service: {
		execute: (input: string) => Promise<unknown>;
	});
	handle(input: string): Promise<unknown>;
}
//# sourceMappingURL=service.d.ts.map
