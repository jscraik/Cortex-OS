import { Command } from 'commander';
import { upsert } from '@cortex-os/mcp-registry/fs-store';
import { ServerInfoSchema } from '@cortex-os/mcp-core/contracts';
import { createMarketplaceClient } from './marketplace-client.js';
import { SupportedClient } from '@cortex-os/mcp-registry/types';

export const mcpAdd = new Command('add')
  .description('Add an MCP server (from marketplace or manual configuration)')
  .argument('<name-or-id>', 'Server name/ID from marketplace, or custom name for manual config')
  .option('--transport <stdio|sse|https>', 'Transport type (required for manual config)')
  .option('--endpoint <url>', 'Endpoint URL (for sse/https transport)')
  .option('--command <path>', 'Command path (for stdio transport)')
  .option('--args <args>', 'JSON array of command arguments', '[]')
  .option('--client <type>', 'Client type for marketplace install (claude, cline, devin, cursor, continue, windsurf)')
  .option('--transport-type <type>', 'Preferred transport from marketplace server (stdio, sse, streamableHttp)')
  .option('--registry <url>', 'Custom registry URL')
  .option('--force', 'Force add even if server exists')
  .option('--json', 'JSON output')
  .action(async (nameOrId: string, opts: any) => {
    try {
      // If transport is specified, treat as manual configuration
      if (opts.transport) {
        await addManualServer(nameOrId, opts);
      } else {
        // Otherwise, try to add from marketplace
        await addFromMarketplace(nameOrId, opts);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      if (opts.json) {
        process.stderr.write(JSON.stringify({ error: message }, null, 2) + '\n');
      } else {
        process.stderr.write(`Error: ${message}\n`);
      }
      process.exit(1);
    }
  });

async function addManualServer(name: string, opts: any) {
  if (!opts.transport) {
    throw new Error('--transport is required for manual server configuration');
  }

  const candidate = {
    name,
    transport: opts.transport,
    endpoint: opts.endpoint,
    command: opts.command,
    args: JSON.parse(opts.args ?? '[]'),
  };

  const si = ServerInfoSchema.parse(candidate);
  await upsert(si);
  
  if (opts.json) {
    process.stdout.write(JSON.stringify({ ok: true, added: si, source: 'manual' }, null, 2) + '\n');
  } else {
    process.stdout.write(`Added MCP server: ${si.name} (manual configuration)\n`);
  }
}

async function addFromMarketplace(serverId: string, opts: any) {
  const client = createMarketplaceClient(opts.registry ? { registryUrl: opts.registry } : {});
  
  const server = await client.getServer(serverId);
  if (!server) {
    throw new Error(`Server "${serverId}" not found in marketplace. Use "cortex mcp search" to find available servers.`);
  }

  // Verify server signature if enabled
  const signatureValid = await client.verifySignature(server);
  if (!signatureValid) {
    throw new Error(`Server "${serverId}" failed signature verification. Use --force to add anyway.`);
  }

  // Determine transport to use
  const transportType = opts.transportType || getPreferredTransport(server.transports);
  const transportConfig = server.transports[transportType];
  
  if (!transportConfig) {
    throw new Error(`Transport "${transportType}" not available. Available: ${Object.keys(server.transports).join(', ')}`);
  }

  // Convert marketplace server to local server info
  let serverInfo;
  
  if (transportType === 'stdio' && 'command' in transportConfig) {
    serverInfo = {
      name: server.id,
      transport: 'stdio' as const,
      command: transportConfig.command,
      args: transportConfig.args || [],
    };
  } else if (transportType === 'sse' && 'url' in transportConfig) {
    serverInfo = {
      name: server.id,
      transport: 'sse' as const,
      endpoint: transportConfig.url,
    };
  } else if (transportType === 'streamableHttp' && 'url' in transportConfig) {
    serverInfo = {
      name: server.id,
      transport: 'https' as const,
      endpoint: transportConfig.url,
    };
  } else {
    throw new Error(`Unsupported transport configuration for ${transportType}`);
  }

  const si = ServerInfoSchema.parse(serverInfo);
  await upsert(si);

  if (opts.json) {
    process.stdout.write(JSON.stringify({ 
      ok: true, 
      added: si, 
      source: 'marketplace',
      marketplaceInfo: {
        id: server.id,
        name: server.name,
        owner: server.owner,
        version: server.version,
        category: server.category,
        riskLevel: server.security?.riskLevel || 'medium',
        verified: server.security?.verifiedPublisher || false,
      }
    }, null, 2) + '\n');
  } else {
    const riskBadge = getRiskBadge(server.security?.riskLevel || 'medium');
    const verifiedBadge = server.security?.verifiedPublisher ? ' ✓' : '';
    
    process.stdout.write(`Added MCP server: ${server.name}${verifiedBadge} ${riskBadge}\n`);
    process.stdout.write(`  ID: ${server.id}\n`);
    process.stdout.write(`  Transport: ${transportType}\n`);
    process.stdout.write(`  Owner: ${server.owner}\n`);
    
    if (server.description) {
      process.stdout.write(`  Description: ${server.description}\n`);
    }
    
    // Show client-specific install command if requested
    if (opts.client && isValidClient(opts.client)) {
      const installCmd = server.install[opts.client];
      if (installCmd) {
        process.stdout.write(`\n${opts.client} install command:\n`);
        if (opts.client === 'json') {
          process.stdout.write(JSON.stringify(installCmd, null, 2) + '\n');
        } else {
          process.stdout.write(`  ${installCmd}\n`);
        }
      }
    }
  }
}

function getPreferredTransport(transports: any): string {
  // Prefer stdio, then sse, then streamableHttp
  if (transports.stdio) return 'stdio';
  if (transports.sse) return 'sse';
  if (transports.streamableHttp) return 'streamableHttp';
  throw new Error('No supported transport found');
}

function getRiskBadge(riskLevel: 'low' | 'medium' | 'high'): string {
  switch (riskLevel) {
    case 'low': return '🟢';
    case 'medium': return '🟡';
    case 'high': return '🔴';
    default: return '🟡';
  }
}

function isValidClient(client: string): client is SupportedClient {
  return ['claude', 'cline', 'devin', 'cursor', 'continue', 'windsurf', 'json'].includes(client);
}
