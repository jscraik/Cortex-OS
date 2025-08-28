import { Command } from 'commander';
import { createMarketplaceClient, SearchOptions } from './marketplace-client.js';

export const mcpSearch = new Command('search')
  .description('Search MCP servers in the marketplace')
  .argument('[query]', 'Search query (name, description, tags)')
  .option('--category <category>', 'Filter by category (development, productivity, data, etc.)')
  .option('--tags <tags>', 'Filter by tags (comma-separated)', (val) =>
    val.split(',').map((t) => t.trim()),
  )
  .option('--risk-level <level>', 'Filter by risk level (low, medium, high)')
  .option('--verified-only', 'Show only verified publishers')
  .option('--registry <url>', 'Custom registry URL')
  .option('--json', 'Output in JSON format')
  .option('--limit <number>', 'Limit number of results', parseInt)
  .action(async (query = '', options: any) => {
    try {
      const client = createMarketplaceClient(
        options.registry ? { registryUrl: options.registry } : {},
      );

      const searchOptions: SearchOptions = {
        category: options.category,
        tags: options.tags,
        riskLevel: options.riskLevel,
        verifiedOnly: options.verifiedOnly,
      };

      const servers = await client.search(query, searchOptions);

      // Apply limit if specified
      const limitedServers = options.limit ? servers.slice(0, options.limit) : servers;

      if (options.json) {
        process.stdout.write(
          JSON.stringify(
            {
              query,
              options: searchOptions,
              count: limitedServers.length,
              servers: limitedServers,
            },
            null,
            2,
          ) + '\n',
        );
      } else {
        if (limitedServers.length === 0) {
          process.stdout.write(`No MCP servers found matching "${query}"\n`);
          return;
        }

        process.stdout.write(
          `Found ${limitedServers.length} MCP server${limitedServers.length === 1 ? '' : 's'}:\n\n`,
        );

        for (const server of limitedServers) {
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

          // Show available transports
          const transports = Object.keys(server.transports).join(', ');
          process.stdout.write(`  Transports: ${transports}\n`);

          if (server.repo) {
            process.stdout.write(`  Repository: ${server.repo}\n`);
          }

          process.stdout.write('\n');
        }

        // Show helpful commands
        process.stdout.write('Commands:\n');
        process.stdout.write('  cortex mcp show <server-id>     Show detailed info\n');
        process.stdout.write('  cortex mcp add <server-id>      Add to local registry\n');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      if (options.json) {
        process.stderr.write(JSON.stringify({ error: message }, null, 2) + '\n');
      } else {
        process.stderr.write(`Error: ${message}\n`);
      }
      process.exit(1);
    }
  });

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
