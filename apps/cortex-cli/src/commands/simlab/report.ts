import { Command } from 'commander';

export const simlabReport = new Command('report')
  .description('Render a Markdown report from a JSON RunResult (stdin)')
  .action(async () => {
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) chunks.push(c as Buffer);
    const input = Buffer.concat(chunks).toString('utf8');
    const run = JSON.parse(input);
    process.stdout.write(
      '# SimLab Report\n\nMigration in progress - markdown functionality not yet available in simlab.\n\n```json\n' +
        JSON.stringify(run, null, 2) +
        '\n```\n',
    );
  });
// no default export
