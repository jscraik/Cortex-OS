import { describe, expect, test, vi } from 'vitest';
import { chatHandler } from '../src/handlers';
import type { ModelRouter } from '../src/model-router';

describe('chatHandler', () => {
  test('throws when chat capability missing', async () => {
    const router: Partial<ModelRouter> = { hasCapability: vi.fn().mockReturnValue(false) };
    expect(() =>
      chatHandler(router as ModelRouter, { msgs: [{ role: 'user', content: 'hi' }] }),
    ).toThrow('No chat models available');
  });

  test('returns chat content', async () => {
    const router: Partial<ModelRouter> = {
      hasCapability: vi.fn().mockReturnValue(true),
      generateChat: vi.fn().mockResolvedValue({ content: 'hello', model: 'm' }),
    };
    const result = await chatHandler(router as ModelRouter, {
      msgs: [{ role: 'user', content: 'hi' }],
    });
    expect(result).toEqual({ content: 'hello', modelUsed: 'm' });
  });
});
