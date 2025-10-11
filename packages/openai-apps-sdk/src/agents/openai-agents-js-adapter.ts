// brAInwav Cortex-OS: OpenAI Agents JS adapter (thin wrapper)
// Named exports only; functions ≤ 40 lines; async/await

export interface BrAInwavLogger {
	info: (msg: string, meta?: Record<string, unknown>) => void;
	error: (msg: string, meta?: Record<string, unknown>) => void;
}

export interface ToolSpec {
	name: string;
	description?: string;
	parameters?: Record<string, unknown>;
}

export interface AgentMessageInput {
	role: 'user' | 'system' | 'assistant' | 'tool';
	content: string;
}

export interface AgentToolCallResult {
	toolName: string;
	result: unknown;
}

export interface AgentResponse {
	content: string;
	toolCalls?: AgentToolCallResult[];
	raw?: unknown;
}

export interface OpenAIAgentsClientLike {
	chat: (args: {
		messages: AgentMessageInput[];
		tools?: ToolSpec[];
		abortSignal?: AbortSignal;
	}) => Promise<AgentResponse>;
}

export const createOpenAIAgentsAdapter = ({
	client,
	logger,
}: {
	client: OpenAIAgentsClientLike;
	logger?: BrAInwavLogger;
}) => {
	const log = logger ?? {
		info: () => {},
		error: () => {},
	};

	const chat = async (args: {
		messages: AgentMessageInput[];
		tools?: ToolSpec[];
		abortSignal?: AbortSignal;
	}): Promise<AgentResponse> => {
		try {
			log.info('brAInwav Cortex-OS: openai-agents-js chat invoked');
			return await client.chat(args);
		} catch (err) {
			log.error('brAInwav Cortex-OS: openai-agents-js chat failed', {
				cause: (err as Error).message,
			});
			throw new Error(
				`brAInwav Cortex-OS: OpenAI Agents JS adapter error: ${(err as Error).message}`,
				{ cause: err as Error },
			);
		}
	};

	return { chat };
};
