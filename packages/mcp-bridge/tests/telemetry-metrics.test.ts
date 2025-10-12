import { beforeEach, describe, expect, it } from 'vitest';
import type { Gauge } from 'prom-client';
import {
        getMetricsRegistry,
        setConnectorProxyStatus,
        setPiecesCopilotProxyStatus,
        setPiecesDriveProxyStatus,
        setPiecesProxyStatus,
} from '../src/runtime/telemetry/metrics.js';

describe('telemetry metrics gauges', () => {
        const registry = getMetricsRegistry();

        const readGaugeValue = async (
                metricName: string,
                labels?: Record<string, string>,
        ): Promise<number> => {
                const metric = registry.getSingleMetric(metricName) as Gauge<string> | undefined;
                if (!metric) {
                        throw new Error(`Metric ${metricName} was not registered`);
                }

                const data = await metric.get();
                if (labels) {
                        const matchingEntry = data.values.find((entry) =>
                                Object.entries(labels).every(([labelName, labelValue]) =>
                                        entry.labels?.[labelName] === labelValue,
                                ),
                        );
                        return matchingEntry?.value ?? 0;
                }

                return data.values[0]?.value ?? 0;
        };

        beforeEach(() => {
                setPiecesProxyStatus(false);
                setPiecesDriveProxyStatus(false);
                setPiecesCopilotProxyStatus(false);
        });

        it('updates the Pieces proxy availability gauge when toggled', async () => {
                setPiecesProxyStatus(true);
                expect(await readGaugeValue('brainwav_mcp_pieces_proxy_up')).toBe(1);

                setPiecesProxyStatus(false);
                expect(await readGaugeValue('brainwav_mcp_pieces_proxy_up')).toBe(0);
        });

        it('updates the Pieces Drive proxy availability gauge when toggled', async () => {
                setPiecesDriveProxyStatus(true);
                expect(await readGaugeValue('brainwav_mcp_pieces_drive_proxy_up')).toBe(1);

                setPiecesDriveProxyStatus(false);
                expect(await readGaugeValue('brainwav_mcp_pieces_drive_proxy_up')).toBe(0);
        });

        it('updates the Pieces Copilot proxy availability gauge when toggled', async () => {
                setPiecesCopilotProxyStatus(true);
                expect(await readGaugeValue('brainwav_mcp_pieces_copilot_proxy_up')).toBe(1);

                setPiecesCopilotProxyStatus(false);
                expect(await readGaugeValue('brainwav_mcp_pieces_copilot_proxy_up')).toBe(0);
        });

        it('updates the connector proxy availability gauge for the provided connector label', async () => {
                const connector = 'drive-sync';

                setConnectorProxyStatus(connector, true);
                expect(
                        await readGaugeValue('brainwav_mcp_connector_proxy_up', { connector }),
                ).toBe(1);

                setConnectorProxyStatus(connector, false);
                expect(
                        await readGaugeValue('brainwav_mcp_connector_proxy_up', { connector }),
                ).toBe(0);
        });
});
