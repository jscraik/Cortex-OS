import { describe, expect, it } from 'vitest';
import {
  collectBudgetViolations,
  parseVariantThresholds,
} from '../budget-helpers.mjs';

describe('parseVariantThresholds', () => {
  it('parses variant:threshold pairs', () => {
    expect(parseVariantThresholds('hnsw:95,pq:90,hnswScalar:93')).toEqual({
      hnsw: 95,
      pq: 90,
      hnswScalar: 93,
    });
    expect(parseVariantThresholds('')).toEqual({});
    expect(parseVariantThresholds(undefined as unknown as string)).toEqual({});
  });

  it('ignores malformed entries and whitespace', () => {
    expect(parseVariantThresholds('hnsw:abc, pq:90, :100, foo,scalarQ: 85 ')).toEqual({
      pq: 90,
      scalarQ: 85,
    });
    expect(parseVariantThresholds(',,,')).toEqual({});
  });
});

describe('collectBudgetViolations', () => {
  type BenchRow = {
    N: number;
    efSearch: number;
    hnswLatency: number;
    flatLatency: number;
    speedup: number;
    overlapPct: number;
    memAfterQueries: number;
    cpuDeltaMs: number;
    recallHnsw: number;
    mapHnsw: number;
    recallScalarQ: number;
    mapScalarQ: number;
    recallPQ: number | null;
    mapPQ: number | null;
    recallHnswScalar: number;
    mapHnswScalar: number;
    recallHnswPQ: number;
    mapHnswPQ: number;
  };
  const baseRow: BenchRow = {
    N: 10000,
    efSearch: 64,
    hnswLatency: 10,
    flatLatency: 120,
    speedup: 12,
    overlapPct: 98,
    memAfterQueries: 100 * 1e6,
    cpuDeltaMs: 100,
    recallHnsw: 96,
    mapHnsw: 0.86,
    recallScalarQ: 88,
    mapScalarQ: 0.7,
    recallPQ: null,
    mapPQ: null,
    recallHnswScalar: 94,
    mapHnswScalar: 0.83,
    recallHnswPQ: 91,
    mapHnswPQ: 0.8,
  };

  it('returns empty when all budgets pass', () => {
    const v = collectBudgetViolations([baseRow], {
      memBudgetMB: 200,
      cpuBudgetMs: 500,
      minRecallPct: 90,
      minMap: 0.8,
      perVariantRecall: { hnsw: 95, hnswScalar: 93, hnswPQ: 90 },
      perVariantMap: { hnsw: 0.85, hnswScalar: 0.82, hnswPQ: 0.8 },
      failOnMissingVariant: false,
    });
    expect(v).toEqual([]);
  });

  it('flags missing variant metrics when failOnMissingVariant=true', () => {
    const v = collectBudgetViolations([baseRow], {
      perVariantRecall: { pq: 85 },
      failOnMissingVariant: true,
    });
    expect(v.some((m: string) => m.includes('Missing recall metric for variant=pq'))).toBe(true);
  });

  it('flags per-variant recall/mAP below thresholds', () => {
    const v = collectBudgetViolations([baseRow], {
      perVariantRecall: { scalarQ: 90 },
      perVariantMap: { scalarQ: 0.71 },
    });
    expect(v.some((m: string) => m.includes('Recall(scalarQ)'))).toBe(true);
    expect(v.some((m: string) => m.includes('mAP(scalarQ)'))).toBe(true);
  });

  it('returns empty for empty results array', () => {
    const v = collectBudgetViolations([], {
      memBudgetMB: 200,
      cpuBudgetMs: 500,
      minRecallPct: 90,
      minMap: 0.8,
      perVariantRecall: { hnsw: 95 },
      perVariantMap: { hnsw: 0.85 },
      failOnMissingVariant: false,
    });
    expect(v).toEqual([]);
  });

  it('only global thresholds: detects failures', () => {
    const bad = { ...baseRow, recallHnsw: 80, mapHnsw: 0.5 };
    const v = collectBudgetViolations([bad], {
      memBudgetMB: 200,
      cpuBudgetMs: 500,
      minRecallPct: 90,
      minMap: 0.8,
    });
    expect(v.some((m: string) => m.includes('below minRecallPct'))).toBe(true);
    expect(v.some((m: string) => m.includes('below minMap'))).toBe(true);
  });

  it('only global thresholds: passes when above', () => {
    const v = collectBudgetViolations([baseRow], {
      minRecallPct: 90,
      minMap: 0.8,
    });
    expect(v).toEqual([]);
  });

  it('only variant thresholds: detects failures', () => {
    const bad = { ...baseRow, recallHnswPQ: 80, mapHnswScalar: 0.5 };
    const v = collectBudgetViolations([bad], {
      perVariantRecall: { hnswPQ: 90 },
      perVariantMap: { hnswScalar: 0.82 },
    });
    expect(v.some((m: string) => m.includes('Recall(hnswPQ)'))).toBe(true);
    expect(v.some((m: string) => m.includes('mAP(hnswScalar)'))).toBe(true);
  });

  it('only variant thresholds: passes when above', () => {
    const v = collectBudgetViolations([baseRow], {
      perVariantRecall: { hnsw: 95, hnswScalar: 90 },
      perVariantMap: { hnsw: 0.85, hnswScalar: 0.8 },
    });
    expect(v).toEqual([]);
  });

  it('peakRssBudgetMB: flags when exceeded', () => {
    const high: BenchRow & { peakRss?: number } = { ...baseRow, peakRss: 600 * 1e6 }; // 600MB
    const v = collectBudgetViolations([high], {
      peakRssBudgetMB: 500,
    });
    expect(v.some((m: string) => m.includes('Peak RSS'))).toBe(true);
  });

  it('peakRssBudgetMB: passes when within budget', () => {
    const ok: BenchRow & { peakRss?: number } = { ...baseRow, peakRss: 400 * 1e6 }; // 400MB
    const v = collectBudgetViolations([ok], {
      peakRssBudgetMB: 500,
    });
    expect(v).toEqual([]);
  });

  it('mixed rows: missing metrics ignored when failOnMissingVariant=false', () => {
    const row1 = { ...baseRow };
    const row2 = { ...baseRow, recallPQ: null, mapPQ: null };
    const v = collectBudgetViolations([row1, row2], {
      perVariantRecall: { pq: 85 },
      perVariantMap: { pq: 0.6 },
      failOnMissingVariant: false,
    });
    expect(v).toEqual([]);
  });

  it('mixed rows: missing metrics flagged when failOnMissingVariant=true', () => {
    const row1 = { ...baseRow };
    const row2 = { ...baseRow, recallPQ: null, mapPQ: null };
    const v = collectBudgetViolations([row1, row2], {
      perVariantRecall: { pq: 85 },
      perVariantMap: { pq: 0.6 },
      failOnMissingVariant: true,
    });
    expect(v.some((m: string) => m.includes('Missing recall metric for variant=pq'))).toBe(true);
    expect(v.some((m: string) => m.includes('Missing mAP metric for variant=pq'))).toBe(true);
  });
});
