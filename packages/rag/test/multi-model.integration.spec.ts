import { describe, expect, it } from 'vitest';
import { MultiModelGenerator } from '../src/generation/multi-model';

describe('MultiModelGenerator external script', () => {
  it('invokes MLX python script', async () => {
    const gen = new MultiModelGenerator({ model: { model: 'fake-model', backend: 'mlx' } });
    await expect(gen.generate('hello')).rejects.toBeTruthy();
  });
});
