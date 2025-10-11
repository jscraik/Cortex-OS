import { afterEach, describe, expect, it, jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { ConnectorDashboard } from '../components/ConnectorDashboard';

jest.mock('../hooks/useConnectorState', () => ({
	useConnectorState: jest.fn(),
}));

const { useConnectorState } = jest.requireMock('../hooks/useConnectorState') as {
	useConnectorState: jest.Mock;
};

const CONNECTOR = {
	id: 'alpha',
	displayName: 'Alpha Connector',
	version: '2.0.0',
	description: 'Performs alpha operations',
	endpoint: 'https://example.invalid/alpha',
	scopes: ['alpha:read', 'alpha:write'],
	auth: { type: 'bearer', headerName: 'Authorization' },
	enabled: true,
	ttlSeconds: 90,
	tags: ['alpha', 'core'],
	metadata: { owner: 'integrations', category: 'search' },
	headers: { Authorization: 'Bearer ${ALPHA}' },
};

describe('ConnectorDashboard', () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	it('renders loading state', () => {
		useConnectorState.mockReturnValue({
			loading: true,
			error: undefined,
			connectors: [],
			refresh: jest.fn(),
			serviceMap: undefined,
		});

		render(<ConnectorDashboard />);

		expect(screen.getByText('Loading connectors…')).toBeTruthy();
	});

	it('renders error state with retry', () => {
		const refresh = jest.fn();
		useConnectorState.mockReturnValue({
			loading: false,
			error: new Error('boom'),
			connectors: [],
			refresh,
			serviceMap: undefined,
		});

		render(<ConnectorDashboard />);

		expect(screen.getByRole('alert').textContent).toContain('Unable to load connectors');
		fireEvent.click(screen.getByRole('button', { name: /retry/i }));
		expect(refresh).toHaveBeenCalled();
	});

	it('renders connector details', () => {
		useConnectorState.mockReturnValue({
			loading: false,
			error: undefined,
			connectors: [{ ...CONNECTOR, status: 'enabled' }],
			refresh: jest.fn(),
			serviceMap: {
				brand: 'brAInwav',
				generatedAt: '2025-10-10T00:00:00Z',
				ttlSeconds: 300,
				id: '01JAG0Y4ZP1XK9YZ2FQ0N3WVCH',
				signature: 'signature123456',
				connectors: [],
			},
		});

		render(<ConnectorDashboard />);

		expect(screen.getByRole('heading', { name: 'brAInwav Connectors' })).toBeTruthy();
		expect(screen.getByRole('heading', { name: 'Alpha Connector' })).toBeTruthy();
		expect(screen.getByText(/Performs alpha operations/)).toBeTruthy();
		expect(screen.getByText(/alpha:read/)).toBeTruthy();
		expect(screen.getByText(/owner/)).toBeTruthy();
	});
});
