import { Bus } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';

export async function runProducer() {
  const bus = new Bus(inproc());
  await bus.publish({ id: crypto.randomUUID(), type: 'event.ping.v1', occurredAt: new Date().toISOString(), headers: {}, payload: { ping: true } } as any);
}

