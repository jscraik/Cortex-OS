import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServiceMapSignature } from '@cortex-os/protocol';
import { createExecutionSurfaceAgent } from '../ExecutionSurfaceAgent.js';
import { getConnectorTelemetryRegistry } from '../../connectors/telemetry.js';

const createManifest = (signatureKey: string) => {
        const payload = {
                id: '01HZ7ZWJ5XJ8W4T7N6MZ2V1PQB',
                brand: 'brAInwav' as const,
                generatedAt: new Date('2025-10-12T12:00:00.000Z').toISOString(),
                ttlSeconds: 300,
                connectors: [
                        {
                                id: 'demo',
                                version: '1.0.0',
                                displayName: 'Demo Connector',
                                endpoint: 'https://connectors.invalid/v1/mcp',
                                auth: { type: 'apiKey', headerName: 'X-Api-Key' },
                                scopes: ['demo:read'],
                                ttlSeconds: 300,
                                enabled: true,
                                metadata: { brand: 'brAInwav' },
                        },
                ],
        };

        const signature = createServiceMapSignature(payload, signatureKey);
        return { ...payload, signature };
};

describe('ExecutionSurfaceAgent connectors integration', () => {
        afterEach(() => {
                vi.restoreAllMocks();
        });

        it('loads signed connector manifest and updates telemetry', async () => {
                const signatureKey = 'test-key';
                const manifest = createManifest(signatureKey);
                const fetchMock = vi.fn().mockResolvedValue(
                        new Response(JSON.stringify(manifest), { status: 200 }),
                );

                const agent = createExecutionSurfaceAgent({
                        allowedSurfaces: ['filesystem', 'connector'],
                        connectors: {
                                serviceMapUrl: 'https://asbr.invalid/v1/connectors/service-map',
                                apiKey: 'asbr-token',
                                signatureKey,
                                connectorsApiKey: 'connectors-token',
                                fetchImpl: fetchMock,
                        },
                });

                const connectors = await agent.getConnectorDefinitions();
                expect(connectors).toHaveLength(1);
                expect(connectors[0].headers['X-Api-Key']).toBe('connectors-token');

                const surfaces = agent.getAvailableSurfaces();
                expect(surfaces).toContain('connector:demo');

                const registry = getConnectorTelemetryRegistry();
                const metrics = await registry.getMetricsAsJSON();
                const availability = metrics.find(
                        (metric) => metric.name === 'brAInwav_agents_connector_up',
                );
                expect(availability?.values[0]?.value).toBe(1);
        });
});
