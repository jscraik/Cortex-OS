import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({
	default: { post: vi.fn() },
}));

vi.mock('@cortex-os/a2a-contracts/envelope', () => ({
	createEnvelope: vi.fn((params: unknown) => params),
}));

describe('send', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('sends envelope to outboxUrl and returns envelope', async () => {
		// Cast the mocked module to a mocked shape so mockResolvedValue is available
		const axios = (await import('axios')).default as unknown as {
			post: ReturnType<typeof vi.fn>;
		};
		axios.post.mockResolvedValue({});

		const { send } = await import('./send');
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
		// Cast the mocked module to a mocked shape so mockRejectedValue is available
		const axios = (await import('axios')).default as unknown as {
			post: ReturnType<typeof vi.fn>;
		};
		axios.post.mockRejectedValue(new Error('network error'));

		const { send } = await import('./send');

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
