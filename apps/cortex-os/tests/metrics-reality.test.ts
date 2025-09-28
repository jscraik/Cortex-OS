import { afterEach, describe, expect, it } from 'vitest';
import { MetricsCollector } from '../packages/evidence/analytics/src/metrics-collector.js';
import type { AnalyticsConfig, ResourceUtilization } from '../packages/evidence/analytics/src/types.js';
import type {
        AgentResourceUsage,
        SystemProbe,
        SystemProbeSnapshot,
} from '../packages/evidence/analytics/src/system-probe.js';

class DeterministicProbe implements SystemProbe {
        public sampleCalls = 0;
        constructor(
                private readonly snapshot: SystemProbeSnapshot,
                private readonly usage: AgentResourceUsage,
        ) {}

        async sample(): Promise<SystemProbeSnapshot> {
                this.sampleCalls += 1;
                return this.snapshot;
        }

        async getAgentUsage(): Promise<AgentResourceUsage> {
                return this.usage;
        }
}

describe('metrics reality guard', () => {
        const config: AnalyticsConfig = {
                collection: {
                        enabled: false,
                        interval: 250,
                        batchSize: 4,
                        retentionPeriod: 60_000,
                },
                analysis: {
                        patternDetection: true,
                        anomalyDetection: true,
                        predictiveModeling: true,
                        optimizationRecommendations: true,
                },
                visualization: {
                        realTimeUpdates: true,
                        maxDataPoints: 50,
                        refreshInterval: 1000,
                },
                alerts: {
                        enabled: true,
                        thresholds: {},
                        notificationChannels: ['console'],
                },
                storage: {
                        backend: 'memory',
                        compressionEnabled: false,
                        encryptionEnabled: false,
                },
        };

        const snapshot: SystemProbeSnapshot = {
                cpuPercent: 42.5,
                memoryPercent: 68.25,
                gpuPercent: 7.5,
                networkInboundBytesPerSecond: 12_345.67,
                networkOutboundBytesPerSecond: 6_789.54,
                diskReadBytesPerSecond: 9_001.23,
                diskWriteBytesPerSecond: 1_024.88,
        };

        const usage: AgentResourceUsage = {
                memory: 256.12,
                cpu: 33.44,
                gpu: 7.5,
        };

        let collector: MetricsCollector | undefined;
        let probe: DeterministicProbe;

        afterEach(async () => {
                if (collector) {
                        await collector.cleanup();
                        collector = undefined;
                }
        });

        it('uses deterministic system probe data for resource metrics', async () => {
                        probe = new DeterministicProbe(snapshot, usage);
                        collector = new MetricsCollector(config, { systemProbe: probe });
                        const events: Array<{
                                resourceMetrics: ResourceUtilization;
                        }> = [];
                        collector.on('metricsCollected', (payload) => {
                                events.push(payload);
                        });

                        await collector.collectMetrics();

                        expect(probe.sampleCalls).toBeGreaterThan(0);
                        expect(events).toHaveLength(1);
                        const [event] = events;
                        const { resourceMetrics } = event;

                        expect(resourceMetrics.cpu.current).toBe(snapshot.cpuPercent);
                        expect(resourceMetrics.cpu.average).toBe(snapshot.cpuPercent);
                        expect(resourceMetrics.cpu.peak).toBe(snapshot.cpuPercent);
                        expect(resourceMetrics.memory.current).toBe(snapshot.memoryPercent);
                        expect(resourceMetrics.memory.average).toBe(snapshot.memoryPercent);
                        expect(resourceMetrics.memory.peak).toBe(snapshot.memoryPercent);
                        expect(resourceMetrics.gpu?.current).toBe(snapshot.gpuPercent);
                        expect(resourceMetrics.gpu?.average).toBe(snapshot.gpuPercent);
                        expect(resourceMetrics.gpu?.peak).toBe(snapshot.gpuPercent);
                        expect(resourceMetrics.network.inbound).toBe(Number(snapshot.networkInboundBytesPerSecond.toFixed(2)));
                        expect(resourceMetrics.network.outbound).toBe(
                                Number(snapshot.networkOutboundBytesPerSecond.toFixed(2)),
                        );
                        expect(resourceMetrics.storage.reads).toBe(
                                Number(snapshot.diskReadBytesPerSecond.toFixed(2)),
                        );
                        expect(resourceMetrics.storage.writes).toBe(
                                Number(snapshot.diskWriteBytesPerSecond.toFixed(2)),
                        );
                });
});
