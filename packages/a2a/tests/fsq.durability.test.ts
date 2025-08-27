import { promises as fs } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { Bus } from '../a2a-core/src/bus.js';
import { fsQueue } from '../a2a-transport/src/fsq.js';

const queueName = 'durability-test';
const queueDir = join(os.homedir(), '.cortex', 'a2a', queueName);

beforeEach(async () => {
  await fs.rm(queueDir, { recursive: true, force: true });
});

describe('fsQueue durability', () => {
  it('does not redeliver messages after restart', async () => {
    const bus = new Bus(fsQueue(queueName));
    const msg = {
      id: '00000000-0000-0000-0000-000000000001',
      type: 'event.durable.v1',
      occurredAt: '2024-01-01T00:00:00.000Z',
      headers: {},
      payload: {},
    };
    let count = 0;
    await bus.bind([
      {
        type: 'event.durable.v1',
        handle: async () => {
          count++;
        },
      },
    ]);
    await bus.publish(msg as any);
    expect(count).toBe(1);

    const bus2 = new Bus(fsQueue(queueName));
    await bus2.bind([
      {
        type: 'event.durable.v1',
        handle: async () => {
          count++;
        },
      },
    ]);
    expect(count).toBe(1);
  });
});
