import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { safeFetchJson } from '../src/safe-fetch-json.js';

const mockFetch = vi.fn<typeof fetch>();

beforeAll(() => {
	globalThis.fetch = mockFetch as unknown as typeof fetch;
});

beforeEach(() => {
	mockFetch.mockReset();
});

afterEach(() => {
	vi.clearAllTimers();
});

function createResponse(body: unknown, init?: ResponseInit): Response {
	const headers = new Headers(init?.headers ?? {});
	if (!headers.has('content-type')) {
		headers.set('content-type', 'application/json');
	}
	const payload = typeof body === 'string' ? body : JSON.stringify(body);
	return new Response(payload, { ...init, headers });
}

describe('safeFetchJson', () => {
	it('parses JSON payloads with defaults', async () => {
		mockFetch.mockResolvedValue(createResponse({ ok: true }));

		const result = await safeFetchJson('https://api.example.com/data', {
			allowedHosts: ['api.example.com'],
		});

		expect(result).toEqual({ ok: true });
	});

	it('throws on non-2xx responses by default', async () => {
		mockFetch.mockResolvedValue(createResponse({ error: true }, { status: 502 }));

		await expect(
			safeFetchJson('https://api.example.com/data', {
				allowedHosts: ['api.example.com'],
			}),
		).rejects.toThrow(/\[brAInwav] HTTP 502/);
	});

	it('allows disabling non-2xx rejection', async () => {
		mockFetch.mockResolvedValue(
			createResponse({ missing: true }, { status: 404, statusText: 'Not Found' }),
		);

		const result = await safeFetchJson('https://api.example.com/data', {
			allowedHosts: ['api.example.com'],
			rejectOnNon2xx: false,
		});

		expect(result).toEqual({ missing: true });
	});

	it('validates response content type', async () => {
		mockFetch.mockResolvedValue(
			createResponse('not-json', {
				headers: { 'content-type': 'text/plain' },
			}),
		);

		await expect(
			safeFetchJson('https://api.example.com/data', {
				allowedHosts: ['api.example.com'],
			}),
		).rejects.toThrow("[brAInwav] Expected JSON but received 'text/plain'");
	});

	it('runs schema parser and preserves custom headers', async () => {
		const schema = { parse: vi.fn((value: unknown) => value as { ready: boolean }) };
		mockFetch.mockResolvedValue(createResponse({ ready: true }));

		await safeFetchJson('https://api.example.com/data', {
			allowedHosts: ['api.example.com'],
			schema,
			fetchOptions: {
				headers: {
					Authorization: 'Bearer token',
					'User-Agent': 'custom-agent',
				},
			},
		});

		expect(schema.parse).toHaveBeenCalledWith({ ready: true });

		const [, init] = mockFetch.mock.calls[0];
		const headers = new Headers(init?.headers);
		expect(headers.get('authorization')).toBe('Bearer token');
		expect(headers.get('user-agent')).toBe('custom-agent');
		expect(headers.get('accept')).toBe('application/json');
	});

	it('returns fallback for empty responses when allowed', async () => {
		mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

		const result = await safeFetchJson('https://api.example.com/data', {
			allowedHosts: ['api.example.com'],
			allowEmptyResponse: true,
			emptyResponseValue: { ok: true },
		});

		expect(result).toEqual({ ok: true });
	});

	it('throws when schema parsing fails', async () => {
		const schema = {
			parse: vi.fn(() => {
				throw new Error('invalid');
			}),
		};
		mockFetch.mockResolvedValue(createResponse({ ready: true }));

		await expect(
			safeFetchJson('https://api.example.com/data', {
				allowedHosts: ['api.example.com'],
				schema,
			}),
		).rejects.toThrow('invalid');
	});

	it('supports custom fetch implementations', async () => {
		const customFetch = vi.fn<typeof fetch>().mockResolvedValue(createResponse({ ok: true }));

		const result = await safeFetchJson('https://alt.example.com/data', {
			allowedHosts: ['alt.example.com'],
			fetchImpl: customFetch,
		});

		expect(result).toEqual({ ok: true });
		expect(customFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
