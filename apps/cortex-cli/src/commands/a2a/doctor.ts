import { Command } from 'commander';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import { createBus } from '@cortex-os/a2a-core/bus';
import { tracer } from '@cortex-os/telemetry';
import { uuid } from '@cortex-os/utils';

export const a2aDoctor = new Command('doctor')
  .description('Run A2A health checks')
  .option('--json', 'JSON output')
  .action(async (opts: any) => {
    const span = tracer.startSpan('cli.a2a.doctor');
    try {
      const bus = createBus(inproc());
      await bus.publish({
        id: uuid(),
        type: 'event.health.v1',
        occurredAt: new Date().toISOString(),
        headers: {},
        payload: {},
      } as any);
      if (opts.json) process.stdout.write(JSON.stringify({ ok: true }, null, 2) + '\n');
      else process.stdout.write('A2A OK\n');
    } finally {
      span.end();
    }
  });
