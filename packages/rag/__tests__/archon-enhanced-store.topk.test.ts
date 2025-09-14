import { beforeAll, describe, expect, it } from 'vitest';
import { ArchonEnhancedStore } from '../src/integrations/archon-mcp.js';

// Minimal local store mock
const localStore = {
    async store(_items: any[]) {
        /* noop */
    },
    async query(_vector: number[]) {
        return [
            { id: 'local-1', score: 0.9, metadata: { text: 'local result 1' } },
            { id: 'local-2', score: 0.85, metadata: { text: 'local result 2' } },
            { id: 'local-3', score: 0.8, metadata: { text: 'local result 3' } },
        ];
    },
    async delete(_ids: string[]) {
        /* noop */
    },
};

// Fake MCP client (will be overridden by environment mock currently in AgentMCPClient)
const config: any = {
    enableRemoteRetrieval: true,
    remoteSearchLimit: 5,
    hybridSearchWeights: { local: 0.5, remote: 0.5 },
};

// NOTE: This will currently FAIL because RemoteRetrievalOptions lacks topK and the code uses options.topK

describe('ArchonEnhancedStore topK handling', () => {
    let store: ArchonEnhancedStore;
    beforeAll(async () => {
        store = new ArchonEnhancedStore(localStore as any, config);
        // initialization will hit mock MCP client
        await store.initialize();
    });

    it('applies topK limit when combining local + remote results', async () => {
        const vector = [0.1, 0.2, 0.3];
        const results = await store.query(vector, {
            hybridSearch: true,
            topK: 2,
        } as any);
        expect(results.length).toBe(2); // Expect trimmed to topK
    });
});
