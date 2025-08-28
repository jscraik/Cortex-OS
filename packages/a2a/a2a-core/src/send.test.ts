import { describe, it, expect, vi } from 'vitest';

var fire: ReturnType<typeof vi.fn>;
var CircuitBreaker: ReturnType<typeof vi.fn>;
vi.mock('opossum', () => {
  fire = vi.fn().mockResolvedValue(undefined);
  CircuitBreaker = vi.fn().mockImplementation(() => ({ fire }));
  return { default: CircuitBreaker };
});

var post: ReturnType<typeof vi.fn>;
vi.mock('axios', () => {
  post = vi.fn().mockResolvedValue(undefined);
  return { default: { post }, __esModule: true };
});

vi.mock(
  '@cortex-os/a2a-contracts/envelope',
  () => ({
    createEnvelope: (params: any) => ({ ...params }),
  }),
  { virtual: true },
);

import axios from 'axios';
import { send } from './send';

describe('send', () => {
  it('performs circuit-breaker guarded POST and returns envelope', async () => {
    const params = {
      type: 'test.event',
      source: 'test-source',
      data: { hello: 'world' },
      outboxUrl: 'http://outbox',
    };
    const envelope = await send(params);
    expect(CircuitBreaker).toHaveBeenCalledWith(post, expect.any(Object));
    expect(fire).toHaveBeenCalledWith(params.outboxUrl, envelope);
    expect(post).not.toHaveBeenCalled();
    expect(envelope).toMatchObject({
      type: params.type,
      source: params.source,
      data: params.data,
    });
  });
});
