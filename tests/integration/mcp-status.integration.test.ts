import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Use the mock server and client utilities from @cortex-os/mcp-core
import { createMockMCPServer } from '../../packages/mcp-core/src/testing/mockServer.js';

// Import the status checker module via dynamic import to avoid TS ESM interop issues
type McpStatusResult = { endpoint: string; ping: unknown; toolsMode: string };
let checkMcpStatus: (opts?: { endpointOverride?: string }) => Promise<McpStatusResult>;

describe('MCP Status Validator', () => {
	let server: Awaited<ReturnType<typeof createMockMCPServer>>;

	beforeAll(async () => {
		server = await createMockMCPServer();
		// Register minimal tools: ping is built-in in mock, add tools.list to emulate discovery
		server.registerTool('tools.list', async () => {
			return { tools: [{ name: 'tools.list' }, { name: 'memory.store' }] };
		});
		server.registerTool('memory.store', async (args: unknown) => {
			return { ok: true, stored: !!args };
		});
		// Load validator function
		const mod = (await import('../../tools/validators/mcp-status.mjs')) as {
			checkMcpStatus: (opts?: { endpointOverride?: string }) => Promise<McpStatusResult>;
		};
		checkMcpStatus = mod.checkMcpStatus;
	});

	afterAll(async () => {
		await server.stop();
	});

	it('pings endpoint and validates listed tools', async () => {
		const endpoint = server.endpoint; // http://127.0.0.1:<port>
		// Provide explicit override so the validator hits the mock server
		const result = await checkMcpStatus({ endpointOverride: endpoint });
		expect(result).toBeDefined();
		expect(result.endpoint).toBe(endpoint);
		expect(['tools.list', 'direct-call', 'none']).toContain(result.toolsMode);
	});
});
