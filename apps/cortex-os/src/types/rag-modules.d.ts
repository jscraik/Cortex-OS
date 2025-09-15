declare module '@cortex-os/rag-embed/python-client' {
	export class PyEmbedder {
		constructor(endpoint?: string | Record<string, unknown>);
		embed(input: unknown): Promise<unknown>;
	}
}

declare module '@cortex-os/rag-store/memory' {
	export function memoryStore(...args: unknown[]): {
		upsert(chunks: unknown[]): Promise<void>;
		query(embedding: number[], k?: number): Promise<unknown[]>;
	};
}

declare module '@cortex-os/simlab' {
	export class SimRunner {
		constructor(options?: Record<string, unknown>);
		runSimulation(config: unknown): Promise<unknown>;
	}
}
