import { Bus, type Handler } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';

export async function runConsumer() {
  const bus = new Bus(inproc());
  const handler: Handler = { type: 'event.ping.v1', handle: async () => {} };
  await bus.bind([handler]);
}
