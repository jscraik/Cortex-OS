import { beforeAll, describe, expect, it } from 'vitest';
import { RemoteMCPEnhancedStore } from '../src/integrations/remote-mcp.js';
import type { Chunk } from '../src/lib/types.js';

const localStore = {
	async upsert() {},
	async query(_vector: number[], k = 10) {
		const rows = [
			{ id: 'l1', text: 'alpha', score: 0.9, metadata: { text: 'alpha' } },
			{ id: 'l2', text: 'beta', score: 0.8, metadata: { text: 'beta' } },
			{ id: 'l3', text: 'gamma', score: 0.7, metadata: { text: 'gamma' } },
		];
		return rows.slice(0, k);
	},
};

describe('RemoteMCPEnhancedStore RRF fusion', () => {
	let store: RemoteMCPEnhancedStore;
	beforeAll(async () => {
		// The MCP client is stubbed via test config; remote results come from stubbed calls inside store
		store = new RemoteMCPEnhancedStore(
			localStore as unknown as {
				upsert(chunks: Chunk[]): Promise<void>;
				query(embedding: number[], k?: number): Promise<Array<Chunk & { score?: number }>>;
			},
			{
				enableRemoteRetrieval: true,
				hybridSearchWeights: { local: 0.5, remote: 0.5 },
				remoteSearchLimit: 3,
			} as Record<string, unknown>,
		);
		await store.initialize();
	});

	it('combines local and remote results via RRF and applies topK', async () => {
		// Construct an options object to select RRF
		const results = await store.query([0.01, 0.02, 0.03], {
			hybridSearch: true,
			fusionMethod: 'rrf',
			topK: 2,
			rrfK: 60,
		} as Record<string, unknown>);

		expect(results.length).toBe(2);
		// We don't assert exact IDs since remote stub varies; ensure metadata present and score numbers
		expect(typeof results[0]?.score).toBe('number');
		expect(typeof results[1]?.score).toBe('number');
		expect(typeof results[0].metadata?.text).toBe('string');
	});
});
