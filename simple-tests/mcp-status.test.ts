import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createMockMCPServer } from '../packages/mcp-core/src/testing/mockServer.js';

type McpStatusResult = { endpoint: string; ping: unknown; toolsMode: string };
let checkMcpStatus: (opts?: { endpointOverride?: string }) => Promise<McpStatusResult>;

describe('MCP Status Validator (simple)', () => {
	let server: Awaited<ReturnType<typeof createMockMCPServer>>;

	beforeAll(async () => {
		server = await createMockMCPServer();
		server.registerTool('tools.list', async () => {
			return { tools: [{ name: 'tools.list' }, { name: 'memory.store' }] };
		});
		server.registerTool('memory.store', async (args: unknown) => {
			return { ok: true, stored: !!args };
		});
		const mod = (await import('../tools/validators/mcp-status.mjs')) as {
			checkMcpStatus: (opts?: { endpointOverride?: string }) => Promise<McpStatusResult>;
		};
		checkMcpStatus = mod.checkMcpStatus;
	});

	afterAll(async () => {
		await server.stop();
	});

	it('pings endpoint and validates listed tools', async () => {
		const endpoint = server.endpoint;
		const result = await checkMcpStatus({ endpointOverride: endpoint });
		expect(result).toBeDefined();
		expect(result.endpoint).toBe(endpoint);
		expect(['tools.list', 'direct-call', 'none']).toContain(result.toolsMode);
	});
});
