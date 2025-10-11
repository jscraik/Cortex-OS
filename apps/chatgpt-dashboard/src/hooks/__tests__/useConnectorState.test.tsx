import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';

import { useConnectorState } from '../useConnectorState';

jest.mock('../../sdk/appsClient', () => ({
	ensureAppsClient: jest.fn(),
}));

const { ensureAppsClient } = jest.requireMock('../../sdk/appsClient') as {
	ensureAppsClient: jest.MockedFunction<() => Promise<any>>;
};

const SERVICE_MAP = {
	id: '01JAG0Y4ZP1XK9YZ2FQ0N3WVCH',
	brand: 'brAInwav',
	generatedAt: '2025-10-10T00:00:00Z',
	ttlSeconds: 120,
	connectors: [
		{
			id: 'beta',
			displayName: 'Beta Connector',
			version: '1.0.0',
			endpoint: 'https://example.invalid/beta',
			scopes: ['beta:write'],
			auth: { type: 'apiKey', headerName: 'X-Api-Key' },
			enabled: false,
			ttlSeconds: 120,
			tags: ['beta'],
		},
		{
			id: 'alpha',
			displayName: 'Alpha Connector',
			version: '2.0.0',
			endpoint: 'https://example.invalid/alpha',
			scopes: ['alpha:read'],
			auth: { type: 'bearer', headerName: 'Authorization' },
			enabled: true,
			ttlSeconds: 90,
			tags: ['alpha'],
		},
	],
	signature: 'test-signature',
};

describe('useConnectorState', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		ensureAppsClient.mockResolvedValue(null);
	const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
	fetchMock.mockResolvedValue({
		ok: true,
		json: async () => SERVICE_MAP,
	} as unknown as Response);
	global.fetch = fetchMock;
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.useRealTimers();
	});

	it('fetches the service map via HTTP when Apps SDK is unavailable', async () => {
		const timeoutSpy = jest.spyOn(window, 'setTimeout');
		const { result } = renderHook(() => useConnectorState());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(global.fetch).toHaveBeenCalledWith(
			'/v1/connectors/service-map',
			expect.objectContaining({ method: 'GET' }),
		);

		expect(result.current.connectors.map((connector) => connector.id)).toEqual(['alpha', 'beta']);
		expect(result.current.connectors[0].status).toBe('enabled');

		expect(timeoutSpy).toHaveBeenCalled();
		const delays = timeoutSpy.mock.calls.map(([, delay]) => delay as number);
		expect(delays.some((delay) => delay >= 30_000)).toBe(true);
	});

	it('prefers the Apps SDK service when available', async () => {
		const sdkMap = {
			...SERVICE_MAP,
			signature: 'sdk-signature',
			connectors: SERVICE_MAP.connectors.slice(0, 1),
		};
	const serviceMapMock = jest.fn(async () => sdkMap);
	ensureAppsClient.mockResolvedValue({
		connectors: {
			serviceMap: serviceMapMock,
		},
	} as any);
	const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
	global.fetch = fetchMock;

		const { result } = renderHook(() => useConnectorState());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(global.fetch).not.toHaveBeenCalled();
		expect(result.current.connectors).toHaveLength(1);
		expect(result.current.serviceMap?.signature).toBe('sdk-signature');
	});
});
