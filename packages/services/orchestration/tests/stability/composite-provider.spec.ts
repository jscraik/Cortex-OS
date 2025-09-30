import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCompositeProvider } from '../../../../orchestration/src/providers/composite-provider.js';

vi.mock('../../../../orchestration/src/lib/model-selection.js', () => ({
	selectMLXModel: vi.fn(async () => 'mlx-eval-model'),
	selectOllamaModel: vi.fn(async () => 'ollama-eval-model'),
}));

describe('brAInwav composite provider fallback', () => {
	const originalFetch = global.fetch;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
			const raw =
				typeof input === 'string'
					? input
					: input instanceof URL
						? input.toString()
						: typeof input === 'object' && input && 'url' in input
							? String((input as { url?: unknown }).url ?? '')
							: String(input ?? '');
			const ResponseCtor = globalThis.Response;
			if (raw.includes('/api/generate')) {
				return new ResponseCtor(
					JSON.stringify({
						response: 'brAInwav fallback success',
						model: 'ollama-eval-model',
						prompt_eval_count: 12,
						eval_count: 4,
					}),
					{
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			}

			return new ResponseCtor(JSON.stringify({ models: [] }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		});
		global.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.clearAllMocks();
	});

	it('falls back to a succeeding provider with brAInwav-branded telemetry', async () => {
		const composite = createCompositeProvider({
			fallbackTimeout: 100,
			mlx: {
				enabled: true,
				service: {
					generateChat: vi.fn(async () => {
						throw new Error('MLX offline');
					}),
					generateEmbedding: vi.fn(),
				},
				priority: 1,
			},
			ollama: {
				enabled: true,
				baseUrl: 'http://ollama.test',
				priority: 2,
			},
		});

		const events: Array<{ type: string; payload: unknown }> = [];
		composite.on('provider-failed', (payload) => events.push({ type: 'failed', payload }));
		composite.on('provider-success', (payload) => events.push({ type: 'success', payload }));
		composite.on('chat-generated', (payload) => events.push({ type: 'chat', payload }));

		const response = await composite.generateChat({
			messages: [
				{ role: 'system', content: 'You are a brAInwav orchestrator.' },
				{ role: 'user', content: 'Demonstrate fallback execution.' },
			],
			task: 'chat',
		});

		expect(response.content).toContain('brAInwav fallback success');
		expect(events[0]?.type).toBe('failed');
		if (events[0]?.type === 'failed') {
			const payload = events[0].payload as { provider: string; message: string };
			expect(payload.provider).toBe('mlx');
			expect(payload.message).toContain('brAInwav');
		}
		expect(events[1]?.type).toBe('success');
		if (events[1]?.type === 'success') {
			const payload = events[1].payload as { provider: string; message: string };
			expect(payload.provider).toBe('ollama');
			expect(payload.message).toContain('brAInwav');
		}

		const chatEvent = events.find((event) => event.type === 'chat');
		expect(chatEvent).toBeDefined();
		if (chatEvent) {
			const payload = chatEvent.payload as { attempts: number; message: string };
			expect(payload.attempts).toBe(2);
			expect(payload.message).toContain('brAInwav');
		}

		const callOrder = events.map((event) => event.type);
		expect(callOrder).toEqual(['failed', 'success', 'chat']);
	});

	it('propagates brAInwav-branded errors when all providers fail', async () => {
		const composite = createCompositeProvider({
			fallbackTimeout: 50,
			mlx: {
				enabled: true,
				service: {
					generateChat: vi.fn(async () => {
						throw new Error('MLX offline');
					}),
					generateEmbedding: vi.fn(),
				},
				priority: 1,
			},
			ollama: {
				enabled: true,
				baseUrl: 'http://ollama.test',
				priority: 2,
			},
		});

		fetchMock.mockImplementation(
			async () =>
				new globalThis.Response(JSON.stringify({ error: 'failure' }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				}),
		);

		await expect(
			composite.generateChat({
				messages: [
					{ role: 'system', content: 'You are a brAInwav orchestrator.' },
					{ role: 'user', content: 'Trigger fallback failure.' },
				],
				task: 'chat',
			}),
		).rejects.toThrow(/brAInwav all providers failed/i);
	});
});
