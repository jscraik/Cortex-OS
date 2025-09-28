import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mergeN0State, type N0State, N0StateSchema } from './n0-state.js';

export type MultiAgentEventType =
	| 'langgraph.state_shared'
	| 'langgraph.agent_handoff'
	| 'langgraph.workflow_completed';

export interface MultiAgentEvent {
	type: MultiAgentEventType;
	source: string;
	target?: string;
	payload: Record<string, unknown>;
	coordinationId: string;
	timestamp: string;
	branding: 'brAInwav';
}

export interface MultiAgentEventPublisher {
	publish(event: MultiAgentEvent): void | Promise<void>;
}

export interface LangGraphRunner<Result = unknown> {
	invoke(input: unknown): Promise<Result>;
}

export interface RegisterWorkflowOptions {
	id: string;
	graph: LangGraphRunner;
	initialState: N0State;
	service?: string;
	metadata?: Record<string, unknown>;
}

export interface StateSharedEvent {
	source: string;
	target: string;
	state: N0State;
	coordinationId: string;
}

export interface AgentHandoffRecord {
	from: string;
	to: string;
	coordinationId: string;
	timestamp: string;
	reason?: string;
	payload?: Record<string, unknown>;
}

export interface WorkflowCompletedEvent {
	id: string;
	service?: string;
	state: N0State;
	output?: string;
	coordinationId: string;
}

export interface DistributedWorkflowRequest {
	id: string;
	input: string;
	metadata?: Record<string, unknown>;
}

export interface DistributedWorkflowResult {
	id: string;
	output?: string;
	service?: string;
	state: N0State;
	coordinationId: string;
}

export interface MultiAgentCoordinatorMetrics {
	stateShares: number;
	agentHandoffs: number;
	workflowsCompleted: number;
	activeWorkflows: number;
}

export interface MultiAgentCoordinatorOptions {
	eventPublisher?: MultiAgentEventPublisher;
	clock?: () => Date;
}

interface RegisteredWorkflow {
	id: string;
	graph: LangGraphRunner;
	state: N0State;
	service?: string;
	metadata?: Record<string, unknown>;
	lastUpdated: Date;
	handoffs: AgentHandoffRecord[];
}

export class MultiAgentCoordinator extends EventEmitter {
	private readonly workflows = new Map<string, RegisteredWorkflow>();

	private readonly metrics: MultiAgentCoordinatorMetrics = {
		stateShares: 0,
		agentHandoffs: 0,
		workflowsCompleted: 0,
		activeWorkflows: 0,
	};

	private readonly globalHandoffHistory: AgentHandoffRecord[] = [];

	private readonly publisher?: MultiAgentEventPublisher;

	private readonly clock: () => Date;

	constructor(options: MultiAgentCoordinatorOptions = {}) {
		super();
		this.publisher = options.eventPublisher;
		this.clock = options.clock ?? (() => new Date());
	}

	registerWorkflow(options: RegisterWorkflowOptions): void {
		if (this.workflows.has(options.id)) {
			throw new Error(
				`brAInwav coordinator: workflow with id "${options.id}" is already registered`,
			);
		}

		const workflow: RegisteredWorkflow = {
			id: options.id,
			graph: options.graph,
			state: cloneState(options.initialState),
			service: options.service,
			metadata: options.metadata ? { ...options.metadata } : undefined,
			lastUpdated: this.clock(),
			handoffs: [],
		};

		this.workflows.set(options.id, workflow);
		this.metrics.activeWorkflows = this.workflows.size;
	}

	getWorkflowState(id: string): N0State {
		const workflow = this.getWorkflow(id);
		return cloneState(workflow.state);
	}

	getMetrics(): MultiAgentCoordinatorMetrics {
		return { ...this.metrics };
	}

	getHandoffHistory(workflowId?: string): AgentHandoffRecord[] {
		if (workflowId) {
			const workflow = this.getWorkflow(workflowId);
			return workflow.handoffs.map((entry) => ({ ...entry }));
		}
		return this.globalHandoffHistory.map((entry) => ({ ...entry }));
	}

	async shareState(sourceId: string, targetId: string, patch: Partial<N0State>): Promise<N0State> {
		const source = this.getWorkflow(sourceId);
		const target = this.getWorkflow(targetId);

		const updatedState = mergeN0State(target.state, patch);
		target.state = updatedState;
		target.lastUpdated = this.clock();
		this.metrics.stateShares += 1;

		const coordinationId = this.createCoordinationId(sourceId, targetId);
		const event: StateSharedEvent = {
			source: source.id,
			target: target.id,
			state: cloneState(updatedState),
			coordinationId,
		};

		this.emit('stateShared', event);
		await this.publish({
			type: 'langgraph.state_shared',
			source: source.id,
			target: target.id,
			payload: {
				patch,
				resultingContext: updatedState.ctx ?? {},
				service: target.service,
			},
			coordinationId,
			timestamp: this.clock().toISOString(),
			branding: 'brAInwav',
		});

		return event.state;
	}

