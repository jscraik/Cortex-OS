import { createEnhancedClient, type EnhancedClient } from '@cortex-os/mcp-core';
import { MockMCPServer } from '@cortex-os/mcp-core/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { securityMcpTools } from './tools.js';

describe('security MCP tools integration', () => {
	let server: MockMCPServer;
	let client: EnhancedClient;

	beforeAll(async () => {
		server = await MockMCPServer.create({ transport: 'http' });
		for (const tool of securityMcpTools) {
			server.registerTool(tool.name, async (arguments_) => {
				return await tool.handler(arguments_);
			});
		}

		client = await createEnhancedClient({
			name: 'security-mcp-test-client',
			transport: 'http',
			endpoint: server.endpoint,
			requestTimeoutMs: 5_000,
		});
	});

	afterAll(async () => {
		await client.close();
		await server.stop();
	});

	it('executes access control flow through the MCP client', async () => {
		const result = (await client.callTool({
			name: 'security_access_control',
			arguments: {
				subject: {
					id: 'user-1',
					roles: ['auditor'],
				},
				resource: { id: 'dataset-1', type: 'dataset', ownerId: 'user-9' },
				action: 'read',
			},
		})) as Record<string, unknown>;

		expect(result).toMatchObject({
			metadata: expect.objectContaining({ tool: 'security_access_control' }),
			isError: false,
		});
	});

	it('propagates validation errors over MCP transport', async () => {
		const response = (await client.callTool({
			name: 'security_encryption',
			arguments: {
				operation: 'decrypt',
				data: 'deadbeef',
				secret: 'short',
			},
		})) as Record<string, unknown>;

		expect(response).toMatchObject({
			metadata: expect.objectContaining({ tool: 'security_encryption' }),
			isError: true,
			error: expect.objectContaining({ code: 'validation_error' }),
		});
	});
});
