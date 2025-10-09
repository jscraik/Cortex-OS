import { beforeEach, describe, expect, it, vi } from 'vitest';

const chatSpy = vi.fn();

vi.mock('ollama', () => {
	class MockOllama {
		host?: string;
		constructor(opts?: { host?: string }) {
			this.host = opts?.host;
		}
		chat(args: any) {
			return chatSpy(args);
		}
	}
	return { Ollama: MockOllama };
});

const config = {
	baseUrl: 'http://127.0.0.1:11434',
	defaultModel: 'llama3.2',
	keepAlive: '5m',
	prewarmModels: [],
	heartbeatInterval: '5m',
	watchdogIdleMs: 10,
	requiredModels: [],
	healthEndpoint: undefined,
	defaults: {
		tool_calling: 'qwen3-coder:30b',
		embedding: undefined,
		chat: 'qwen3-chat:32b',
	},
};

function createServerStub() {
	const added: any[] = [];
	return {
		tools: {
			add(entry: any) {
				added.push(entry);
			},
		},
		added,
	};
}

beforeEach(() => {
	chatSpy.mockReset();
});

describe('ollama.chat tool', () => {
	it('maps determinism options and keepAlive for non-streaming requests', async () => {
		const server = createServerStub();
		const logger = { info: vi.fn(), warn: vi.fn() };
		const { registerOllamaChat } = await import('../tools/ollama-chat.js');
		registerOllamaChat(server as any, logger, config);
		const tool = server.added.find((entry) => entry.name === 'ollama.chat');
		chatSpy.mockResolvedValue({ message: { content: 'Hello World' }, timings: { total: 12 } });
		const result = await tool.handler({
			model: 'llama3.2',
			messages: [{ role: 'user', content: 'Ping' }],
			stream: false,
			keepAlive: '10m',
			options: { seed: 42, temperature: 0.1, num_ctx: 8192 },
		});
		expect(chatSpy).toHaveBeenCalledTimes(1);
		const payload = chatSpy.mock.calls[0][0];
		expect(payload.model).toBe('llama3.2');
		expect(payload.keep_alive).toBe('10m');
		expect(payload.options.seed).toBe(42);
		expect(payload.options.stop).toContain('</plan>');
		expect(result.text).toBe('Hello World');
		expect(result.structuredContent.timings.total).toBe(12);
	});

	it('streams deltas and completes output', async () => {
		const server = createServerStub();
		const logger = { info: vi.fn(), warn: vi.fn() };
		const { registerOllamaChat } = await import('../tools/ollama-chat.js');
		registerOllamaChat(server as any, logger, config);
		const tool = server.added.find((entry) => entry.name === 'ollama.chat');
		chatSpy.mockImplementation(async () => {
			async function* stream() {
				yield { message: { content: 'Hello ' } };
				yield { message: { content: 'World' } };
			}
			return stream();
		});
		const deltas: string[] = [];
		const stream = { delta: (chunk: string) => deltas.push(chunk), complete: vi.fn() };
		const result = await tool.handler(
			{
				model: 'llama3.2',
				messages: [{ role: 'user', content: 'Stream' }],
				stream: true,
			},
			{ stream },
		);
		expect(deltas.join('')).toBe('Hello World');
		expect(stream.complete).toHaveBeenCalledWith({ text: 'Hello World' });
		expect(result.text).toBe('Hello World');
	});

	it('filters <think> segments when thinking mode is final', async () => {
		const server = createServerStub();
		const logger = { info: vi.fn(), warn: vi.fn() };
		const { registerOllamaChat } = await import('../tools/ollama-chat.js');
		registerOllamaChat(server as any, logger, config);
		const tool = server.added.find((entry) => entry.name === 'ollama.chat');
		chatSpy.mockImplementation(async () => {
			async function* stream() {
				yield { message: { content: '<think>internal</think>Answer' } };
			}
			return stream();
		});
		const deltas: string[] = [];
		const stream = { delta: (chunk: string) => deltas.push(chunk), complete: vi.fn() };
		const result = await tool.handler(
			{
				model: 'llama3.2',
				messages: [{ role: 'user', content: 'Explain' }],
				stream: true,
				options: { thinking: 'final' },
			},
			{ stream },
		);
		expect(deltas.join('')).toBe('Answer');
		expect(result.text).toBe('Answer');
	});

	it('falls back to aggregate mode when stream stalls', async () => {
		vi.useFakeTimers();
		const server = createServerStub();
		const logger = { info: vi.fn(), warn: vi.fn() };
		const { registerOllamaChat } = await import('../tools/ollama-chat.js');
		registerOllamaChat(server as any, logger, { ...config, watchdogIdleMs: 5 });
		const tool = server.added.find((entry) => entry.name === 'ollama.chat');
		chatSpy
			.mockImplementationOnce(async () => {
				async function* slowStream() {
					await new Promise((resolve) => setTimeout(resolve, 20));
					yield { message: { content: '' } };
				}
				return slowStream();
			})
			.mockImplementationOnce(async () => ({ message: { content: 'Recovered output' } }));
		const stream = { delta: vi.fn(), complete: vi.fn() };
		try {
			const resultPromise = tool.handler(
				{
					model: 'llama3.2',
					messages: [{ role: 'user', content: 'Stall' }],
					stream: true,
				},
				{ stream },
			);
			await vi.advanceTimersByTimeAsync(25);
			const result = await resultPromise;
			expect(stream.delta).toHaveBeenLastCalledWith('Recovered output');
			expect(stream.complete).toHaveBeenCalledWith({ text: 'Recovered output' });
			expect(result.text).toBe('Recovered output');
		} finally {
			vi.useRealTimers();
		}
	});

	it('uses hybrid default model when caller omits model', async () => {
		const server = createServerStub();
		const logger = { info: vi.fn(), warn: vi.fn() };
		const { registerOllamaChat } = await import('../tools/ollama-chat.js');
		registerOllamaChat(server as any, logger, config);
		const tool = server.added.find((entry) => entry.name === 'ollama.chat');
		chatSpy.mockResolvedValue({ message: { content: 'Resolved' } });
		await tool.handler(
			{
				messages: [{ role: 'user', content: 'Hello' }],
				stream: false,
			},
			{},
		);
		expect(chatSpy).toHaveBeenCalled();
		expect(chatSpy.mock.calls[0][0].model).toBe('qwen3-chat:32b');
	});
});
