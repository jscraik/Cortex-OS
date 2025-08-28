import { describe, expect, it, vi } from 'vitest';

// Mock chat-store and gateway
vi.mock('../utils/chat-store', () => ({
  getSession: vi.fn().mockReturnValue({
    modelId: 'test-model',
    messages: [{ id: 'm1', role: 'user', content: 'Hi' }],
  }),
  addMessage: vi.fn(),
}));

vi.mock('../utils/chat-gateway', () => ({
  streamChat: vi.fn(async (_params: any, onTok: (t: string) => void) => {
    onTok('He');
    onTok('llo');
    return { text: 'Hello' };
  }),
}));

describe('SSE stream route contract', () => {
  it('emits start, token(s), done', async () => {
    const { GET: streamGET } = await import('../app/api/chat/[sessionId]/stream/route');
    const res = await streamGET(new Request('http://x'), { params: { sessionId: 's1' } });
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const dec = new TextDecoder();
    const chunks: string[] = [];

    // Read full stream
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(dec.decode(value));
    }

    const out = chunks.join('');
    expect(out).toContain('"type":"start"');
    expect(out).toContain('"type":"token"');
    expect(out).toContain('"type":"done"');
  });
});