	async handoffAgent(
		fromId: string,
		toId: string,
		details: {
			reason?: string;
			payload?: Record<string, unknown>;
		} = {},
	): Promise<AgentHandoffRecord> {
		const from = this.getWorkflow(fromId);
		const to = this.getWorkflow(toId);

		const timestamp = this.clock().toISOString();
		const coordinationId = this.createCoordinationId(fromId, toId);

		const record: AgentHandoffRecord = {
			from: from.id,
			to: to.id,
			coordinationId,
			timestamp,
			reason: details.reason,
			payload: details.payload ? { ...details.payload } : undefined,
		};

		to.state = mergeN0State(to.state, {
			ctx: {
				...(to.state.ctx ?? {}),
				lastHandoff: {
					from: from.id,
					timestamp,
					reason: details.reason,
					payload: details.payload,
				},
			},
		});
		to.lastUpdated = this.clock();

		from.handoffs.push(record);
		to.handoffs.push(record);
		this.globalHandoffHistory.push(record);
		this.metrics.agentHandoffs += 1;

		this.emit('agentHandoff', {
			...record,
			state: cloneState(to.state),
		});

		await this.publish({
			type: 'langgraph.agent_handoff',
			source: from.id,
			target: to.id,
			payload: {
				reason: details.reason,
				payload: details.payload ?? {},
				service: to.service,
			},
			coordinationId,
			timestamp,
			branding: 'brAInwav',
		});

		return { ...record };
	}

	async coordinateWorkflows(
		inputs: Record<string, { input: string; metadata?: Record<string, unknown> }>,
	): Promise<Record<string, { output?: string; state: N0State; coordinationId: string }>> {
		const requests: DistributedWorkflowRequest[] = Object.entries(inputs).map(([id, value]) => ({
			id,
			input: value.input,
			metadata: value.metadata,
		}));
		const results = await this.coordinateDistributedWorkflows(requests);
		return results.reduce<
			Record<string, { output?: string; state: N0State; coordinationId: string }>
		>((acc, result) => {
			acc[result.id] = {
				output: result.output,
				state: result.state,
				coordinationId: result.coordinationId,
			};
			return acc;
		}, {});
	}

	async coordinateDistributedWorkflows(
		requests: DistributedWorkflowRequest[],
	): Promise<DistributedWorkflowResult[]> {
		const executions = await Promise.all(
			requests.map(async (request) => {
				const workflow = this.getWorkflow(request.id);
				if (request.metadata) {
					workflow.metadata = {
						...(workflow.metadata ?? {}),
						...request.metadata,
					};
				}

				const output = await this.runWorkflow(workflow, request.input);
				const coordinationId = this.createCoordinationId(
					workflow.id,
					workflow.service ?? workflow.id,
				);
				const result: DistributedWorkflowResult = {
					id: workflow.id,
					output,
					service: workflow.service,
					state: cloneState(workflow.state),
					coordinationId,
				};

				this.emit('workflowCompleted', result);
				await this.publish({
					type: 'langgraph.workflow_completed',
					source: workflow.service ?? workflow.id,
					target: workflow.id,
					payload: {
						output,
						metadata: workflow.metadata ?? {},
					},
					coordinationId,
					timestamp: this.clock().toISOString(),
					branding: 'brAInwav',
				});

				return result;
			}),
		);

		return executions;
	}

	private async runWorkflow(
		workflow: RegisteredWorkflow,
		input: string,
	): Promise<string | undefined> {
		const rawResult = await workflow.graph.invoke({ input });
		const output = normalizeOutput(rawResult);

		workflow.state = mergeN0State(workflow.state, {
			input,
			output,
			ctx: {
				...(workflow.state.ctx ?? {}),
				lastResult: rawResult,
				service: workflow.service,
			},
		});
		workflow.lastUpdated = this.clock();
		this.metrics.workflowsCompleted += 1;

		return output;
	}

	private getWorkflow(id: string): RegisteredWorkflow {
		const workflow = this.workflows.get(id);
		if (!workflow) {
			throw new Error(`brAInwav coordinator: unknown workflow "${id}"`);
		}
		return workflow;
	}

	private createCoordinationId(source: string, target: string): string {
		return `${source}:${target}:${randomUUID()}`;
	}

	private async publish(event: MultiAgentEvent): Promise<void> {
		if (!this.publisher) return;
		await this.publisher.publish(event);
	}
}

function cloneState(state: N0State): N0State {
	const raw =
		typeof structuredClone === 'function'
			? structuredClone(state)
			: JSON.parse(JSON.stringify(state));
	return N0StateSchema.parse(raw);
}

function normalizeOutput(result: unknown): string | undefined {
	if (typeof result === 'string') {
		return result;
	}

	if (typeof result === 'number' || typeof result === 'boolean') {
		return String(result);
	}

	if (result && typeof result === 'object') {
		const output = (result as Record<string, unknown>).output;
		if (typeof output === 'string') {
			return output;
		}
		if (output !== undefined) {
			return JSON.stringify(output);
		}
	}

	return undefined;
}
