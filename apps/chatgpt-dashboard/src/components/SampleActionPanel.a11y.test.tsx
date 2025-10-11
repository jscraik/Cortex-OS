import '@testing-library/jest-dom';

import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
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
		description: 'Baseline connector used for dashboard accessibility tests.',
		expiresAt: '2025-10-11T00:02:00.000Z',
		statusLabel: 'Enabled',
	},
];

const renderPanel = () => render(<SampleActionPanel connectors={connectors} />);

describe('SampleActionPanel accessibility', () => {
	it('has no detectable accessibility violations', async () => {
		const { container } = renderPanel();
		const results = await axe(container);
		expect(results.violations).toHaveLength(0);
	});
});
