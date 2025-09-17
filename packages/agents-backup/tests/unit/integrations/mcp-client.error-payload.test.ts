import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createAgentMCPClient } from '../../../src/integrations/mcp-client.js';

// This test targets the branch inside executeRequest where HTTP ok but the JSON-RPC body
// contains an error object -> mapped to success:false with error message.
// We assert upstream wrapper (getAvailableTools) surfaces a thrown Error.

describe('AgentMCPClient JSON-RPC error payload branch', () => {
	let originalFetch: typeof fetch;

	beforeAll(() => {
		originalFetch = global.fetch as typeof fetch;
		global.fetch = vi.fn(async () => {
			// Always return HTTP 200 with an error-shaped JSON-RPC response
			return {
				ok: true,
				json: async () => ({
					jsonrpc: '2.0',
					id: 1,
					error: { code: -32000, message: 'Upstream failure' },
				}),
			} as any;
		}) as any;
	});

	afterAll(() => {
		global.fetch = originalFetch;
	});

	it('surfaces JSON-RPC error from list tools call', async () => {
		const client = createAgentMCPClient({
			mcpServerUrl: 'http://fake-host:9999',
		});
		// First initialize will also receive error payload and throw
		await expect(client.initialize()).rejects.toThrow(
			/Upstream failure|MCP initialization failed/i,
		);
		// isConnected remains false, subsequent getAvailableTools should still fail fast on ensureConnected
		await expect(client.getAvailableTools()).rejects.toThrow(/not connected/i);
	});
});

// EOF
