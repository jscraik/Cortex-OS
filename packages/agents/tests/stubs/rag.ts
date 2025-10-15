export type AgentMCPClient = {
	initialize?: () => Promise<void>;
	callTool?: (...args: unknown[]) => Promise<unknown>;
};

export type WorkflowResult = {
	content: string;
	source: string;
	metadata: Record<string, unknown>;
};

export type WorkflowHooks = {
	publishEvent?: (event: unknown) => Promise<void> | void;
	persistInsight?: (insight: unknown) => Promise<void> | void;
};

export function createAgentMCPClient(): AgentMCPClient {
	return {
		async initialize() {
			return;
		},
		async callTool() {
			return {};
		},
	};
}

export function createRagBus() {
	return {
		async publish() {
			return;
		},
		async publishEnvelope() {
			return;
		},
		async bind() {
			return async () => {
				return;
			};
		},
	};
}

export async function executeWikidataWorkflow(): Promise<WorkflowResult> {
	return {
		content: '',
		source: 'wikidata_workflow',
		metadata: { brand: 'brAInwav' },
	};
}

export const RAGEventTypes = {
	QueryExecuted: 'rag.query.executed',
	QueryCompleted: 'rag.query.completed',
	IngestStarted: 'rag.ingest.started',
	IngestCompleted: 'rag.ingest.completed',
} as const;
