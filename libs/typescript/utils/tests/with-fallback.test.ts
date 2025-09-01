import { describe, expect, it, vi } from 'vitest';
import { createProvider, withFallback } from '../src/with-fallback.js';

describe('withFallback', () => {
  it('should return result from first successful provider', async () => {
    const provider1 = createProvider('primary', async () => 'success');
    const provider2 = createProvider('fallback', async () => 'fallback-result');

    const result = await withFallback([provider1, provider2]);

    expect(result).toBe('success');
  });

  it('should fallback to second provider when first fails', async () => {
    const provider1 = createProvider('primary', async () => {
      throw new Error('Primary failed');
    });
    const provider2 = createProvider('fallback', async () => 'fallback-success');

    const result = await withFallback([provider1, provider2]);

    expect(result).toBe('fallback-success');
  });

  it('should try all providers in order', async () => {
    const executionOrder: string[] = [];

    const provider1 = createProvider('first', async () => {
      executionOrder.push('first');
      throw new Error('First failed');
    });

    const provider2 = createProvider('second', async () => {
      executionOrder.push('second');
      throw new Error('Second failed');
    });

    const provider3 = createProvider('third', async () => {
      executionOrder.push('third');
      return 'third-success';
    });

    const result = await withFallback([provider1, provider2, provider3]);

    expect(result).toBe('third-success');
    expect(executionOrder).toEqual(['first', 'second', 'third']);
  });

  it('should throw error when all providers fail', async () => {
    const provider1 = createProvider('primary', async () => {
      throw new Error('Primary failed');
    });
    const provider2 = createProvider('fallback', async () => {
      throw new Error('Fallback failed');
    });

    await expect(withFallback([provider1, provider2])).rejects.toThrow(
      'All providers failed. Last error: Fallback failed'
    );
  });

  it('should throw error when no providers provided', async () => {
    await expect(withFallback([])).rejects.toThrow('No providers available');
  });

  it('should use custom error message when provided', async () => {
    const provider = createProvider('test', async () => {
      throw new Error('Test error');
    });

    await expect(
      withFallback([provider], { errorMessage: 'Custom error message' })
    ).rejects.toThrow('Custom error message');
  });

  it('should suppress warnings when logWarnings is false', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const provider1 = createProvider('primary', async () => {
      throw new Error('Primary failed');
    });
    const provider2 = createProvider('fallback', async () => 'success');

    await withFallback([provider1, provider2], { logWarnings: false });

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should log warnings by default', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const provider1 = createProvider('primary', async () => {
      throw new Error('Primary failed');
    });
    const provider2 = createProvider('fallback', async () => 'success');

    await withFallback([provider1, provider2]);

    expect(consoleSpy).toHaveBeenCalledWith('Provider primary failed:', 'Primary failed');

    consoleSpy.mockRestore();
  });
});
