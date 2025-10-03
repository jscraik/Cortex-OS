import type { Agent, OrchestrationStrategy, PlanningContext, Task } from '../types.js';
export interface WorkflowExecutionPayload {
	cacheKey: string;
	workflowId: string;
	task: Task;
	agents: Agent[];
	planningContext: Partial<PlanningContext>;
	metadata: Record<string, unknown>;
}
export interface WorkflowExecutionResult {
	result: unknown;
	fromCache: boolean;
}
export type OrchestrationMcpConfig = {
	cacheTtlMs: number;
	cacheSize: number;
	rateLimit: {
		maxConcurrent: number;
		windowMs: number;
	};
};
declare class RateLimitError extends Error {
	readonly retryInMs: number;
	constructor(retryInMs: number);
}
export declare function executeWorkflowThroughCore(
	payload: WorkflowExecutionPayload,
): Promise<WorkflowExecutionResult>;
export declare function configureOrchestrationMcp(
	overrides?: Partial<OrchestrationMcpConfig> & {
		rateLimit?: Partial<OrchestrationMcpConfig['rateLimit']>;
	},
): void;
export declare function __resetOrchestrationMcpState(): void;
export declare function getDefaultOrchestrationPlanningContext(
	strategy: OrchestrationStrategy,
	estimatedDuration: number,
	agents: Agent[],
): Partial<PlanningContext>;
export { RateLimitError };
//# sourceMappingURL=core-adapter.d.ts.map
