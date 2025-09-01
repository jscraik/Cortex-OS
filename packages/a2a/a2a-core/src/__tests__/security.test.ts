import { describe, it, expect } from 'vitest';
import { createBus } from '../bus.js';
import { createEnvelope, Envelope } from '@cortex-os/a2a-contracts/envelope';
import { createMemoryIdempotencyStore } from '../lib/memory-id-store.js';
import type { Transport } from '../transport.js';
import crypto from 'node:crypto';

class MemoryTransport implements Transport {
  published: Envelope[] = [];
  private handler?: (msg: Envelope) => Promise<void>;
  async publish(e: Envelope): Promise<void> { this.published.push(e); }
  async subscribe(_: string[], handler: (m: Envelope) => Promise<void>) { this.handler = handler; }
  async push(e: Envelope) { await this.handler?.(e); }
}

describe('bus security', () => {
  it('encrypts messages and prevents replay', async () => {
    const key = crypto.randomBytes(32);
    const store = createMemoryIdempotencyStore();
    const transport = new MemoryTransport();
    const bus = createBus(transport, undefined, undefined, { key, store });
    let count = 0;
    await bus.bind([{ type: 't', handle: async (m) => { count++; expect(m.data).toEqual({ secret: 'ok' }); } }]);
    const env = createEnvelope({ type: 't', source: 'urn:test', data: { secret: 'ok' } });
    await bus.publish(env);
    expect(transport.published[0].data).not.toEqual(env.data);
    await transport.push(transport.published[0]);
    await transport.push(transport.published[0]);
    expect(count).toBe(1);
  });
});
