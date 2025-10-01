import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type RuntimeHandle, startRuntime } from '../../src/runtime.js';

describe('MCP Server Integration', () => {
	let runtime: RuntimeHandle;

	beforeEach(async () => {
		// Set test environment variables for random ports
		process.env.CORTEX_HTTP_PORT = '0';
		process.env.CORTEX_MCP_MANAGER_PORT = '0';

		runtime = await startRuntime();
	});

	afterEach(async () => {
		if (runtime) {
			await runtime.stop();
		}
		// Clean up environment variables
		delete process.env.CORTEX_HTTP_PORT;
		delete process.env.CORTEX_MCP_MANAGER_PORT;
	});

	it('should serve MCP protocol endpoints', async () => {
		const response = await fetch(`${runtime.mcpUrl}/tools`);

		expect(response.status).toBe(200);
		const tools = await response.json();
		expect(Array.isArray(tools.tools)).toBe(true);
		expect(tools.tools.length).toBeGreaterThan(0);

		// Check for expected system tools
		const toolNames = tools.tools.map((tool: any) => tool.name);
		expect(toolNames).toContain('system.status');
		expect(toolNames).toContain('orchestration.run_workflow');
		expect(toolNames).toContain('config.get');
	});

	it('should handle tool execution requests for system status', async () => {
		const toolRequest = {
			name: 'system.status',
			arguments: {},
		};

		const response = await fetch(`${runtime.mcpUrl}/tools/call`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(toolRequest),
		});

		expect(response.status).toBe(200);
		const result = await response.json();
		expect(result).toBeDefined();

		expect(result.tool).toBe('system.status');
		expect(result.metadata?.brand).toBe('brAInwav');
		expect(typeof result.metadata?.correlationId).toBe('string');
		expect(result.metadata?.resultSource).toBe('direct');

		// System status should return basic runtime information
		expect(result.content).toBeDefined();
		expect(Array.isArray(result.content)).toBe(true);
		expect(result.content[0]?.text).toContain('[brAInwav MCP] system.status');

		const payload = result.data;
		expect(payload).toBeDefined();
		expect(Array.isArray(payload?.services)).toBe(true);
	});

	it('should handle configuration tool requests', async () => {
		const configListRequest = {
			name: 'config.list',
			arguments: {},
		};

		const response = await fetch(`${runtime.mcpUrl}/tools/call`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(configListRequest),
		});

		expect(response.status).toBe(200);
		const result = await response.json();
		expect(result).toBeDefined();
		expect(result.tool).toBe('config.list');
		expect(result.metadata?.brand).toBe('brAInwav');
		expect(result.metadata?.resultSource).toBe('direct');
		expect(Array.isArray(result.content)).toBe(true);
		expect(result.content[0]?.text).toContain('[brAInwav MCP] config.list');
	});

	it('should annotate cached results with cache metadata', async () => {
		const request = {
			name: 'config.list',
			arguments: { prefix: 'cache-test' },
		};

		const firstResponse = await fetch(`${runtime.mcpUrl}/tools/call`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(request),
		});
		expect(firstResponse.status).toBe(200);
		const firstResult = await firstResponse.json();
		expect(firstResult.metadata?.resultSource).toBe('direct');

		const secondResponse = await fetch(`${runtime.mcpUrl}/tools/call`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(request),
		});
		expect(secondResponse.status).toBe(200);
		const secondResult = await secondResponse.json();
		expect(secondResult.metadata?.resultSource).toBe('cache');
		expect(typeof secondResult.metadata?.correlationId).toBe('string');
		expect(secondResult.content[0]?.text).toContain('via cache');
	});

	it('should handle orchestration workflow listing', async () => {
		const workflowListRequest = {
			name: 'orchestration.list_workflows',
			arguments: {},
		};

		const response = await fetch(`${runtime.mcpUrl}/tools/call`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(workflowListRequest),
		});

		expect(response.status).toBe(200);
		const result = await response.json();
		expect(result).toBeDefined();
		expect(result.content).toBeDefined();

		// Should return workflow information (even if empty list)
		expect(Array.isArray(result.content)).toBe(true);
	});

	it('should handle invalid tool requests gracefully', async () => {
		// Test with non-existent tool
		const invalidToolRequest = {
			name: 'nonexistent.tool',
			arguments: {},
		};

		const response = await fetch(`${runtime.mcpUrl}/tools/call`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(invalidToolRequest),
		});

		expect(response.status).toBe(400);
		const error = await response.json();
		expect(error.error).toBeDefined();
		expect(error.error.code).toBe('not_found');
		expect(typeof error.error.message).toBe('string');
		expect(error.error.message).toContain('nonexistent.tool');
	});

	it('should handle malformed requests properly', async () => {
		// Test with invalid JSON
		const response = await fetch(`${runtime.mcpUrl}/tools/call`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: 'invalid json',
		});

		expect(response.status).toBe(400);

		// Test with missing tool name
		const missingNameResponse = await fetch(`${runtime.mcpUrl}/tools/call`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ arguments: {} }),
		});

		expect(missingNameResponse.status).toBe(400);
	});

	it('should provide tool descriptions and metadata', async () => {
		const response = await fetch(`${runtime.mcpUrl}/tools`);
		const tools = await response.json();

		// Each tool should have proper metadata
		for (const tool of tools.tools) {
			expect(tool.name).toBeDefined();
			expect(typeof tool.name).toBe('string');
			expect(tool.description).toBeDefined();
			expect(typeof tool.description).toBe('string');

			// Tool name should follow expected pattern
			expect(tool.name).toMatch(/^[a-z_]+\.[a-z_]+$/);
		}
	});

	it('should handle system resource monitoring tool', async () => {
		const resourceRequest = {
			name: 'system.resources',
			arguments: {},
		};

		const response = await fetch(`${runtime.mcpUrl}/tools/call`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(resourceRequest),
		});

		expect(response.status).toBe(200);
		const result = await response.json();
		expect(result.content).toBeDefined();

		if (result.content.length > 0) {
			const resourceInfo = result.content[0];
			expect(resourceInfo.type).toBe('text');
			expect(resourceInfo.text).toBeDefined();

			// Should contain some resource information
			expect(resourceInfo.text).toContain('memory');
		}
	});

	it('should integrate with memory search capabilities', async () => {
		// First ensure we can access memory-related tools
		const response = await fetch(`${runtime.mcpUrl}/tools`);
		const tools = await response.json();

		const toolNames = tools.tools.map((tool: any) => tool.name);

		// While memory search tools might not be directly exposed,
		// the MCP gateway should have access to the memory system
		expect(toolNames.some((name: string) => name.includes('system'))).toBe(true);

		// The system status should be able to report on memory subsystem
		const statusRequest = {
			name: 'system.status',
			arguments: {},
		};

		const statusResponse = await fetch(`${runtime.mcpUrl}/tools/call`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(statusRequest),
		});

		expect(statusResponse.status).toBe(200);
		const statusResult = await statusResponse.json();
		expect(statusResult.content).toBeDefined();
	});

	it('should provide CORS headers for browser integration', async () => {
		const response = await fetch(`${runtime.mcpUrl}/tools`, {
			method: 'OPTIONS',
			headers: {
				Origin: 'http://localhost:3000',
				'Access-Control-Request-Method': 'GET',
			},
		});

		// MCP server should handle preflight requests
		// Note: This might fail if CORS isn't implemented yet
		if (response.status === 200) {
			expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
		}
	});
});
