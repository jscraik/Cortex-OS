import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { useConnectorState } from './hooks/useConnectorState';

function ConnectorDashboard() {
	const { connectors, loading, error, refresh, serviceMap } = useConnectorState();

	if (loading) {
		return <p aria-live="polite">Loading connectors…</p>;
	}

	if (error) {
		return (
			<div role="alert">
				<h2>Unable to load connectors</h2>
				<p>{error.message}</p>
				<button type="button" onClick={refresh}>
					Retry
				</button>
			</div>
		);
	}

	return (
		<section aria-live="polite">
			<header>
				<h1>brAInwav Connectors</h1>
				<p>Generated at: {serviceMap?.generatedAt}</p>
				<button type="button" onClick={refresh}>
					Refresh
				</button>
			</header>
			<ul>
				{connectors.map((connector) => (
					<li key={connector.id}>
						<h2>{connector.displayName}</h2>
						<p>Status: {connector.status ?? 'unknown'}</p>
						<p>Endpoint: {connector.endpoint}</p>
					</li>
				))}
			</ul>
		</section>
	);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
	throw new Error('Root element not found');
}

const root = createRoot(rootElement);
root.render(
	<StrictMode>
		<ConnectorDashboard />
	</StrictMode>,
);
