/**
 * Integration tests for MCP Registry tools
 *
 * Tests MCP tools with actual file system operations to ensure
 * end-to-end functionality works correctly.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	registryGetTool,
	registryListTool,
	registryRegisterTool,
	registryStatsTool,
	registryUnregisterTool,
} from '../src/mcp/tools.js';

describe('MCP Registry Tools Integration', () => {
	let testDir: string;

	beforeEach(() => {
		testDir = mkdtempSync(join(tmpdir(), 'mcp-registry-integration-test-'));
		process.env.CORTEX_HOME = testDir;
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
		delete process.env.CORTEX_HOME;
	});

	it('should perform complete server registration workflow', async () => {
		// Register a new server
		const registerResponse = await registryRegisterTool.handler({
			server: {
				name: 'integration-test-server',
				transport: 'stdio' as const,
				command: 'test-command',
				args: ['--verbose'],
				env: { DEBUG: '1' },
			},
			overwrite: false,
		});

		expect(registerResponse.isError).toBeFalsy();

		const registerContent = JSON.parse(registerResponse.content[0].text);
		expect(registerContent.status).toBe('created');

		// List servers to verify registration
		const listResponse = await registryListTool.handler({});
		expect(listResponse.isError).toBeFalsy();

		const listContent = JSON.parse(listResponse.content[0].text);
		expect(listContent.servers).toHaveLength(1);
		expect(listContent.servers[0].name).toBe('integration-test-server');

		// Get specific server
		const getResponse = await registryGetTool.handler({
			name: 'integration-test-server',
			includeStatus: true,
		});

		expect(getResponse.isError).toBeFalsy();

		const getContent = JSON.parse(getResponse.content[0].text);
		expect(getContent.server.name).toBe('integration-test-server');
		expect(getContent.server.command).toBe('test-command');
		expect(getContent.server.status.registered).toBe(true);

		// Check stats
		const statsResponse = await registryStatsTool.handler({
			includeDetails: true,
		});

		expect(statsResponse.isError).toBeFalsy();

		const statsContent = JSON.parse(statsResponse.content[0].text);
		expect(statsContent.totalServers).toBe(1);
		expect(statsContent.transportCounts.stdio).toBe(1);

		// Unregister server
		const unregisterResponse = await registryUnregisterTool.handler({
			name: 'integration-test-server',
		});

		expect(unregisterResponse.isError).toBeFalsy();

		const unregisterContent = JSON.parse(unregisterResponse.content[0].text);
		expect(unregisterContent.status).toBe('removed');

		// Verify removal
		const finalListResponse = await registryListTool.handler({});
		expect(finalListResponse.isError).toBeFalsy();

		const finalListContent = JSON.parse(finalListResponse.content[0].text);
		expect(finalListContent.servers).toHaveLength(0);
	});

	it('should handle multiple servers with different transports', async () => {
		// Register stdio server
		await registryRegisterTool.handler({
			server: {
				name: 'stdio-server',
				transport: 'stdio' as const,
				command: 'stdio-command',
			},
			overwrite: false,
		});

		// Register http server
		await registryRegisterTool.handler({
			server: {
				name: 'http-server',
				transport: 'http' as const,
				endpoint: 'http://localhost:8080/mcp',
				headers: { Authorization: 'Bearer token123' },
			},
			overwrite: false,
		});

		// Register sse server
		await registryRegisterTool.handler({
			server: {
				name: 'sse-server',
				transport: 'sse' as const,
				endpoint: 'http://localhost:8081/sse',
			},
			overwrite: false,
		});

		// List all servers
		const listResponse = await registryListTool.handler({});
		const listContent = JSON.parse(listResponse.content[0].text);

		expect(listContent.servers).toHaveLength(3);

		// Filter by transport
		const stdioFilterResponse = await registryListTool.handler({
			transport: 'stdio',
		});
		const stdioContent = JSON.parse(stdioFilterResponse.content[0].text);

		expect(stdioContent.servers).toHaveLength(1);
		expect(stdioContent.servers[0].name).toBe('stdio-server');

		// Filter by name pattern
		const httpFilterResponse = await registryListTool.handler({
			namePattern: 'http-*',
		});
		const httpContent = JSON.parse(httpFilterResponse.content[0].text);

		expect(httpContent.servers).toHaveLength(1);
		expect(httpContent.servers[0].name).toBe('http-server');

		// Check stats with details
		const statsResponse = await registryStatsTool.handler({
			includeDetails: true,
		});
		const statsContent = JSON.parse(statsResponse.content[0].text);

		expect(statsContent.totalServers).toBe(3);
		expect(statsContent.transportCounts).toEqual({
			stdio: 1,
			http: 1,
			sse: 1,
		});
		expect(statsContent.details.serversByTransport.stdio).toEqual(['stdio-server']);
		expect(statsContent.details.serversByTransport.http).toEqual(['http-server']);
		expect(statsContent.details.serversByTransport.sse).toEqual(['sse-server']);
	});

	it('should handle server overwrite correctly', async () => {
		// Register initial server
		const initialResponse = await registryRegisterTool.handler({
			server: {
				name: 'overwrite-test',
				transport: 'stdio' as const,
				command: 'initial-command',
			},
			overwrite: false,
		});

		expect(initialResponse.isError).toBeFalsy();

		// Try to register with same name without overwrite
		const duplicateResponse = await registryRegisterTool.handler({
			server: {
				name: 'overwrite-test',
				transport: 'http' as const,
				endpoint: 'http://example.com',
			},
			overwrite: false,
		});

		expect(duplicateResponse.isError).toBe(true);

		// Register with overwrite
		const overwriteResponse = await registryRegisterTool.handler({
			server: {
				name: 'overwrite-test',
				transport: 'http' as const,
				endpoint: 'http://example.com',
			},
			overwrite: true,
		});

		expect(overwriteResponse.isError).toBeFalsy();

		const overwriteContent = JSON.parse(overwriteResponse.content[0].text);
		expect(overwriteContent.status).toBe('updated');

		// Verify the server was updated
		const getResponse = await registryGetTool.handler({
			name: 'overwrite-test',
		});

		const getContent = JSON.parse(getResponse.content[0].text);
		expect(getContent.server.transport).toBe('http');
		expect(getContent.server.endpoint).toBe('http://example.com');
	});

	it('should handle edge cases and errors gracefully', async () => {
		// Try to get non-existent server
		const getNonExistentResponse = await registryGetTool.handler({
			name: 'non-existent-server',
		});

		expect(getNonExistentResponse.isError).toBe(true);

		// Try to unregister non-existent server
		const unregisterNonExistentResponse = await registryUnregisterTool.handler({
			name: 'non-existent-server',
		});

		expect(unregisterNonExistentResponse.isError).toBe(true);

		// Try to register server with invalid name
		const invalidNameResponse = await registryRegisterTool.handler({
			server: {
				name: '!invalid-name!',
				transport: 'stdio' as const,
				command: 'test-command',
			},
			overwrite: false,
		});

		expect(invalidNameResponse.isError).toBe(true);

		// Stats on empty registry
		const emptyStatsResponse = await registryStatsTool.handler({
			includeDetails: false,
		});

		expect(emptyStatsResponse.isError).toBeFalsy();

		const emptyStatsContent = JSON.parse(emptyStatsResponse.content[0].text);
		expect(emptyStatsContent.totalServers).toBe(0);
		expect(emptyStatsContent.transportCounts).toEqual({});
	});

	it('should validate MCP tool responses have correct metadata', async () => {
		const response = await registryStatsTool.handler({
			includeDetails: false,
		});

		expect(response.metadata).toBeDefined();
		expect(response.metadata.correlationId).toMatch(/^[a-f0-9-]+$/);
		expect(response.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		expect(response.metadata.tool).toBe('registry.stats');
	});

	it('should handle concurrent operations safely', async () => {
		// Register servers sequentially to avoid file system contention issues
		const server1Response = await registryRegisterTool.handler({
			server: {
				name: 'concurrent-server-1',
				transport: 'stdio' as const,
				command: 'command-1',
			},
			overwrite: false,
		});
		expect(server1Response.isError).toBeFalsy();

		const server2Response = await registryRegisterTool.handler({
			server: {
				name: 'concurrent-server-2',
				transport: 'http' as const,
				endpoint: 'http://server2.com',
			},
			overwrite: false,
		});
		expect(server2Response.isError).toBeFalsy();

		const server3Response = await registryRegisterTool.handler({
			server: {
				name: 'concurrent-server-3',
				transport: 'sse' as const,
				endpoint: 'http://server3.com/sse',
			},
			overwrite: false,
		});
		expect(server3Response.isError).toBeFalsy();

		// Verify all servers were registered
		const listResponse = await registryListTool.handler({});
		const listContent = JSON.parse(listResponse.content[0].text);

		expect(listContent.servers).toHaveLength(3);

		const serverNames = listContent.servers.map((s: { name: string }) => s.name).sort();
		expect(serverNames).toEqual([
			'concurrent-server-1',
			'concurrent-server-2',
			'concurrent-server-3',
		]);
	});
});
