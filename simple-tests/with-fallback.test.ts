import { describe, expect, it } from 'vitest';
import { withFallback } from '../src/lib/with-fallback';

describe('withFallback', () => {
  it('returns result from primary model on success', async () => {
    const result = await withFallback('primary', ['fallback'], async (model) => {
      if (model === 'primary') {
        return 'success';
      }
      throw new Error('should not reach fallback');
    });
    expect(result).toBe('success');
  });

  it('falls back when primary fails', async () => {
    const result = await withFallback('primary', ['fallback'], async (model) => {
      if (model === 'primary') {
        throw new Error('primary failed');
      }
      return 'fallback success';
    });
    expect(result).toBe('fallback success');
  });

  it('throws when all models fail', async () => {
    await expect(
      withFallback('primary', ['fallback'], async (model) => {
        throw new Error(`${model} failed`);
      }),
    ).rejects.toThrow('fallback failed');
  });
});
