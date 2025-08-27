import { Command } from 'commander';

export const simlabList = new Command('list')
  .description('List built-in envs and agents (stub)')
  .action(async () => {
    process.stdout.write(
      JSON.stringify(
        { envs: ['local-counter', 'python'], agents: ['rule', 'mcp', 'a2a'] },
        null,
        2,
      ) + '\n',
    );
  });
// no default export
