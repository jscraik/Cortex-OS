import { describe, expect, it, vi } from 'vitest';
import { MemoryMetricsCollector } from '../../src/monitoring/metrics-collector.js';
import type { MemoryStore } from '../../src/ports/MemoryStore.js';

describe('MemoryMetricsCollector sampling', () => {
        const store = {} as unknown as MemoryStore;

        it('invokes the configured sampler for operations', async () => {
                const sampler = vi.fn().mockReturnValue(0.05);
                const collector = new MemoryMetricsCollector(store, {
                        enabledMetrics: ['operations'],
                        sampleRate: 0.5,
                        sampler,
                });

                await collector.instrumentOperation('upsert', async () => {});

                expect(sampler).toHaveBeenCalled();
                expect((collector as unknown as { metrics: any }).metrics.operations.upsert.count).toBe(1);
        });

        it('skips metrics when sampler returns value above rate', async () => {
                const sampler = vi.fn().mockReturnValue(0.9);
                const collector = new MemoryMetricsCollector(store, {
                        enabledMetrics: ['operations'],
                        sampleRate: 0.1,
                        sampler,
                });

                await collector.instrumentOperation('upsert', async () => {});

                expect(sampler).toHaveBeenCalled();
                expect((collector as unknown as { metrics: any }).metrics.operations.upsert.count).toBe(0);
        });
});
