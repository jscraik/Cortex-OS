import { collectDefaultMetrics, Gauge, Registry } from 'prom-client';

const registry = new Registry();

const availabilityGauge = new Gauge({
        name: 'brAInwav_agents_connector_up',
        help: 'Connector availability status (1 = enabled, 0 = disabled)',
        labelNames: ['connector'] as const,
        registers: [registry],
});

const ttlGauge = new Gauge({
        name: 'brAInwav_agents_connector_ttl_seconds',
        help: 'Seconds until manifest entry expiration',
        labelNames: ['connector'] as const,
        registers: [registry],
});

let metricsInitialized = false;

const ensureMetricsInitialized = () => {
        if (metricsInitialized) {
                return;
        }

        registry.setDefaultLabels({
                brand: 'brAInwav',
                component: 'agents-connectors',
        });
        collectDefaultMetrics({ register: registry });
        metricsInitialized = true;
};

export const setConnectorAvailability = (connectorId: string, enabled: boolean) => {
        ensureMetricsInitialized();
        availabilityGauge.labels({ connector: connectorId }).set(enabled ? 1 : 0);
};

export const recordConnectorTtl = (connectorId: string, expiresAtMs: number) => {
        ensureMetricsInitialized();
        const remaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
        ttlGauge.labels({ connector: connectorId }).set(remaining);
};

export const getConnectorTelemetryRegistry = () => {
        ensureMetricsInitialized();
        return registry;
};
