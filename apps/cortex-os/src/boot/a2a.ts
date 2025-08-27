import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';
import { Bus } from '@cortex-os/a2a-core/bus';
import { healthHandler } from '@cortex-os/a2a-handlers/health.handler';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import { configureAuditPublisherWithBus } from '@cortex-os/orchestration';

export function wireA2A() {
  const bus = new Bus(inproc());
  bus.bind([healthHandler]);
  // Audit events -> A2A 'audit.event'
  configureAuditPublisherWithBus((evt) => {
    void bus.publish(
      createEnvelope({ type: 'audit.event', data: evt, source: 'urn:cortex-os:audit' }),
    );
  });
  return bus;
}
