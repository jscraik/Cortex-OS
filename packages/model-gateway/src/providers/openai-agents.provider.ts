/**
 * brAInwav Cortex-OS: OpenAI Agents Provider
 * Integrates OpenAI Agents JS adapter with model gateway routing
 * Named exports only; functions ≤ 40 lines; async/await
 */

import type {
	AgentMessageInput,
	AgentResponse,
	BrAInwavLogger,
	OpenAIAgentsClientLike,
	ToolSpec,
} from '@openai/apps-sdk';
import { createOpenAIAgentsAdapter } from '@openai/apps-sdk';

export interface OpenAIAgentsProviderConfig {
	client: OpenAIAgentsClientLike;
	logger?: BrAInwavLogger;
	modelName?: string;
	timeout?: number;
}

export interface ChatRequest {
	messages: AgentMessageInput[];
	tools?: ToolSpec[];
	abortSignal?: AbortSignal;
}

export const createOpenAIAgentsProvider = (config: OpenAIAgentsProviderConfig) => {
	const { client, logger, modelName = 'openai-agents', timeout = 30000 } = config;

	const log: BrAInwavLogger = logger ?? {
		info: (msg: string, meta?: Record<string, unknown>) => {
			console.info(`[brAInwav Cortex-OS] ${msg}`, meta);
		},
		error: (msg: string, meta?: Record<string, unknown>) => {
			console.error(`[brAInwav Cortex-OS] ${msg}`, meta);
		},
	};

	const adapter = createOpenAIAgentsAdapter({ client, logger: log });

	const chat = async (request: ChatRequest): Promise<AgentResponse> => {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			log.info('brAInwav Cortex-OS: OpenAI Agents provider chat initiated', {
				brand: 'brAInwav',
				model: modelName,
				messageCount: request.messages.length,
			});

			const signal = request.abortSignal ?? controller.signal;
			const response = await adapter.chat({
				messages: request.messages,
				tools: request.tools,
				abortSignal: signal,
			});

			log.info('brAInwav Cortex-OS: OpenAI Agents provider chat completed', {
				brand: 'brAInwav',
				model: modelName,
			});

			return response;
		} catch (error) {
			log.error('brAInwav Cortex-OS: OpenAI Agents provider chat failed', {
				brand: 'brAInwav',
				model: modelName,
				error: (error as Error).message,
			});
			throw error;
		} finally {
			clearTimeout(timeoutId);
		}
	};

	const health = async (): Promise<{ status: string; brand: string; model: string }> => {
		return {
			status: 'operational',
			brand: 'brAInwav',
			model: modelName,
		};
	};

	return {
		chat,
		health,
		modelName,
		brand: 'brAInwav',
	};
};

export type OpenAIAgentsProvider = ReturnType<typeof createOpenAIAgentsProvider>;
