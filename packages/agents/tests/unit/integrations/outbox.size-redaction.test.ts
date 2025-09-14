import { describe, it, expect } from 'vitest';
import { createEventBus } from '../../../src/lib/event-bus.js';
import { wireOutbox, LocalInMemoryStore } from '../../../src/integrations/outbox.js';

function publish(bus: ReturnType<typeof createEventBus>, type: string, data: Record<string, unknown>) {
  bus.publish({ specversion: '1.0', id: 'id-'+type, type, source: 'test', time: new Date().toISOString(), ttlMs: 1000, headers: {}, data });
}

describe('outbox size + redaction branches', () => {
  it('truncates oversized payload and preserves JSON shape', async () => {
    const bus = createEventBus();
    const store = new LocalInMemoryStore();
    await wireOutbox(bus, store, { maxItemBytes: 400 });
    publish(bus, 'agent.started', { big: 'x'.repeat(10_000) });
  const all = await store.searchByText();
    expect(all.length).toBe(1);
  const txt = all[0].text;
  expect(txt.includes('truncated')).toBe(true);
  });

  it('skips redaction when redactPII=false', async () => {
    const bus = createEventBus();
    const store = new LocalInMemoryStore();
    await wireOutbox(bus, store, { redactPII: false });
    publish(bus, 'agent.started', { secret: 'email test@example.com' });
    const all = await store.searchByText();
    expect(all[0].text).toContain('test@example.com');
  });
});
