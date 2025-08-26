import { Command } from 'commander';

const evalCmd = new Command('eval')
  .description('Evaluate RAG results (stub)')
  .option('--dataset <path>', 'Path to eval dataset')
  .action(async () => {
    process.stdout.write('eval not implemented yet\n');
  });

export default evalCmd;
