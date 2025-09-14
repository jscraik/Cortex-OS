import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAgentMCPClient } from '../../../src/integrations/mcp-client.js';

describe('AgentMCPClient error branches', () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('throws when calling tool list before initialize', async () => {
		const client = createAgentMCPClient({ mcpServerUrl: 'http://x' });
		await expect(client.getAvailableTools()).rejects.toThrow(/not connected/i);
	});

	it('retries then surfaces error after max retries', async () => {
		const client = createAgentMCPClient({
			mcpServerUrl: 'http://x',
			maxRetries: 1,
		});
		// override fetch to always reject
		global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as any;
		await expect(client.initialize()).rejects.toThrow();
	});

	it('healthCheck returns false on transport error', async () => {
		const client = createAgentMCPClient({ mcpServerUrl: 'http://x' });
		// override fetch to always reject
		global.fetch = vi.fn().mockRejectedValue(new Error('boom')) as any;
		const ok = await client.healthCheck();
		expect(ok).toBe(false);
	});

	it('disconnect without initialize is safe (no fetch calls)', async () => {
		const client = createAgentMCPClient({ mcpServerUrl: 'http://x' });
		const spy = vi.spyOn(global, 'fetch');
		await client.disconnect();
		expect(spy).not.toHaveBeenCalled();
	});

	afterAll(() => {
		global.fetch = originalFetch;
	});
});
// EOF
