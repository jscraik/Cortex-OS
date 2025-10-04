import { randomUUID } from 'node:crypto';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AgentResult } from '@cortex-os/protocol';
import { logAgentResult } from '@cortex-os/observability/logging';
import {
        createMasterAgentGraph,
        type MasterAgentGraph,
        type SubAgentConfig,
} from '../../MasterAgent.js';
import { runAgent } from '../../base/runAgent.js';
import { MASTER_SYSTEM_PROMPT } from '../../prompts/system-master-agent.js';
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

                        const startTime = Date.now();
                        const coordinateResult = await this.masterAgent.coordinate(request.input);
                        const duration = Date.now() - startTime;

                        const { response, status, error } = resolveAgentResponse(coordinateResult);
                        const brandedResponse = brandAgentResponse(response, status);
                        const agentResult = await generateAgentResult(coordinateResult, brandedResponse);

                        const timestamp = agentResult.meta.ts ?? new Date().toISOString();

                        const executeResponse: ExecuteAgentResponse = {
                                agentId: request.agentId,
                                response: agentResult.data,
                                timestamp,
                                status,
                                error,
                                metadata: {
                                        executionTime: duration,
                                        specialization: coordinateResult.taskType || 'unknown',
                                        selectedAgent: coordinateResult.currentAgent || 'unknown',
                                        ...(error && { error }),
                                },
                                result: agentResult,
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

type CoordinateResult = Awaited<ReturnType<MasterAgentGraph['coordinate']>>;

async function generateAgentResult(
	coordinateResult: CoordinateResult,
	response: string,
): Promise<AgentResult<string>> {
	const agentResult = await runAgent(
		async () => response,
		{
			prompt_id: MASTER_SYSTEM_PROMPT.id,
			prompt_version: MASTER_SYSTEM_PROMPT.version,
			prompt_hash: MASTER_SYSTEM_PROMPT.hash,
			model: process.env.CORTEX_MODEL ?? 'mlx:llama3.1-8b',
			run_id: randomUUID(),
		},
	);

	logAgentResultSafe(coordinateResult.currentAgent ?? 'master-agent', agentResult);
	return agentResult;
}

function resolveAgentResponse(result: CoordinateResult): {
	response: string;
	status: 'completed' | 'failed';
	error?: string;
} {
	if (result.error) {
		return {
			response: `Execution failed: ${result.error}`,
			status: 'failed',
			error: result.error,
		};
	}

	if (typeof result.result === 'string') {
		return { response: result.result, status: 'completed' };
	}

	const lastMessage = result.messages?.[result.messages.length - 1];
	if (lastMessage) {
		if (typeof lastMessage.content === 'string') {
			return { response: lastMessage.content, status: 'completed' };
		}
		return {
			response: JSON.stringify(lastMessage.content ?? 'No response generated'),
			status: 'completed',
		};
	}

	return { response: 'Task completed with no explicit response', status: 'completed' };
}

function brandAgentResponse(response: string, status: 'completed' | 'failed'): string {
	if (status !== 'completed') {
		return response;
	}
	return response.includes('brAInwav') ? response : `brAInwav Cortex-OS: ${response}`;
}

function logAgentResultSafe(name: string, agentResult: AgentResult<unknown>): void {
	try {
		logAgentResult({
			name,
			result: agentResult,
		});
	} catch (error) {
		console.warn('agent_result_log_failure', error);
	}
}
