import type { ModelAdapter, ModelInvocationContext } from './adapters/base.js';
import { LangGraphHarness, type WorkflowDefinition } from './langgraph/harness.js';

export interface MasterAgentInput extends ModelInvocationContext {
	workflow: WorkflowDefinition;
	preferredProvider?: string;
}

export interface ExecutionSummary {
	output: string;
	latencyMs: number;
	provider: string;
	workflowOutput: Record<string, unknown>;
	log: readonly { nodeId: string; output: Record<string, unknown>; timestamp: number }[];
}

export interface AdapterRegistry {
	getAvailableAdapters(): Promise<ModelAdapter[]>;
	getAdapterByName(name: string): Promise<ModelAdapter | undefined>;
}

export class InMemoryAdapterRegistry implements AdapterRegistry {
	private readonly adapters: ModelAdapter[];

	constructor(adapters: ModelAdapter[]) {
		this.adapters = adapters;
	}

	async getAvailableAdapters(): Promise<ModelAdapter[]> {
		const availability = await Promise.all(
			this.adapters.map(async (adapter) => ({ adapter, available: await adapter.isAvailable() })),
		);

		return availability.filter((entry) => entry.available).map((entry) => entry.adapter);
	}

	async getAdapterByName(name: string): Promise<ModelAdapter | undefined> {
		const candidates = await this.getAvailableAdapters();
		return candidates.find((adapter) => adapter.name === name);
	}
}

export class MasterAgentExecutor {
	private readonly registry: AdapterRegistry;

	constructor(registry: AdapterRegistry) {
		this.registry = registry;
	}

	private async resolveAdapter(input: MasterAgentInput): Promise<ModelAdapter> {
		if (input.preferredProvider) {
			const preferred = await this.registry.getAdapterByName(input.preferredProvider);
			if (preferred) {
				return preferred;
			}
		}

		const [fallback] = await this.registry.getAvailableAdapters();
		if (!fallback) {
			throw new Error('brAInwav master agent has no available adapters');
		}

		return fallback;
	}

	async execute(input: MasterAgentInput): Promise<ExecutionSummary> {
		const adapter = await this.resolveAdapter(input);
		const harness = new LangGraphHarness(input.workflow);
		const workflowOutput = await harness.execute({ ...(input.variables ?? {}) });
		const inferenceResult = await adapter.invoke({
			prompt: input.prompt,
			variables: { ...input.variables, workflow: workflowOutput },
			signal: input.signal,
		});

		return {
			output: inferenceResult.output,
			latencyMs: inferenceResult.latencyMs,
			provider: inferenceResult.provider,
			workflowOutput,
			log: harness.executionLog,
		};
	}
}
