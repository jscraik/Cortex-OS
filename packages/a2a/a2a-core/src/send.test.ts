import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({
	default: { post: vi.fn() },
}));

vi.mock('../../a2a-contracts/src/envelope.js', () => ({
	createEnvelope: vi.fn((params: unknown) => params),
}));

describe('send', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('sends envelope to outboxUrl and returns envelope', async () => {
		const axios = (await import('axios')).default as {
			post: (
				url: string,
				data?: unknown,
				config?: unknown,
			) => Promise<{ status: number; data?: unknown }>;
			get: (url: string, config?: unknown) => Promise<{ status: number; data?: unknown }>;
		};
		axios.post.mockResolvedValue({});

		const { send } = await import('./send.js');
		const params = {
			type: 'event.test.v1',
			source: 'urn:test',
			data: { foo: 'bar' },
			outboxUrl: 'http://example.com',
		};

		const envelope = await send(params);

		expect(axios.post).toHaveBeenCalledWith('http://example.com/', envelope);

		expect(envelope).toMatchObject({
			type: params.type,
			source: params.source,
			data: params.data,
		});
	});

	it('propagates errors from axios', async () => {
		const axios = (await import('axios')).default as {
			post: (
				url: string,
				data?: unknown,
				config?: unknown,
			) => Promise<{ status: number; data?: unknown }>;
			get: (url: string, config?: unknown) => Promise<{ status: number; data?: unknown }>;
		};
		axios.post.mockRejectedValue(new Error('network error'));

		const { send } = await import('./send.js');

		await expect(
			send({
				type: 'event.test.v1',
				source: 'urn:test',
				data: {},
				outboxUrl: 'http://example.com',
			}),
		).rejects.toThrow('network error');
	});
});
