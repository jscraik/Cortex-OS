import { describe, expect, it, vi } from 'vitest';
import * as gateway from '../utils/chat-gateway';

// Helper to create a ReadableStream that yields provided chunks
function streamFromLines(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const l of lines) controller.enqueue(enc.encode(l + '\n'));
      controller.close();
    },
  });
}

describe('chat-gateway', () => {
  it('falls back to echo when backend unavailable', async () => {
    const originalFetch = globalThis.fetch as any;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });

    const onTok = vi.fn();
    const res = await gateway['streamChat'](
      { model: 'test', messages: [{ role: 'user', content: 'Hi' }] as any },
      onTok,
    );

    expect(onTok).toHaveBeenCalled();
    expect(res.text).toContain('Echo:');

    globalThis.fetch = originalFetch;
  });

  it('parses OpenAI-compatible SSE chunks and yields tokens', async () => {
  const prev = process.env.MODEL_API_PROVIDER;
  process.env.MODEL_API_PROVIDER = 'openai';
    const lines = [
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'He' } }] }),
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'llo' } }] }),
      'data: [DONE]',
    ];

    const body = streamFromLines(lines);
    const originalFetch = globalThis.fetch as any;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, body });

    const tokens: string[] = [];
    const res = await gateway['streamChat'](
      { model: 'test', messages: [{ role: 'user', content: 'Hello' }] as any },
      (t) => tokens.push(t),
    );

    expect(tokens.join('')).toBe('Hello');
    expect(res.text).toBe('Hello');

    globalThis.fetch = originalFetch;
  if (prev === undefined) delete process.env.MODEL_API_PROVIDER;
  else process.env.MODEL_API_PROVIDER = prev;
  });
});
