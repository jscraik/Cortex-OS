import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type RuntimeHandle, startRuntime } from '../../src/runtime.js';

describe('brAInwav MCP Basic Functionality', () => {
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

	it('should serve MCP tools list endpoint', async () => {
		const response = await fetch(`${runtime.mcpUrl}/tools`);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('application/json');

		const tools = await response.json();
		expect(tools).toHaveProperty('tools');
		expect(Array.isArray(tools.tools)).toBe(true);
		expect(tools.tools.length).toBeGreaterThan(0);
	});

	it('should provide system and orchestration tools', async () => {
		const response = await fetch(`${runtime.mcpUrl}/tools`);
		const tools = await response.json();

		const toolNames = tools.tools.map((tool: any) => tool.name);

		// Check for expected system tools
		expect(toolNames).toContain('system.status');
		expect(toolNames).toContain('system.restart_service');
		expect(toolNames).toContain('system.resources');

		// Check for orchestration tools
		expect(toolNames).toContain('orchestration.run_workflow');
		expect(toolNames).toContain('orchestration.get_workflow_status');
		expect(toolNames).toContain('orchestration.list_workflows');

		// Check for config tools
		expect(toolNames).toContain('config.get');
		expect(toolNames).toContain('config.set');
		expect(toolNames).toContain('config.list');
	});

	it('should provide proper tool metadata', async () => {
		const response = await fetch(`${runtime.mcpUrl}/tools`);
		const tools = await response.json();

		// Each tool should have proper structure
		for (const tool of tools.tools) {
			expect(tool).toHaveProperty('name');
			expect(tool).toHaveProperty('description');

			expect(typeof tool.name).toBe('string');
			expect(typeof tool.description).toBe('string');

			// Tool names should follow dot notation
			expect(tool.name).toMatch(/^[a-z_]+\.[a-z_]+$/);
			expect(tool.description.length).toBeGreaterThan(0);
		}
	});

	it('should return 404 for non-existent endpoints', async () => {
		const response = await fetch(`${runtime.mcpUrl}/nonexistent`);
		expect(response.status).toBe(404);
	});

	it('should handle malformed requests gracefully', async () => {
		// Test with unsupported method
		const response = await fetch(`${runtime.mcpUrl}/tools`, {
			method: 'POST',
		});
		expect(response.status).toBe(404);
	});

	it('should provide tools with expected categories', async () => {
		const response = await fetch(`${runtime.mcpUrl}/tools`);
		const tools = await response.json();

		const toolsByCategory = tools.tools.reduce((acc: Record<string, any[]>, tool: any) => {
			const category = tool.name.split('.')[0];
			if (!acc[category]) acc[category] = [];
			acc[category].push(tool);
			return acc;
		}, {});

		// Should have system category
		expect(toolsByCategory.system).toBeDefined();
		expect(toolsByCategory.system.length).toBeGreaterThan(0);

		// Should have orchestration category
		expect(toolsByCategory.orchestration).toBeDefined();
		expect(toolsByCategory.orchestration.length).toBeGreaterThan(0);

		// Should have config category
		expect(toolsByCategory.config).toBeDefined();
		expect(toolsByCategory.config.length).toBeGreaterThan(0);
	});
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
// Co-authored-by: brAInwav Development Team
