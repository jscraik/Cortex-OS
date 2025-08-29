import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiModelGenerator } from '../src/generation/multi-model';
import * as proc from '../../../src/lib/run-process.js';

describe('MultiModelGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates generation to single backend', async () => {
    const gen = new MultiModelGenerator({
      model: { model: 'test-model', backend: 'mlx' },
    });
    const spy = vi.spyOn(gen as any, 'generateWithModel').mockResolvedValue('ok');
    const res = await gen.generate('prompt');
    expect(res.content).toBe('ok');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('delegates chat to single backend', async () => {
    const gen = new MultiModelGenerator({
      model: { model: 'test-model', backend: 'mlx' },
    });
    const spy = vi.spyOn(gen as any, 'chatWithModel').mockResolvedValue('ok');
    const res = await gen.chat([{ role: 'user', content: 'hi' }]);
    expect(res.content).toBe('ok');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('propagates runProcess errors', async () => {
    vi.spyOn(proc, 'runProcess').mockRejectedValue(new Error('fail'));
    const { MultiModelGenerator } = await import('../src/generation/multi-model');
    const gen = new MultiModelGenerator({
      model: { model: 'test-model', backend: 'ollama' },
    });
    await expect(gen.generate('prompt')).rejects.toThrow('fail');
  });

  it('propagates timeout errors', async () => {
    vi.spyOn(proc, 'runProcess').mockRejectedValue(new Error('timed out'));
    const { MultiModelGenerator } = await import('../src/generation/multi-model');
    const gen = new MultiModelGenerator({
      model: { model: 'test-model', backend: 'ollama' },
    });
    await expect(gen.generate('prompt')).rejects.toThrow('timed out');
  });
});
