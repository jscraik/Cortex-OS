import { Command } from 'commander';
import { createMarketplaceClient } from './marketplace-client.js';
import { ServerManifest, SupportedClient } from '@cortex-os/mcp-registry/types';

export const mcpShow = new Command('show')
  .description('Show detailed information about an MCP server')
  .argument('<server-id>', 'Server ID to display')
  .option('--registry <url>', 'Custom registry URL')
  .option('--json', 'Output in JSON format')
  .option(
    '--client <type>',
    'Show install command for specific client (claude, cline, devin, cursor, continue, windsurf)',
  )
  .action(async (serverId: string, options: any) => {
    try {
      const client = createMarketplaceClient(
        options.registry ? { registryUrl: options.registry } : {},
      );

      const server = await client.getServer(serverId);

      if (!server) {
        if (options.json) {
          process.stderr.write(
            JSON.stringify({ error: `Server "${serverId}" not found` }, null, 2) + '\n',
          );
        } else {
          process.stderr.write(`Error: MCP server "${serverId}" not found in marketplace\n`);
          process.stderr.write('Try: cortex mcp search <query> to find available servers\n');
        }
        process.exit(1);
      }

      if (options.json) {
        process.stdout.write(JSON.stringify(server, null, 2) + '\n');
      } else {
        displayServerInfo(server, options.client);
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

function displayServerInfo(server: ServerManifest, showClient?: string) {
  const verifiedBadge = server.security?.verifiedPublisher ? ' ✓ Verified' : '';
  const riskBadge = getRiskBadge(server.security?.riskLevel || 'medium');

  process.stdout.write(`${server.name}${verifiedBadge} ${riskBadge}\n`);
  process.stdout.write('='.repeat(server.name.length + verifiedBadge.length + 2) + '\n\n');

  // Basic info
  process.stdout.write(`ID: ${server.id}\n`);
  process.stdout.write(`Owner: ${server.owner}\n`);
  process.stdout.write(`Category: ${server.category}\n`);

  if (server.version) {
    process.stdout.write(`Version: ${server.version}\n`);
  }

  if (server.license) {
    process.stdout.write(`License: ${server.license}\n`);
  }

  process.stdout.write('\n');

  // Description
  if (server.description) {
    process.stdout.write(`Description:\n${server.description}\n\n`);
  }

  // Tags
  if (server.tags && server.tags.length > 0) {
    process.stdout.write(`Tags: ${server.tags.join(', ')}\n\n`);
  }

  // Links
  if (server.repo || server.homepage) {
    process.stdout.write('Links:\n');
    if (server.repo) process.stdout.write(`  Repository: ${server.repo}\n`);
    if (server.homepage) process.stdout.write(`  Homepage: ${server.homepage}\n`);
    process.stdout.write('\n');
  }

  // Security
  process.stdout.write('Security:\n');
  process.stdout.write(`  Risk Level: ${server.security?.riskLevel || 'medium'}\n`);
  process.stdout.write(
    `  Verified Publisher: ${server.security?.verifiedPublisher ? 'Yes' : 'No'}\n`,
  );

  if (server.security?.sigstoreBundle) {
    process.stdout.write(`  Sigstore Bundle: ${server.security.sigstoreBundle}\n`);
  }

  if (server.security?.sbom) {
    process.stdout.write(`  SBOM: ${server.security.sbom}\n`);
  }

  process.stdout.write('\n');

  // Permissions
  process.stdout.write('Required Permissions:\n');
  for (const scope of server.scopes) {
    process.stdout.write(`  • ${scope}\n`);
  }
  process.stdout.write('\n');

  // Transports
  process.stdout.write('Available Transports:\n');

  if (server.transports.stdio) {
    const stdio = server.transports.stdio;
    process.stdout.write(`  • stdio: ${stdio.command}\n`);
    if (stdio.args && stdio.args.length > 0) {
      process.stdout.write(`    Args: ${stdio.args.join(' ')}\n`);
    }
  }

  if (server.transports.sse) {
    process.stdout.write(`  • sse: ${server.transports.sse.url}\n`);
  }

  if (server.transports.streamableHttp) {
    process.stdout.write(`  • streamableHttp: ${server.transports.streamableHttp.url}\n`);
  }

  process.stdout.write('\n');

  // Authentication
  if (server.oauth && server.oauth.authType !== 'none') {
    process.stdout.write('Authentication:\n');
    process.stdout.write(`  Type: ${server.oauth.authType}\n`);

    if (server.oauth.authType === 'oauth2') {
      if (server.oauth.authorizationEndpoint) {
        process.stdout.write(`  Authorization: ${server.oauth.authorizationEndpoint}\n`);
      }
      if (server.oauth.tokenEndpoint) {
        process.stdout.write(`  Token: ${server.oauth.tokenEndpoint}\n`);
      }
      if (server.oauth.scopes) {
        process.stdout.write(`  Scopes: ${server.oauth.scopes.join(', ')}\n`);
      }
    }

    process.stdout.write('\n');
  }

  // Installation commands
  process.stdout.write('Installation:\n');

  if (showClient && isValidClient(showClient)) {
    const installCmd = server.install[showClient as SupportedClient];
    if (installCmd) {
      if (showClient === 'json') {
        process.stdout.write('  JSON Config:\n');
        process.stdout.write(
          JSON.stringify(installCmd, null, 4)
            .split('\n')
            .map((line) => `    ${line}`)
            .join('\n') + '\n',
        );
      } else {
        process.stdout.write(`  ${showClient}: ${installCmd}\n`);
      }
    } else {
      process.stdout.write(`  No installation command available for ${showClient}\n`);
    }
  } else {
    // Show all available clients
    const clients = Object.keys(server.install);
    for (const client of clients) {
      if (client === 'json') {
        process.stdout.write('  json: <configuration object>\n');
      } else {
        process.stdout.write(`  ${client}: ${server.install[client as SupportedClient]}\n`);
      }
    }
  }

  process.stdout.write('\n');

  // Quick commands
  process.stdout.write('Quick Commands:\n');
  process.stdout.write(`  cortex mcp add ${server.id}                    Add to local registry\n`);

  const clients = Object.keys(server.install).filter((c) => c !== 'json');
  if (clients.length > 0) {
    process.stdout.write(
      `  cortex mcp show ${server.id} --client ${clients[0]}    Show install command for ${clients[0]}\n`,
    );
  }
}

function getRiskBadge(riskLevel: 'low' | 'medium' | 'high'): string {
  switch (riskLevel) {
    case 'low':
      return '🟢 Low Risk';
    case 'medium':
      return '🟡 Medium Risk';
    case 'high':
      return '🔴 High Risk';
    default:
      return '🟡 Medium Risk';
  }
}

function isValidClient(client: string): client is SupportedClient {
  return ['claude', 'cline', 'devin', 'cursor', 'continue', 'windsurf', 'json'].includes(client);
}
