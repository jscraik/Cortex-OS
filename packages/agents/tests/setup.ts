import { vi } from 'vitest';

// Mock the missing model-gateway adapters
vi.mock('@cortex-os/model-gateway/dist/adapters/mlx-adapter.js', () => ({
	MLXAdapter: vi.fn().mockImplementation(() => ({
		isAvailable: vi.fn().mockResolvedValue(false),
		generateChat: vi.fn().mockResolvedValue({ response: 'Mocked MLX response' }),
	})),
}));

vi.mock('@cortex-os/model-gateway', () => ({
	OllamaAdapter: vi.fn().mockImplementation(() => ({
		generateChat: vi.fn().mockResolvedValue({ response: 'Mocked Ollama response' }),
	})),
}));

vi.mock(
	'@cortex-os/orchestration',
	() => ({
		agentStateToN0: (agent: any, session: any) => ({
			input: agent.messages?.[0]?.content ?? '',
			session,
			ctx: {
				currentAgent: agent.currentAgent,
				taskType: agent.taskType,
			},
			messages: agent.messages,
			output:
				typeof agent.result?.content === 'string'
					? agent.result.content
					: (agent.messages?.at(-1)?.content ?? ''),
		}),
		dispatchTools: async (jobs: any[]) =>
			Promise.all(
				jobs.map(async (job) => ({
					id: job.id,
					name: job.name,
					status: 'fulfilled',
					value: await job.execute?.(job.input),
					durationMs: 1,
					tokensUsed: job.estimateTokens ?? 0,
					metadata: job.metadata,
					started: true,
				})),
			),
	}),
	{ virtual: true },
);
