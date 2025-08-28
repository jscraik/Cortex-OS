import { describe, it, expect } from 'vitest';
import { createBus, type Handler } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import { uuid } from '@cortex-os/utils';

describe.skip('A2A ping-pong e2e', () => {
  it('producer to consumer', async () => {
    const { publish, bind } = createBus(inproc());
    let pong = false;
    const consumer: Handler = {
      type: 'event.ping.v1',
      handle: async () => {
        pong = true;
      },
    };
    await bind([consumer]);
    await publish({
      id: uuid(),
      type: 'event.ping.v1',
      occurredAt: new Date().toISOString(),
      headers: {},
      payload: {},
    } as any);
    expect(pong).toBe(true);
  });
});
