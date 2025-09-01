import { describe, it, expect } from 'vitest';
import { SQLiteStore } from '../src/adapters/store.sqlite.js';
import type { Memory } from '../src/domain/types.js';

const now = new Date().toISOString();

describe('latency benchmark', () => {
  it('records p95/p99 for writes and reads', async () => {
    const store = new SQLiteStore(':memory:');
    const latencies: number[] = [];
    for (let i = 0; i < 20; i++) {
      const m: Memory = {
        id: String(i),
        kind: 'note',
        text: `t${i}`,
        tags: [],
        createdAt: now,
        updatedAt: now,
        provenance: { source: 'bench' },
      };
      const start = performance.now();
      await store.upsert(m);
      await store.get(m.id);
      latencies.push(performance.now() - start);
    }
    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.ceil(latencies.length * 0.95) - 1];
    const p99 = latencies[Math.ceil(latencies.length * 0.99) - 1];
    expect(p95).toBeGreaterThan(0);
    expect(p99).toBeGreaterThan(0);
    console.log('p95', p95.toFixed(2), 'ms', 'p99', p99.toFixed(2), 'ms');
  });
});
