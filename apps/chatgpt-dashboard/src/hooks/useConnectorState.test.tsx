import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';

import { ensureAppsClient } from '../sdk/appsClient';
import { useConnectorState } from './useConnectorState';

jest.mock('../sdk/appsClient', () => ({
	ensureAppsClient: jest.fn(),
}));

const mockedEnsureAppsClient = jest.mocked(ensureAppsClient);

type FetchStub = {
	ok: boolean;
	json: () => Promise<unknown>;
	text: () => Promise<string>;
};

const createFetchResponse = (payload: unknown): FetchStub => ({
	ok: true,
	json: async () => payload,
	text: async () => JSON.stringify(payload),
});

const sampleConnector = {
	id: 'perplexity-search',
	displayName: 'Perplexity Search',
	version: '1.0.0',
	endpoint: 'https://example.invalid/perplexity',
	auth: { type: 'none' },
	scopes: ['search:query'],
	ttlSeconds: 120,
	enabled: true,
	metadata: { tools: [{ name: 'query', description: 'Issue a search query' }] },
	tags: ['search'],
};

const sampleMap = {
	payload: {
		id: '01TESTCONNECTOR0000000000000',
		brand: 'brAInwav',
		generatedAt: new Date().toISOString(),
		ttlSeconds: 300,
		connectors: [sampleConnector],
	},
	signature: 'abc123',
};

describe('useConnectorState', () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		mockedEnsureAppsClient.mockResolvedValue(null);
		const fetchMock = jest.fn(() => Promise.resolve(createFetchResponse(sampleMap))) as jest.Mock;
		(global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		jest.resetAllMocks();
		(global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
	});

	it('loads connectors via HTTP when Apps SDK is unavailable', async () => {
		const { result } = renderHook(() => useConnectorState());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(global.fetch).toHaveBeenCalledWith('/v1/connectors/service-map', expect.any(Object));
		expect(result.current.error).toBeUndefined();
		expect(result.current.connectors).toHaveLength(1);
		expect(result.current.metadata?.signature).toBe('abc123');
		expect(result.current.connectors[0].displayName).toBe('Perplexity Search');
	});

	it('prefers Apps SDK serviceMap when available', async () => {
		mockedEnsureAppsClient.mockResolvedValue({
			connectors: {
				serviceMap: jest.fn(() => Promise.resolve(sampleMap as unknown)),
			},
		});
		const fetchSpy = global.fetch as unknown as jest.Mock;

		const { result } = renderHook(() => useConnectorState());
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(result.current.connectors[0].statusLabel).toBe('Enabled');
	});

	it('surfaces errors when the manifest cannot be loaded', async () => {
		const fetchMock = global.fetch as unknown as jest.Mock;
		fetchMock.mockImplementation(() =>
			Promise.resolve({
				ok: false,
				json: async () => ({}),
				text: async () => 'Service unavailable',
			}),
		);

		const { result } = renderHook(() => useConnectorState());

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.error).toContain('brAInwav');

		await act(async () => {
			await result.current.refresh();
		});
	});
});
