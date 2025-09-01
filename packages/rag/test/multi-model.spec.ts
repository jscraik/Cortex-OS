import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as proc from '../../../src/lib/run-process.js';
import { MultiModelGenerator } from '../src/generation/multi-model';

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

  it('propagates generation options to Ollama API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'ok' }),
    }) as unknown as typeof fetch;
    const originalFetch = global.fetch;
    // @ts-expect-error - mock fetch for test
    global.fetch = fetchMock;

    const gen = new MultiModelGenerator({
      model: { model: 'test-model', backend: 'ollama' },
    });

    await gen.generate('prompt', {
      temperature: 0.5,
      topP: 0.8,
      maxTokens: 123,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        body: JSON.stringify({
          model: 'test-model',
          prompt: 'prompt',
          stream: false,
          options: {
            temperature: 0.5,
            top_p: 0.8,
            num_predict: 123,
          },
        }),
      }),
    );
    // @ts-expect-error - restore original fetch
    global.fetch = originalFetch;
  });
});
