import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../lib/retry';

describe('withRetry', () => {
  it('retries until success', async () => {
    const fn = vi
      .fn<[], Promise<string>>()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, { retries: 2, timeout: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exceeding retries', async () => {
    const fn = vi.fn<[], Promise<void>>().mockRejectedValue(new Error('fail'));
    await expect(withRetry(fn, { retries: 1, timeout: 10 })).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
