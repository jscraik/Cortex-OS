import { Command } from 'commander';
// FIXME: Need to migrate to simlab-mono equivalents
import { tracer } from '@cortex-os/telemetry';

export default new Command('run')
  .description('Run a simlab scenario')
  .requiredOption('--id <id>')
  .option('--steps <n>', 'max steps', '50')
  .option('--seed <n>', 'seed', '42')
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const span = tracer.startSpan('cli.simlab.run');
    try {
      // FIXME: Migration in progress - simlab-mono architecture is different
      console.log('SimLab migration in progress - run functionality temporarily disabled');
      console.log('Options received:', opts);
      return;
    } finally {
      span.end();
    }
  });
