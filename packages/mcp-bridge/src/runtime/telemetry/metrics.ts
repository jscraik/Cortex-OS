import { Counter, collectDefaultMetrics, Gauge, Histogram, Registry } from 'prom-client';

const registry = new Registry();

const authAttemptsCounter = new Counter({
	name: 'brainwav_mcp_http_auth_attempt_total',
	help: 'Count of HTTP authentication attempts labelled by outcome',
	labelNames: ['outcome'] as const,
	registers: [registry],
});

const hybridSearchDuration = new Histogram({
	name: 'brainwav_mcp_hybrid_search_duration_ms',
	help: 'Latency histogram for hybrid search execution time in milliseconds',
	buckets: [5, 10, 25, 50, 100, 250, 500, 750, 1000, 2000],
	registers: [registry],
});

const hybridSearchBreakdown = new Counter({
	name: 'brainwav_mcp_hybrid_search_results_total',
	help: 'Number of records returned by hybrid search grouped by source',
	labelNames: ['source'] as const,
	registers: [registry],
});

const piecesProxyAvailability = new Gauge({
        name: 'brainwav_mcp_pieces_proxy_up',
        help: 'Pieces MCP proxy availability (1 = connected, 0 = disconnected)',
        registers: [registry],
});

const piecesDriveProxyAvailability = new Gauge({
        name: 'brainwav_mcp_pieces_drive_proxy_up',
        help: 'Pieces Drive proxy availability (1 = connected, 0 = disconnected)',
        registers: [registry],
});

const piecesCopilotProxyAvailability = new Gauge({
        name: 'brainwav_mcp_pieces_copilot_proxy_up',
        help: 'Pieces Copilot proxy availability (1 = connected, 0 = disconnected)',
        registers: [registry],
});

const connectorProxyAvailability = new Gauge({
        name: 'brainwav_mcp_connector_proxy_up',
        help: 'Connector MCP proxy availability (1 = connected, 0 = disconnected)',
        labelNames: ['connector'] as const,
        registers: [registry],
});

let metricsInitialized = false;

export const initializeMetrics = (brandPrefix: string): Registry => {
	if (!metricsInitialized) {
		registry.setDefaultLabels({
			branding: brandPrefix,
			service: 'brainwav-cortex-mcp',
			environment: process.env.NODE_ENV ?? 'development',
		});
		collectDefaultMetrics({
			register: registry,
		});
		metricsInitialized = true;
	}

	return registry;
};

export const recordAuthOutcome = (outcome: 'success' | 'failure') => {
	authAttemptsCounter.labels({ outcome }).inc();
};

export const observeHybridSearch = (
	durationMs: number,
	localCount: number,
	remoteCount: number,
) => {
	hybridSearchDuration.observe(durationMs);
	hybridSearchBreakdown.labels({ source: 'cortex-local' }).inc(localCount);
	hybridSearchBreakdown.labels({ source: 'pieces-ltm' }).inc(remoteCount);
};

export const getMetricsRegistry = () => registry;

export const setPiecesProxyStatus = (up: boolean) => {
        piecesProxyAvailability.set(up ? 1 : 0);
};

export const setPiecesDriveProxyStatus = (up: boolean) => {
        piecesDriveProxyAvailability.set(up ? 1 : 0);
};

export const setPiecesCopilotProxyStatus = (up: boolean) => {
        piecesCopilotProxyAvailability.set(up ? 1 : 0);
};

export const setConnectorProxyStatus = (connector: string, up: boolean) => {
        connectorProxyAvailability.labels({ connector }).set(up ? 1 : 0);
};
