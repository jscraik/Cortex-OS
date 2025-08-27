import { describe, expect, it } from 'vitest';
import { Bus } from '../a2a-core/src/bus.js';
import { inproc } from '../a2a-transport/src/inproc.js';

describe('inproc duplicate handling', () => {
  it('delivers duplicate messages without deduplication', async () => {
    const bus = new Bus(inproc());
    let count = 0;
    await bus.bind([
      {
        type: 'event.dup.v1',
        handle: async () => {
          count++;
        },
      },
    ]);
    const msg = {
      id: '00000000-0000-0000-0000-000000000002',
      type: 'event.dup.v1',
      occurredAt: '2024-01-01T00:00:00.000Z',
      headers: {},
      payload: {},
    };
    await bus.publish(msg as any);
    await bus.publish(msg as any);
    expect(count).toBe(2);
  });
});
