import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => ({
  default: { post: vi.fn() },
}));

vi.mock('@cortex-os/a2a-contracts/envelope', () => ({
  createEnvelope: vi.fn((params: any) => params),
}));

describe('send', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('sends envelope to outboxUrl and returns envelope', async () => {
    const axios = (await import('axios')).default as { post: ReturnType<typeof vi.fn> };
    axios.post.mockResolvedValue({});

    const { send } = await import('./send.js');
    const params = {
      type: 'event.test.v1',
      source: 'urn:test',
      data: { foo: 'bar' },
      outboxUrl: 'http://example.com',
    };

    const envelope = await send(params);

    expect(axios.post).toHaveBeenCalledWith(params.outboxUrl, envelope);
    expect(envelope).toMatchObject({
      type: params.type,
      source: params.source,
      data: params.data,
    });
  });

  it('propagates errors from axios', async () => {
    const axios = (await import('axios')).default as { post: ReturnType<typeof vi.fn> };
    axios.post.mockRejectedValue(new Error('network error'));

    const { send } = await import('./send.js');

    await expect(
      send({
        type: 'event.test.v1',
        source: 'urn:test',
        data: {},
        outboxUrl: 'http://example.com',
      }),
    ).rejects.toThrow('network error');
  });
});
