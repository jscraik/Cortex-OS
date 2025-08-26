import { Bus } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import { healthHandler } from '@cortex-os/a2a-handlers/health.handler';

export function wireA2A() {
  const bus = new Bus(inproc());
  bus.bind([healthHandler]);
  return bus;
}

