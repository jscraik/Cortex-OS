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

import {
  recordLatency,
  calculateErrorBudget,
  recordOperation,
  updateProviderHealth,
  updateVRAMUsage,
} from '../src/metrics/index.js';
import { generateRunId } from '../src/ulids.js';

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

  it('handles zero total count in error budget', () => {
    const res = calculateErrorBudget(0, 0);
    expect(res.actual).toBe(1);
    expect(res.burnRate).toBe(0);
  });

  it('records operations with run id', () => {
    const id = generateRunId();
    recordOperation('op', true, id, { foo: 'bar' });
    expect(counterSpy).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'success', run_id: id, foo: 'bar' }));
  });

  it('clamps provider health and VRAM usage', () => {
    updateProviderHealth('p', 2);
    updateVRAMUsage('p', -1);
    expect(gaugeSpy).toHaveBeenNthCalledWith(1, 1, expect.objectContaining({ provider: 'p' }));
    expect(gaugeSpy).toHaveBeenNthCalledWith(2, 0, expect.objectContaining({ provider: 'p' }));
  });
});
