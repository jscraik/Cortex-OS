import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

import { useSampleConnectorAction } from './useSampleConnectorAction';

const sampleSuccess = {
	brand: 'brAInwav',
	connectorId: 'alpha',
	action: 'query',
	timestamp: '2025-10-11T00:00:00.000Z',
	summary: 'Sample query executed',
	metadata: { enabled: true },
	sample: { status: 'enabled' },
	echo: { query: 'test' },
};

type MutableGlobal = typeof globalThis & { fetch?: jest.MockedFunction<typeof fetch> };

const mutableGlobal = global as MutableGlobal;
const originalFetch = mutableGlobal.fetch;

describe('useSampleConnectorAction', () => {
	beforeEach(() => {
		mutableGlobal.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
	});

	afterEach(() => {
		mutableGlobal.fetch?.mockReset();
		mutableGlobal.fetch = originalFetch;
	});

	it('invokes sample endpoint and stores result', async () => {
		const fetchMock = mutableGlobal.fetch!;
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => sampleSuccess,
			status: 200,
			statusText: 'OK',
		} as unknown as Response);

		const { result } = renderHook(() => useSampleConnectorAction());

		await act(async () => {
			await result.current.runSample({
				connectorId: 'alpha',
				action: 'query',
				payload: { query: 'test' },
			});
		});

		expect(fetchMock).toHaveBeenCalledWith(
			'/v1/connectors/sample-call',
			expect.objectContaining({ method: 'POST' }),
		);
		expect(result.current.result).toEqual(sampleSuccess);
		expect(result.current.error).toBeUndefined();
	});

	it('captures errors from failed sample requests', async () => {
		const fetchMock = mutableGlobal.fetch!;
		fetchMock.mockResolvedValue({
			ok: false,
			status: 503,
			statusText: 'Service Unavailable',
			text: async () => 'manifest missing',
		} as unknown as Response);

		const { result } = renderHook(() => useSampleConnectorAction());

		await act(async () => {
			await result.current.runSample({
				connectorId: 'alpha',
				action: 'status',
				payload: {},
			});
		});

		expect(result.current.error).toContain('brAInwav');
		expect(result.current.result).toBeUndefined();
	});
});
