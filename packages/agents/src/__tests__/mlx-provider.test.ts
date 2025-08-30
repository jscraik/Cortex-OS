import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMLXProvider } from '../providers/mlx-provider.js';

let originalFetch: any;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('MLX provider', () => {
  it('returns text on successful gateway response', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({ content: 'hello world' }),
    })) as any;

    const p = createMLXProvider({ modelPath: 'mixtral' });
    const res = await p.generate('hi');
    expect(res.text).toBe('hello world');
    expect(res.provider).toBe('mlx');
  });

  it('retries on transient 500 and ultimately fails on non-retryable status', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) {
        return {
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ title: 'server error' }),
        };
      }
      return { ok: false, status: 400, text: async () => JSON.stringify({ title: 'bad request' }) };
    }) as any;

    const p = createMLXProvider({ modelPath: 'mixtral', httpRetries: 1, httpBackoffMs: 1 });

    let thrown = false;
    try {
      await p.generate('hi');
    } catch (e: any) {
      thrown = true;
      expect(e.message).toContain('MLX gateway error');
    }
    expect(thrown).toBe(true);
    expect(calls).toBeGreaterThanOrEqual(1);
  });
});
