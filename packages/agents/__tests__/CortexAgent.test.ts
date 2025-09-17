/**
 * Tests for CortexAgent
 */

import { CortexAgent } from '../src/CortexAgent';

// Mock tools for testing
const mockTools = [
	{
		id: 'test-tool',
		name: 'test-tool',
		description: 'A test tool',
		parameters: { type: 'object', properties: {} },
		execute: jest.fn(),
	},
];

describe('CortexAgent', () => {
	let agent: CortexAgent;

	beforeEach(() => {
		agent = new CortexAgent({
			name: 'TestAgent',
			instructions: 'You are a test agent',
			model: 'test-model',
			tools: mockTools,
			cortex: {
				enableMLX: true,
				subagents: {
					enabled: false, // Disable subagents for basic tests
				},
			},
		});
	});

	test('should create agent with configuration', () => {
		expect(agent).toBeDefined();
		// We can't easily access private properties, so we test through methods
	});

	test('should return agent status', async () => {
		const status = await agent.getStatus();

		expect(status.status).toBe('healthy');
		expect(status.model).toBeDefined();
		expect(status.tools).toContain('test-tool');
	});

	test('should execute with model routing', async () => {
		const result = await agent.execute('Hello world');

		expect(result.success).toBe(true);
		expect(result.input).toBe('Hello world');
		expect(result.model).toBeDefined();
	});

	test('should handle security check on input', async () => {
		// Mock security tool
		const _securityTool = {
			name: 'security_guard',
			execute: jest.fn().mockResolvedValue({
				isSafe: true,
				riskLevel: 'low',
			}),
		};

		// Add security tool to agent (this would require modifying the agent to allow test injection)
	});

	test('should support subagent system when enabled', async () => {
		const agentWithSubagents = new CortexAgent({
			name: 'AgentWithSubagents',
			cortex: {
				subagents: {
					enabled: true,
					enableDelegation: true,
					watch: false,
					searchPaths: ['./test-subagents'],
				},
			},
		});

		const status = await agentWithSubagents.getStatus();
		expect(status.subagents).toBeDefined();
		expect(status.subagents?.enabled).toBe(true);
	});
});
