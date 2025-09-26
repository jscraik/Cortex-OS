import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
	createMasterAgentGraph,
	type MasterAgentGraph,
	type SubAgentConfig,
} from '../../MasterAgent.js';
import {
	type ExecuteAgentRequest,
	type ExecuteAgentResponse,
	executeAgentResponseSchema,
} from '../types.js';

// Default sub-agent configurations
const defaultSubAgents: SubAgentConfig[] = [
	{
		name: 'code-analysis-agent',
		description: 'Analyzes code for quality and standards compliance',
		capabilities: ['analyze', 'review', 'code', 'quality', 'standards'],
		tools: [],
		model_targets: ['glm-4.5-mlx'],
		specialization: 'code-analysis',
	},
	{
		name: 'test-generation-agent',
		description: 'Generates unit and integration tests',
		capabilities: ['test', 'spec', 'unit', 'integration', 'mock'],
		tools: [],
		model_targets: ['glm-4.5-mlx'],
		specialization: 'test-generation',
	},
	{
		name: 'documentation-agent',
		description: 'Creates and updates documentation',
		capabilities: ['document', 'readme', 'docs', 'markdown', 'api'],
		tools: [],
		model_targets: ['glm-4.5-mlx'],
		specialization: 'documentation',
	},
	{
		name: 'security-agent',
		description: 'Performs security analysis and vulnerability scanning',
		capabilities: ['security', 'vulnerability', 'audit', 'scan', 'compliance'],
		tools: [],
		model_targets: ['glm-4.5-mlx'],
		specialization: 'security',
	},
];

export class AgentHandler {
	private masterAgent: MasterAgentGraph | null = null;

	constructor() {
		// Initialize the master agent with default sub-agents
		this.masterAgent = createMasterAgentGraph({
			name: 'brAInwav-Master-Agent',
			subAgents: defaultSubAgents,
		});
	}

	async execute(_c: Context, request: ExecuteAgentRequest): Promise<ExecuteAgentResponse> {
		try {
			if (!this.masterAgent) {
				throw new Error('Master agent not initialized');
			}

			// Execute the coordination workflow
			const startTime = Date.now();
			const result = await this.masterAgent.coordinate(request.input);
			const duration = Date.now() - startTime;

			// Extract response from result
			let response: string;
			let status: 'completed' | 'failed' = 'completed';
			let error: string | undefined;

			if (result.error) {
				status = 'failed';
				error = result.error;
				response = `Execution failed: ${result.error}`;
			} else if (result.result && typeof result.result === 'string') {
				response = result.result;
			} else if (result.messages && result.messages.length > 0) {
				// Get the last AI message
				const lastMessage = result.messages[result.messages.length - 1];
				if (lastMessage && typeof lastMessage.content === 'string') {
					response = lastMessage.content;
				} else {
					response = JSON.stringify(lastMessage?.content || 'No response generated');
				}
			} else {
				response = 'Task completed with no explicit response';
			}

			// Add brAInwav branding to successful responses
			if (status === 'completed' && !response.includes('brAInwav')) {
				response = `brAInwav Cortex-OS: ${response}`;
			}

			// Construct the response object
			const executeResponse: ExecuteAgentResponse = {
				agentId: request.agentId,
				response,
				timestamp: new Date().toISOString(),
				status,
				metadata: {
					executionTime: duration,
					specialization: result.taskType || 'unknown',
					selectedAgent: result.currentAgent || 'unknown',
					...(error && { error }),
				},
			};

			return executeAgentResponseSchema.parse(executeResponse);
		} catch (error) {
			if (error instanceof Error) {
				throw new HTTPException(500, {
					message: `Agent execution failed: ${error.message}`,
				});
			}
			throw error;
		}
	}
}
