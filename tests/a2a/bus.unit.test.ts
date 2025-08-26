import { describe, it, expect } from 'vitest';
import { Bus, type Handler } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';

describe('Bus', () => {
  it('routes by type', async () => {
    const bus = new Bus(inproc());
    let got = false;
    const handler: Handler = { type: 'event.ping.v1', handle: async () => { got = true; } };
    await bus.bind([handler]);
    await bus.publish({ id: crypto.randomUUID(), type: 'event.ping.v1', occurredAt: new Date().toISOString(), headers: {}, payload: {} } as any);
    expect(got).toBe(true);
  });
});
