import type { BaseMessage } from '@langchain/core/messages';
import { type N0Budget, type N0Session, type N0State } from './n0-state.js';
export interface AgentStateLike {
	messages: BaseMessage[];
	currentAgent?: string;
	taskType?: string;
	result?: unknown;
	error?: string | undefined;
}
export interface CortexStateLike {
	messages: BaseMessage[];
	currentStep?: string;
	context?: Record<string, unknown>;
	tools?: Array<{
		name: string;
		description?: string;
	}>;
	result?: unknown;
	error?: string | undefined;
}
export interface WorkflowStateLike {
	messages?: BaseMessage[];
	prpState?: Record<string, unknown>;
	nextStep?: string;
	error?: string;
}
export interface AdapterOptions {
	budget?: N0Budget;
	overrides?: Partial<N0State>;
}
export declare function agentStateToN0(
	agentState: AgentStateLike,
	session: N0Session,
	options?: AdapterOptions,
): N0State;
export declare function cortexStateToN0(
	cortexState: CortexStateLike,
	session: N0Session,
	options?: AdapterOptions,
): N0State;
export declare function workflowStateToN0(
	workflowState: WorkflowStateLike,
	session: N0Session,
	options?: AdapterOptions,
): N0State;
//# sourceMappingURL=n0-adapters.d.ts.map
