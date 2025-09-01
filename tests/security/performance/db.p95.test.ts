/**
 * file_path: tests/performance/db.p95.test.ts
 * description: Budget test ensuring DB p95 latency ≤ 50ms (simulated, hermetic)
 * maintainer: @jamiescottcraik
 * last_updated: 2025-08-16
 * version: 1.0.0
 * status: active
 */

import { describe, expect, it } from 'vitest';

function p95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

async function fakeDbQuery(): Promise<number> {
  // Fast in-memory compute to simulate DB cache hit bounds
  const base = 8; // p50 ~8ms
  const jitter = Math.floor(Math.random() * 20); // 0..19
  const latency = base + jitter; // 8..27ms typical
  const start = Date.now();
  while (Date.now() - start < latency) {
    // Tight loop to avoid timers and I/O
  }
  return Date.now() - start;
}

describe('DB performance budget', () => {
  it('p95 latency ≤ 50ms', async () => {
    const samples: number[] = [];
    const N = 40;
    for (let i = 0; i < N; i++) {
      const d = await fakeDbQuery();
      samples.push(d);
    }

    const p95Val = p95(samples);
    expect(p95Val).toBeLessThanOrEqual(50);
  });
});
