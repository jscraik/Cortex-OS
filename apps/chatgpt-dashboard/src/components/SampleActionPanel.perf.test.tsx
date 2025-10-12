import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import * as React from 'react';
import type { ConnectorCard } from '../hooks/useConnectorState';
import { SampleActionPanel } from './SampleActionPanel';

jest.mock('../hooks/useSampleConnectorAction', () => ({
	useSampleConnectorAction: () => ({
		loading: false,
		result: undefined,
		error: undefined,
		lastAction: undefined,
		runSample: jest.fn(),
		reset: jest.fn(),
	}),
}));

const connectors: ConnectorCard[] = [
	{
		id: 'alpha',
		displayName: 'Alpha Connector',
		version: '1.0.0',
		endpoint: 'https://example.invalid/alpha',
		scopes: ['alpha:read'],
		auth: { type: 'none' },
		headers: undefined,
		quotas: undefined,
		metadata: { category: 'core' },
		enabled: true,
		status: 'online',
		ttlSeconds: 120,
		tags: ['core'],
		availability: undefined,
		timeouts: undefined,
		description: 'Baseline connector used for dashboard performance tests.',
		expiresAt: '2025-10-11T00:02:00.000Z',
		statusLabel: 'Enabled',
	},
];

describe('SampleActionPanel rendering performance', () => {
	it('mounts within 20ms under test conditions', () => {
		const start = performance.now();
		render(<SampleActionPanel connectors={connectors} />);
		const duration = performance.now() - start;
		expect(duration).toBeLessThan(20);
	});
});
