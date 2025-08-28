import { describe, it, expect, vi } from 'vitest';
import { MultiModelGenerator } from '../src/generation/multi-model';

describe('MultiModelGenerator', () => {
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
});
