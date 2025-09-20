import { beforeAll, describe, expect, it } from 'vitest';
import { RemoteMCPEnhancedStore } from '../src/integrations/remote-mcp.js';

// Minimal local store mock
const localStore = {
	async store(_items: any[]) {
		/* noop */
	},
	async query(_vector: number[]) {
		return [
			{ id: 'local-1', text: 'local result 1', score: 0.9, metadata: { text: 'local result 1' } },
			{ id: 'local-2', text: 'local result 2', score: 0.85, metadata: { text: 'local result 2' } },
			{ id: 'local-3', text: 'local result 3', score: 0.8, metadata: { text: 'local result 3' } },
		];
	},
	async delete(_ids: string[]) {
		/* noop */
	},
};

// Fake MCP client (will be overridden by environment mock currently in AgentMCPClient)
const config: Record<string, unknown> = {
	enableRemoteRetrieval: true,
	remoteSearchLimit: 5,
	hybridSearchWeights: { local: 0.5, remote: 0.5 },
};

// NOTE: This will currently FAIL because RemoteRetrievalOptions lacks topK and the code uses options.topK

describe('RemoteMCPEnhancedStore topK handling', () => {
	let store: RemoteMCPEnhancedStore;
	beforeAll(async () => {
		store = new RemoteMCPEnhancedStore(
			localStore as unknown as {
				upsert: (chunks: Array<{ id: string; text?: string; embedding?: number[]; metadata?: Record<string, unknown> }>) => Promise<void>;
				query: (embedding: number[], k?: number) => Promise<Array<{ id: string; text?: string; score?: number; metadata?: Record<string, unknown> }>>;
				delete?: (ids: string[]) => Promise<void>;
			},
			config,
		);
		// initialization will hit mock MCP client
		await store.initialize();
	});

	it('applies topK limit when combining local + remote results', async () => {
		const vector = [0.1, 0.2, 0.3];
		const results = await store.query(vector, {
			hybridSearch: true,
			topK: 2,
		} as Record<string, unknown>);
		expect(results.length).toBe(2); // Expect trimmed to topK
	});
});
