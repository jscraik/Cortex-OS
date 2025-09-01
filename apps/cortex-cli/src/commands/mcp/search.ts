import type { ServerManifest } from '@cortex-os/mcp-registry/src/types';
import { Command } from 'commander';
import { createMarketplaceClient, type SearchOptions } from './marketplace-client.js';

export const mcpSearch = new Command('search')
  .description('Search MCP servers in the marketplace')
  .argument('[query]', 'Search query (name, description, tags)')
  .option('--category <category>', 'Filter by category (development, productivity, data, etc.)')
  .option('--tags <tags>', 'Filter by tags (comma-separated)', (val) =>
    val.split(',').map((t) => t.trim())
  )
  .option('--risk-level <level>', 'Filter by risk level (low, medium, high)')
  .option('--verified-only', 'Show only verified publishers')
  .option('--registry <url>', 'Custom registry URL')
  .option('--json', 'Output in JSON format')
  .option('--limit <number>', 'Limit number of results', (v) => parseInt(v, 10))
  .action(async (query: string | undefined, options: Record<string, unknown>) => {
    await runSearchAction(query, options);
  });

async function runSearchAction(query: string | undefined, options: Record<string, unknown>) {
  try {
    const registry = getOpt<string>(options, 'registry');
    const client = createMarketplaceClient(registry ? { registryUrl: registry } : {});

    const searchOptions: SearchOptions = {
      category: getOpt<string>(options, 'category'),
      tags: getOpt<string[]>(options, 'tags'),
      riskLevel: getOpt<'low' | 'medium' | 'high'>(options, 'riskLevel'),
      verifiedOnly: !!getOpt<boolean>(options, 'verifiedOnly'),
      limit: getOpt<number>(options, 'limit'),
    };

    const servers = await client.search(query ?? '', searchOptions);
    const limit = searchOptions.limit;
    const limitedServers = typeof limit === 'number' ? servers.slice(0, limit) : servers;

    if (getOpt<boolean>(options, 'json')) {
      printJsonResults(query, searchOptions, limitedServers);
      return;
    }

    printPrettyResults(query, limitedServers);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    if (getOpt<boolean>(options, 'json')) {
      process.stderr.write(`${JSON.stringify({ error: message }, null, 2)}\n`);
    } else {
      process.stderr.write(`Error: ${message}\n`);
    }
    process.exit(1);
  }
}

function printJsonResults(
  query: string | undefined,
  options: SearchOptions,
  servers: ServerManifest[]
): void {
  process.stdout.write(
    `${JSON.stringify({ query, options, count: servers.length, servers }, null, 2)}\n`
  );
}

function printPrettyResults(query: string | undefined, servers: ServerManifest[]): void {
  if (servers.length === 0) {
    process.stdout.write(`No MCP servers found matching "${query ?? ''}"\n`);
    return;
  }

  process.stdout.write(`Found ${servers.length} MCP server${servers.length === 1 ? '' : 's'}:\n\n`);

  for (const server of servers) {
    printServer(server);
  }

  process.stdout.write('Commands:\n');
  process.stdout.write('  cortex mcp show <server-id>     Show detailed info\n');
  process.stdout.write('  cortex mcp add <server-id>      Add to local registry\n');
}

function printServer(server: ServerManifest): void {
  const riskBadge = getRiskBadge(server.security?.riskLevel || 'medium');
  const verifiedBadge = server.security?.verifiedPublisher ? ' ✓' : '';
  const categories = server.category;
  const tags = server.tags ? ` [${server.tags.join(', ')}]` : '';

  process.stdout.write(`${server.id}${verifiedBadge} ${riskBadge}\n`);
  process.stdout.write(`  ${server.name} - ${server.description || 'No description'}\n`);
  process.stdout.write(`  Category: ${categories}${tags}\n`);
  process.stdout.write(`  Owner: ${server.owner}\n`);

  if (server.version) {
    process.stdout.write(`  Version: ${server.version}\n`);
  }

  const transports = Object.keys(server.transports).join(', ');
  process.stdout.write(`  Transports: ${transports}\n`);

  if (server.repo) {
    process.stdout.write(`  Repository: ${server.repo}\n`);
  }

  process.stdout.write('\n');
}

function getOpt<T>(opts: Record<string, unknown>, key: string): T | undefined {
  return (opts[key] as T) ?? undefined;
}

function getRiskBadge(riskLevel: 'low' | 'medium' | 'high'): string {
  switch (riskLevel) {
    case 'low':
      return '🟢';
    case 'medium':
      return '🟡';
    case 'high':
      return '🔴';
    default:
      return '🟡';
  }
}
