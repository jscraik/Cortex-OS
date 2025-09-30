export interface WorkflowNode {
	id: string;
	run(input: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface WorkflowDefinition {
	name: string;
	nodes: WorkflowNode[];
}

export interface ExecutionLogEntry {
	nodeId: string;
	output: Record<string, unknown>;
	timestamp: number;
}

export class LangGraphHarness {
	private readonly definition: WorkflowDefinition;
	private readonly log: ExecutionLogEntry[] = [];
	private readonly clock: () => number;

	constructor(definition: WorkflowDefinition, clock: () => number = () => Date.now()) {
		if (definition.nodes.length === 0) {
			throw new Error('brAInwav LangGraph harness requires at least one node');
		}

		this.definition = definition;
		this.clock = clock;
	}

	get executionLog(): readonly ExecutionLogEntry[] {
		return this.log;
	}

	async execute(initialInput: Record<string, unknown>): Promise<Record<string, unknown>> {
		let payload = initialInput;

		for (const node of this.definition.nodes) {
			const output = await node.run(payload);
			this.log.push({
				nodeId: node.id,
				output,
				timestamp: this.clock(),
			});
			payload = { ...payload, ...output };
		}

		return payload;
	}
}
