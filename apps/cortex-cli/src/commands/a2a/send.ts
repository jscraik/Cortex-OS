import { Command } from 'commander';
import { Bus } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import { uuid } from '@cortex-os/utils';

export const a2aSend = new Command('send')
  .description('Send an A2A message')
  .requiredOption('--type <string>')
  .requiredOption('--payload <json>')
  .action(async (opts: any) => {
    const bus = new Bus(inproc());
    await bus.publish({
      id: uuid(),
      type: opts.type,
      occurredAt: new Date().toISOString(),
      payload: JSON.parse(opts.payload),
      headers: {},
    } as any);
    process.stdout.write('sent\n');
  });