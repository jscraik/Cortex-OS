import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { MemoryStoreInput } from '@cortex-os/tool-spec';

export interface StoreWorkflowPersistPayload {
	id: string;
	timestamp: number;
	input: MemoryStoreInput;
}

export interface StoreWorkflowIndexPayload extends StoreWorkflowPersistPayload {}

export interface StoreWorkflowDependencies {
	generateId: () => string;
	getTimestamp: () => number;
	persistMemory: (payload: StoreWorkflowPersistPayload) => Promise<void>;
	scheduleVectorIndex: (payload: StoreWorkflowIndexPayload) => Promise<{ vectorIndexed: boolean }>;
}

export interface MemoryWorkflowEngineOptions {
	store: StoreWorkflowDependencies;
}

const StoreAnnotation = Annotation.Root({
	input: Annotation<MemoryStoreInput>({ reducer: (_prev, next) => next }),
	id: Annotation<string | undefined>({ reducer: (_prev, next) => next }),
	timestamp: Annotation<number | undefined>({ reducer: (_prev, next) => next }),
	vectorIndexed: Annotation<boolean | undefined>({ reducer: (_prev, next) => next }),
	output: Annotation<{ id: string; vectorIndexed: boolean } | undefined>({
		reducer: (_prev, next) => next,
	}),
});

type StoreState = typeof StoreAnnotation.State;

export class MemoryWorkflowEngine {
	private readonly storeApp: ReturnType<StateGraph<typeof StoreAnnotation>['compile']>;

	constructor(private readonly options: MemoryWorkflowEngineOptions) {
		const graph = new StateGraph(StoreAnnotation)
			.addNode('prepare', this.prepareStoreNode)
			.addNode('persist', this.persistStoreNode)
			.addNode('index', this.indexStoreNode)
			.addNode('finalize', async (state: StoreState) => ({
				output: {
					id: state.id!,
					vectorIndexed: state.vectorIndexed ?? false,
				},
			}))
			.addEdge(START, 'prepare')
			.addEdge('prepare', 'persist')
			.addEdge('persist', 'index')
			.addEdge('index', 'finalize')
			.addEdge('finalize', END);

		this.storeApp = graph.compile({ name: 'memory.store' });
	}

	async runStore(input: MemoryStoreInput): Promise<{ id: string; vectorIndexed: boolean }> {
		const result = await this.storeApp.invoke({
			input,
		});
		return result.output ?? {
			id: result.id!,
			vectorIndexed: result.vectorIndexed ?? false,
		};
	}

	private readonly prepareStoreNode = async (): Promise<Partial<StoreState>> => {
		const id = this.options.store.generateId();
		const timestamp = this.options.store.getTimestamp();
		return { id, timestamp };
	};

	private readonly persistStoreNode = async (state: StoreState): Promise<Partial<StoreState>> => {
		await this.options.store.persistMemory({
			id: state.id!,
			timestamp: state.timestamp!,
			input: state.input,
		});
		return {};
	};

	private readonly indexStoreNode = async (state: StoreState): Promise<Partial<StoreState>> => {
		try {
			const result = await this.options.store.scheduleVectorIndex({
				id: state.id!,
				timestamp: state.timestamp!,
				input: state.input,
			});
			return {
				vectorIndexed: result.vectorIndexed,
			};
		} catch {
			// Treat indexing failures as non-fatal while preserving execution flow
			return {
				vectorIndexed: false,
			};
		}
	};
}
