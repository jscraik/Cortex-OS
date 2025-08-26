import { it, expect } from 'vitest';
import { fsQueue } from '@cortex-os/a2a-transport/fsq';

it('fsq publishes and notifies subscribers', async () => {
  const t = fsQueue(`test-${Date.now()}`);
  let seen = false;
  await t.subscribe(['event.x'], async () => { seen = true; });
  await t.publish({ id: crypto.randomUUID(), type: 'event.x', occurredAt: new Date().toISOString(), headers: {}, payload: {} } as any);
  expect(seen).toBe(true);
});
