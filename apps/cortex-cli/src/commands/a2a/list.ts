import { Command } from 'commander';

export const a2aList = new Command('list')
  .description('List built-in A2A handlers')
  .action(async () => {
    // Minimal: show health handler
    process.stdout.write('event.health.v1\n');
  });
