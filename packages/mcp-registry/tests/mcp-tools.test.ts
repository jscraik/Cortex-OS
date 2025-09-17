/**
 * Unit tests for MCP Registry tools
 *
 * Tests all MCP tool functionality including validation, error handling,
 * and integration with the underlying fs-store.
 */

import {
	beforeEach,
	describe,
	expect,
	it,
	type MockedFunction,
	vi,
} from 'vitest';
import * as fsStore from '../src/fs-store.js';
import {
	MAX_SERVERS_LIST_LIMIT,
	registryGetTool,
	registryListTool,
	registryMcpTools,
	registryRegisterTool,
	registryStatsTool,
	registryUnregisterTool,
} from '../src/mcp/tools.js';

// Mock the fs-store functions
vi.mock('../src/fs-store.js', () => ({
	readAll: vi.fn(),
	upsert: vi.fn(),
	remove: vi.fn(),
}));

const mockedReadAll = fsStore.readAll as MockedFunction<typeof fsStore.readAll>;
const mockedUpsert = fsStore.upsert as MockedFunction<typeof fsStore.upsert>;
const mockedRemove = fsStore.remove as MockedFunction<typeof fsStore.remove>;

describe('MCP Registry Tools', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Registry List Tool', () => {
		it('should list all servers when no filters are provided', async () => {
			const mockServers = [
				{
					name: 'test-server-1',
					transport: 'stdio' as const,
					command: 'test-command-1',
					args: ['arg1'],
				},
				{
					name: 'test-server-2',
					transport: 'http' as const,
					endpoint: 'http://example.com',
				},
			];

			mockedReadAll.mockResolvedValue(mockServers);

			const response = await registryListTool.handler({});

			expect(response.isError).toBeFalsy();
			expect(response.metadata.tool).toBe('registry.list');

			const content = JSON.parse(response.content[0].text);
			expect(content.servers).toHaveLength(2);
			expect(content.total).toBe(2);
			expect(content.filtered).toBe(2);
			expect(content.returned).toBe(2);
		});

		it('should filter servers by name pattern', async () => {
			const mockServers = [
				{
					name: 'test-server-1',
					transport: 'stdio' as const,
					command: 'test-command-1',
				},
				{
					name: 'production-server',
					transport: 'http' as const,
					endpoint: 'http://example.com',
				},
			];

			mockedReadAll.mockResolvedValue(mockServers);

			const response = await registryListTool.handler({
				namePattern: 'test-*',
			});

			expect(response.isError).toBeFalsy();

			const content = JSON.parse(response.content[0].text);
			expect(content.servers).toHaveLength(1);
			expect(content.servers[0].name).toBe('test-server-1');
		});

		it('should filter servers by transport type', async () => {
			const mockServers = [
				{
					name: 'stdio-server',
					transport: 'stdio' as const,
					command: 'test-command',
				},
				{
					name: 'http-server',
					transport: 'http' as const,
					endpoint: 'http://example.com',
				},
			];

			mockedReadAll.mockResolvedValue(mockServers);

			const response = await registryListTool.handler({
				transport: 'stdio',
			});

			expect(response.isError).toBeFalsy();

			const content = JSON.parse(response.content[0].text);
			expect(content.servers).toHaveLength(1);
			expect(content.servers[0].name).toBe('stdio-server');
		});

		it('should filter servers by tags in name or command', async () => {
			const mockServers = [
				{
					name: 'database-server',
					transport: 'stdio' as const,
					command: 'db-handler',
				},
				{
					name: 'api-server',
					transport: 'http' as const,
					endpoint: 'http://example.com',
				},
			];

			mockedReadAll.mockResolvedValue(mockServers);

			const response = await registryListTool.handler({
				tags: ['database'],
			});

			expect(response.isError).toBeFalsy();

			const content = JSON.parse(response.content[0].text);
			expect(content.servers).toHaveLength(1);
			expect(content.servers[0].name).toBe('database-server');
		});

		it('should apply limit correctly', async () => {
			const mockServers = Array.from({ length: 10 }, (_, i) => ({
				name: `server-${i}`,
				transport: 'stdio' as const,
				command: `command-${i}`,
			}));

			mockedReadAll.mockResolvedValue(mockServers);

			const response = await registryListTool.handler({
				limit: 3,
			});

			expect(response.isError).toBeFalsy();

			const content = JSON.parse(response.content[0].text);
			expect(content.servers).toHaveLength(3);
			expect(content.total).toBe(10);
			expect(content.filtered).toBe(10);
			expect(content.returned).toBe(3);
		});

		it('should handle validation errors', async () => {
			const response = await registryListTool.handler({
				limit: MAX_SERVERS_LIST_LIMIT + 1,
			});

			expect(response.isError).toBe(true);

			const content = JSON.parse(response.content[0].text);
			expect(content.error).toBe('validation_error');
			expect(content.issues).toBeDefined();
		});
	});

	describe('Registry Register Tool', () => {
		it('should register a new stdio server', async () => {
			mockedReadAll.mockResolvedValue([]);
			mockedUpsert.mockResolvedValue(undefined);

			const serverData = {
				name: 'test-server',
				transport: 'stdio' as const,
				command: 'test-command',
				args: ['arg1', 'arg2'],
				env: { ENV_VAR: 'value' },
			};

			const response = await registryRegisterTool.handler({
				server: serverData,
				overwrite: false,
			});

			expect(response.isError).toBeFalsy();
			expect(mockedUpsert).toHaveBeenCalledWith(serverData);

			const content = JSON.parse(response.content[0].text);
			expect(content.status).toBe('created');
			expect(content.name).toBe('test-server');
		});

		it('should register a new http server', async () => {
			mockedReadAll.mockResolvedValue([]);
			mockedUpsert.mockResolvedValue(undefined);

			const serverData = {
				name: 'http-server',
				transport: 'http' as const,
				endpoint: 'http://example.com/mcp',
				headers: { Authorization: 'Bearer token' },
			};

			const response = await registryRegisterTool.handler({
				server: serverData,
				overwrite: false,
			});

			expect(response.isError).toBeFalsy();
			expect(mockedUpsert).toHaveBeenCalledWith(serverData);

			const content = JSON.parse(response.content[0].text);
			expect(content.status).toBe('created');
			expect(content.name).toBe('http-server');
		});

		it('should prevent duplicate registration without overwrite', async () => {
			const existingServer = {
				name: 'existing-server',
				transport: 'stdio' as const,
				command: 'existing-command',
			};

			mockedReadAll.mockResolvedValue([existingServer]);

			const response = await registryRegisterTool.handler({
				server: {
					name: 'existing-server',
					transport: 'stdio' as const,
					command: 'new-command',
				},
				overwrite: false,
			});

			expect(response.isError).toBe(true);

			const content = JSON.parse(response.content[0].text);
			expect(content.error).toBe('duplicate_server');
		});

		it('should allow overwrite when explicitly requested', async () => {
			const existingServer = {
				name: 'existing-server',
				transport: 'stdio' as const,
				command: 'existing-command',
			};

			mockedReadAll.mockResolvedValue([existingServer]);
			mockedUpsert.mockResolvedValue(undefined);

			const newServerData = {
				name: 'existing-server',
				transport: 'http' as const,
				endpoint: 'http://example.com',
			};

			const response = await registryRegisterTool.handler({
				server: newServerData,
				overwrite: true,
			});

			expect(response.isError).toBeFalsy();
			expect(mockedUpsert).toHaveBeenCalledWith(newServerData);

			const content = JSON.parse(response.content[0].text);
			expect(content.status).toBe('updated');
		});

		it('should validate server name format', async () => {
			const response = await registryRegisterTool.handler({
				server: {
					name: '!invalid-name!',
					transport: 'stdio' as const,
					command: 'test-command',
				},
				overwrite: false,
			});

			expect(response.isError).toBe(true);

			const content = JSON.parse(response.content[0].text);
			expect(content.error).toBe('validation_error');
		});

		it('should handle validation errors for missing required fields', async () => {
			const response = await registryRegisterTool.handler({
				server: {
					name: 'test-server',
					// missing transport
				},
				overwrite: false,
			});

			expect(response.isError).toBe(true);

			const content = JSON.parse(response.content[0].text);
			expect(content.error).toBe('validation_error');
		});
	});

	describe('Registry Unregister Tool', () => {
		it('should successfully unregister an existing server', async () => {
			mockedRemove.mockResolvedValue(true);

			const response = await registryUnregisterTool.handler({
				name: 'test-server',
			});

			expect(response.isError).toBeFalsy();
			expect(mockedRemove).toHaveBeenCalledWith('test-server');

			const content = JSON.parse(response.content[0].text);
			expect(content.status).toBe('removed');
			expect(content.name).toBe('test-server');
		});

		it('should handle removal of non-existent server', async () => {
			mockedRemove.mockResolvedValue(false);

			const response = await registryUnregisterTool.handler({
				name: 'non-existent-server',
			});

			expect(response.isError).toBe(true);

			const content = JSON.parse(response.content[0].text);
			expect(content.error).toBe('not_found');
		});

		it('should validate server name format', async () => {
			const response = await registryUnregisterTool.handler({
				name: '!invalid-name!',
			});

			expect(response.isError).toBe(true);

			const content = JSON.parse(response.content[0].text);
			expect(content.error).toBe('validation_error');
		});
	});

	describe('Registry Get Tool', () => {
		it('should retrieve an existing server', async () => {
			const mockServer = {
				name: 'test-server',
				transport: 'stdio' as const,
				command: 'test-command',
				args: ['arg1'],
				env: { ENV_VAR: 'value' },
			};

			mockedReadAll.mockResolvedValue([mockServer]);

			const response = await registryGetTool.handler({
				name: 'test-server',
			});

			expect(response.isError).toBeFalsy();

			const content = JSON.parse(response.content[0].text);
			expect(content.found).toBe(true);
			expect(content.server.name).toBe('test-server');
			expect(content.server.command).toBe('test-command');
		});

		it('should include status information when requested', async () => {
			const mockServer = {
				name: 'test-server',
				transport: 'stdio' as const,
				command: 'test-command',
			};

			mockedReadAll.mockResolvedValue([mockServer]);

			const response = await registryGetTool.handler({
				name: 'test-server',
				includeStatus: true,
			});

			expect(response.isError).toBeFalsy();

			const content = JSON.parse(response.content[0].text);
			expect(content.server.status).toBeDefined();
			expect(content.server.status.registered).toBe(true);
		});

		it('should handle non-existent server', async () => {
			mockedReadAll.mockResolvedValue([]);

			const response = await registryGetTool.handler({
				name: 'non-existent-server',
			});

			expect(response.isError).toBe(true);

			const content = JSON.parse(response.content[0].text);
			expect(content.error).toBe('not_found');
		});
	});

	describe('Registry Stats Tool', () => {
		it('should return basic statistics', async () => {
			const mockServers = [
				{
					name: 'server1',
					transport: 'stdio' as const,
					command: 'command1',
				},
				{
					name: 'server2',
					transport: 'http' as const,
					endpoint: 'http://example.com',
				},
				{
					name: 'server3',
					transport: 'stdio' as const,
					command: 'command3',
				},
			];

			mockedReadAll.mockResolvedValue(mockServers);

			const response = await registryStatsTool.handler({
				includeDetails: false,
			});

			expect(response.isError).toBeFalsy();

			const content = JSON.parse(response.content[0].text);
			expect(content.totalServers).toBe(3);
			expect(content.transportCounts).toEqual({
				stdio: 2,
				http: 1,
			});
			expect(content.lastUpdate).toBeDefined();
		});

		it('should include detailed statistics when requested', async () => {
			const mockServers = [
				{
					name: 'server1',
					transport: 'stdio' as const,
					command: 'command1',
				},
				{
					name: 'server2',
					transport: 'http' as const,
					endpoint: 'http://example.com',
				},
			];

			mockedReadAll.mockResolvedValue(mockServers);

			const response = await registryStatsTool.handler({
				includeDetails: true,
			});

			expect(response.isError).toBeFalsy();

			const content = JSON.parse(response.content[0].text);
			expect(content.details).toBeDefined();
			expect(content.details.serversByTransport).toEqual({
				stdio: ['server1'],
				http: ['server2'],
			});
			expect(content.details.averageServersPerTransport).toBe(1);
			expect(content.details.registryHealth).toBe('healthy');
		});

		it('should handle empty registry', async () => {
			mockedReadAll.mockResolvedValue([]);

			const response = await registryStatsTool.handler({
				includeDetails: false,
			});

			expect(response.isError).toBeFalsy();

			const content = JSON.parse(response.content[0].text);
			expect(content.totalServers).toBe(0);
			expect(content.transportCounts).toEqual({});
		});
	});

	describe('Tool Schema Validation', () => {
		it('should have valid tool names', () => {
			expect(registryListTool.name).toBe('registry.list');
			expect(registryRegisterTool.name).toBe('registry.register');
			expect(registryUnregisterTool.name).toBe('registry.unregister');
			expect(registryGetTool.name).toBe('registry.get');
			expect(registryStatsTool.name).toBe('registry.stats');
		});

		it('should have proper aliases', () => {
			expect(registryListTool.aliases).toContain('mcp_registry_list');
			expect(registryRegisterTool.aliases).toContain('register_server');
			expect(registryUnregisterTool.aliases).toContain('unregister_server');
		});

		it('should have descriptions', () => {
			expect(registryListTool.description).toContain(
				'List registered MCP servers',
			);
			expect(registryRegisterTool.description).toContain(
				'Register a new MCP server',
			);
			expect(registryUnregisterTool.description).toContain(
				'Unregister an MCP server',
			);
			expect(registryGetTool.description).toContain(
				'Get details of a specific',
			);
			expect(registryStatsTool.description).toContain('statistics');
		});

		it('should export all tools in the collection', () => {
			expect(registryMcpTools).toHaveLength(5);
			expect(registryMcpTools).toContain(registryListTool);
			expect(registryMcpTools).toContain(registryRegisterTool);
			expect(registryMcpTools).toContain(registryUnregisterTool);
			expect(registryMcpTools).toContain(registryGetTool);
			expect(registryMcpTools).toContain(registryStatsTool);
		});
	});

	describe('Error Handling', () => {
		it('should handle fs-store errors gracefully', async () => {
			mockedReadAll.mockRejectedValue(new Error('File system error'));

			const response = await registryListTool.handler({});

			expect(response.isError).toBe(true);

			const content = JSON.parse(response.content[0].text);
			expect(content.error).toBe('internal_error');
		});

		it('should handle upsert errors gracefully', async () => {
			mockedReadAll.mockResolvedValue([]);
			mockedUpsert.mockRejectedValue(new Error('Write error'));

			const response = await registryRegisterTool.handler({
				server: {
					name: 'test-server',
					transport: 'stdio' as const,
					command: 'test-command',
				},
				overwrite: false,
			});

			expect(response.isError).toBe(true);

			const content = JSON.parse(response.content[0].text);
			expect(content.error).toBe('internal_error');
		});

		it('should provide correlation IDs for tracking', async () => {
			mockedReadAll.mockResolvedValue([]);

			const response = await registryListTool.handler({});

			expect(response.metadata.correlationId).toBeDefined();
			expect(response.metadata.correlationId).toMatch(/^[a-f0-9-]+$/);
			expect(response.metadata.timestamp).toBeDefined();
		});
	});

	describe('Contract Invokers', () => {
		it('should have invoke methods on all tools', () => {
			expect(registryListTool.invoke).toBeDefined();
			expect(registryRegisterTool.invoke).toBeDefined();
			expect(registryUnregisterTool.invoke).toBeDefined();
			expect(registryGetTool.invoke).toBeDefined();
			expect(registryStatsTool.invoke).toBeDefined();
		});

		it('should validate input and return success result', async () => {
			const result = await registryListTool.invoke?.({
				limit: 10,
				namePattern: 'test-*',
			});

			expect(result.type).toBe('result');
			if (result.type === 'result') {
				expect(result.result.status).toBe('validated');
			}
		});

		it('should return validation error for invalid input', async () => {
			const result = await registryListTool.invoke?.({
				limit: 'invalid',
			});

			expect(result.type).toBe('error');
			if (result.type === 'error') {
				expect(result.error.code).toBe('VALIDATION_ERROR');
				expect(result.error.httpStatus).toBe(400);
			}
		});
	});
});
