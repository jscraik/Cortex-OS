import { describe, expect, it } from 'vitest';
import { SimplePRPGraph } from '../src/graph-simple.js';
import { MCPAdapter } from '../src/mcp/adapter.js';

describe('Type Safety Fixes', () => {
	it('should create valid SubAgent objects from MCP tools', () => {
		const adapter = new MCPAdapter();
		const mockTool = {
			name: 'test-tool',
			description: 'Test tool',
			inputSchema: { type: 'object' },
			execute: async () => ({ result: 'success' }),
		};

		const subAgent = adapter.createNeuronFromTool(mockTool, 'strategy');

		// All required properties should exist
		expect(subAgent).toHaveProperty('id');
		expect(subAgent).toHaveProperty('role');
		expect(subAgent).toHaveProperty('phase');
		expect(subAgent).toHaveProperty('dependencies');
		expect(subAgent).toHaveProperty('tools');
		expect(subAgent).toHaveProperty('execute');
		expect(typeof subAgent.execute).toBe('function');
	});

	it('should match PRPOrchestrator interface from prp-runner', () => {
		const mockOrchestrator = {
			getNeuronCount: () => 3,
			executeSubAgent: async () => ({}), // Add missing method
		};

		const graph = new SimplePRPGraph(mockOrchestrator);
		expect(graph).toBeDefined();
	});
});
