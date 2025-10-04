import { describe, expect, it, vi } from 'vitest';
const { recordSpy, counterSpy, gaugeSpy } = vi.hoisted(() => ({
    recordSpy: vi.fn(),
    counterSpy: vi.fn(),
    gaugeSpy: vi.fn(),
}));
vi.mock('@opentelemetry/api', () => ({
    metrics: {
        getMeter: () => ({
            createHistogram: () => ({ record: recordSpy }),
            createCounter: () => ({ add: counterSpy }),
            createGauge: () => ({ record: gaugeSpy }),
        }),
    },
}));
import { calculateErrorBudget, recordLatency } from '../src/metrics/index.js';
describe('metrics', () => {
    it('clamps negative latency', () => {
        recordLatency('test', -10);
        expect(recordSpy).toHaveBeenCalledWith(0, expect.objectContaining({ operation: 'test' }));
    });
    it('calculates error budget', () => {
        const res = calculateErrorBudget(90, 100, 0.95);
        expect(res.actual).toBeCloseTo(0.9);
        expect(res.burnRate).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=metrics.test.js.map