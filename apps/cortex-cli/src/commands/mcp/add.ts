import { Command } from 'commander';
import { upsert } from '@cortex-os/mcp-registry/fs-store';
import { ServerInfoSchema } from '@cortex-os/mcp-core/contracts';

export const mcpAdd = new Command('add')
  .description('Add an MCP server')
  .argument('<name>')
  // @ts-ignore commander typing of union optional
  .requiredOption('--transport <stdio|sse|https>')
  .option('--endpoint <url>', 'For sse/https')
  .option('--command <path>', 'For stdio')
  .option('--args <...>', 'JSON array of args', '[]')
  .option('--json', 'JSON output')
  .action(async (name: string, opts: any) => {
    const candidate = {
      name,
      transport: opts.transport,
      endpoint: opts.endpoint,
      command: opts.command,
      args: JSON.parse(opts.args ?? '[]'),
    };
    const si = ServerInfoSchema.parse(candidate);
    await upsert(si);
    if (opts.json) process.stdout.write(JSON.stringify({ ok: true, added: si }, null, 2) + '\n');
    else process.stdout.write(`Added MCP server: ${si.name}\n`);
  });
