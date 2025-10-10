import { collectDefaultMetrics, Gauge, Registry } from 'prom-client';

const registry = new Registry();

const availabilityGauge = new Gauge({
        name: 'brAInwav_mcp_connector_proxy_up',
        help: 'Availability of MCP connector proxies',
        labelNames: ['connector'] as const,
        registers: [registry],
});

let initialized = false;

const ensureInitialized = () => {
        if (initialized) {
                return;
        }

        registry.setDefaultLabels({
                brand: 'brAInwav',
                component: 'mcp-connectors',
        });
        collectDefaultMetrics({ register: registry });
        initialized = true;
};

export const setConnectorAvailabilityGauge = (connectorId: string, up: boolean) => {
        ensureInitialized();
        availabilityGauge.labels({ connector: connectorId }).set(up ? 1 : 0);
};

export const getConnectorMetricsRegistry = () => {
        ensureInitialized();
        return registry;
};
