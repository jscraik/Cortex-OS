import { describe, expect, it } from 'vitest';
import { createAgentMCPClient } from '../../../src/integrations/mcp-client.js';

// Network-less tests: exercise URL building and unreachable server branch.
describe('AgentMCPClient basics', () => {
	it('builds endpoint with trailing slash normalized', async () => {
		const client = createAgentMCPClient({
			mcpServerUrl: 'http://localhost:9999/',
		});
		const ep = (client as any).buildEndpoint();
		expect(ep.endsWith('/')).toBe(true);
	});

	it('healthCheck returns false when server unreachable', async () => {
		const client = createAgentMCPClient({
			mcpServerUrl: 'http://127.0.0.1:59999',
		});
		await expect(client.initialize()).rejects.toBeTruthy();
		const healthy = await client.healthCheck();
		expect(healthy).toBe(false);
	});
});
