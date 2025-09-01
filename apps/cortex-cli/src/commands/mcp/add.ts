import { type ServerInfo, ServerInfoSchema } from '@cortex-os/mcp-core/contracts';
import type { ServerManifest, SupportedClient } from '@cortex-os/mcp-registry';
import { upsert } from '@cortex-os/mcp-registry/fs-store';
import { Command } from 'commander';
import { createMarketplaceClient } from './marketplace-client.js';

type TransportKind = 'stdio' | 'sse' | 'streamableHttp';
type TransportKindWithHttp = TransportKind | 'http';

interface AddOptions {
  transport?: TransportKindWithHttp;
  endpoint?: string;
  command?: string;
  args?: string;
  header?: string[];
  env?: string[];
  client?: string;
  transportType?: TransportKindWithHttp;
  registry?: string;
  force?: boolean;
  json?: boolean;
}

export const mcpAdd = new Command('add')
  .description('Add an MCP server (from marketplace or manual configuration)')
  .argument('<name-or-id>', 'Server name/ID from marketplace, or custom name for manual config')
  .argument('[rest...]', 'Optional: positional URL for sse/http or stdio command and args')
  .option(
    '--transport <stdio|sse|streamableHttp|http>',
    'Transport type (required for manual config)'
  )
  .option('--endpoint <url>', 'Endpoint URL (for sse/streamableHttp transport)')
  .option('--command <path>', 'Command path (for stdio transport)')
  .option('--args <args>', 'JSON array of command arguments', '[]')
  .option(
    '--header <header>',
    'Repeatable HTTP header (e.g. "Authorization: Bearer TOKEN")',
    collectRepeatable,
    []
  )
  .option('--env <kv>', 'Repeatable env var for stdio transport (KEY=VALUE)', collectRepeatable, [])
  .option(
    '--client <type>',
    'Client type for marketplace install (claude, cline, devin, cursor, continue, windsurf)'
  )
  .option(
    '--transport-type <type>',
    'Preferred transport from marketplace server (stdio, sse, streamableHttp)'
  )
  .option('--registry <url>', 'Custom registry URL')
  .option('--force', 'Force add even if server exists')
  .option('--json', 'JSON output')
  .action(async (nameOrId: string, rest: string[] | undefined, opts: AddOptions) => {
    try {
      const restArgs = Array.isArray(rest) ? rest : [];
      // If transport is specified, or we detect manual positional patterns, treat as manual configuration
      if (opts.transport || isManualPositional(restArgs)) {
        await addManualServer(nameOrId, restArgs, opts);
      } else {
        // Otherwise, try to add from marketplace
        await addFromMarketplace(nameOrId, opts);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      if (opts.json) process.stderr.write(`${JSON.stringify({ error: message }, null, 2)}\n`);
      else process.stderr.write(`Error: ${message}\n`);
      process.exit(1);
    }
  });

function collectRepeatable(value: string, previous: string[]) {
  previous.push(value);
  return previous;
}

function isUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return !!u.protocol && (u.protocol === 'http:' || u.protocol === 'https:');
  } catch {
    return false;
  }
}

function isManualPositional(rest: string[]): boolean {
  return Array.isArray(rest) && rest.length > 0;
}

async function addManualServer(name: string, rest: string[], opts: AddOptions) {
  // Normalize transport alias
  let transport: ServerInfo['transport'] | undefined = opts.transport;
  if (transport === 'http') transport = 'streamableHttp';

  let endpoint = opts.endpoint;
  let command = opts.command;
  let args: string[] = [];

  // Allow positional URL for sse/http
  if (!endpoint && rest.length > 0 && isUrl(rest[0])) {
    endpoint = rest[0];
  }

  // Allow stdio passthrough or default http based on positional
  const providedArgs = safeParseJsonArray(opts.args);
  ({ transport, command, args } = inferTransportAndCommand(
    transport,
    command,
    args,
    rest,
    endpoint,
    providedArgs
  ));

  if (!transport) {
    throw new Error(
      '--transport is required for manual server configuration unless using positional syntax'
    );
  }

  const si = buildManualCandidate({
    name,
    transport,
    endpoint,
    command,
    args,
    providedArgs,
    headers: parseKeyValues(opts.header as string[]),
    env: parseEnv(opts.env as string[]),
  });
  await upsert(si);

  if (opts.json) {
    process.stdout.write(`${JSON.stringify({ ok: true, added: si, source: 'manual' }, null, 2)}\n`);
  } else {
    process.stdout.write(`Added MCP server: ${si.name} (manual configuration)\n`);
  }
}

function buildManualCandidate(input: {
  name: string;
  transport: ServerInfo['transport'] | undefined;
  endpoint?: string;
  command?: string;
  args: string[];
  providedArgs: string[];
  headers: Record<string, string>;
  env: Record<string, string>;
}): ServerInfo {
  const { name, transport, endpoint, command, args, providedArgs, headers, env } = input;
  if (!transport) throw new Error('Transport resolution failed');
  const candidate: Partial<ServerInfo> = { name, transport };
  if (transport === 'stdio') {
    if (!command) throw new Error('Missing command for stdio transport');
    candidate.command = command;
    candidate.args = [...args, ...providedArgs];
    if (Object.keys(env).length > 0) candidate.env = env;
  } else {
    if (!endpoint) throw new Error('Missing endpoint URL for sse/http transport');
    candidate.endpoint = endpoint;
    if (Object.keys(headers).length > 0) candidate.headers = headers;
  }
  return ServerInfoSchema.parse(candidate);
}

function inferTransportAndCommand(
  t: ServerInfo['transport'] | undefined,
  cmd: string | undefined,
  argList: string[],
  rest: string[],
  endpoint: string | undefined,
  providedArgs: string[]
) {
  let transport = t;
  let command = cmd;
  let args = argList;
  if ((!transport && rest.length > 0 && !isUrl(rest[0])) || transport === 'stdio') {
    transport = 'stdio';
    if (!command && rest.length > 0) {
      command = rest[0];
      args = rest.slice(1);
    }
  } else if (!transport && endpoint) {
    transport = 'streamableHttp';
  }
  args = [...args, ...providedArgs];
  return { transport, command, args } as const;
}

function safeParseJsonArray(x: unknown): string[] {
  try {
    if (typeof x === 'string') return JSON.parse(x ?? '[]');
    return Array.isArray(x) ? (x as string[]) : [];
  } catch {
    return [];
  }
}

function parseKeyValues(items: string[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!items) return out;
  for (const raw of items) {
    const idx = raw.indexOf(':');
    const eq = raw.indexOf('=');
    let key = '';
    let val = '';
    if (idx > 0) {
      key = raw.slice(0, idx).trim();
      val = raw.slice(idx + 1).trim();
    } else if (eq > 0) {
      key = raw.slice(0, eq).trim();
      val = raw.slice(eq + 1).trim();
    }
    if (!key) continue;
    out[key] = val;
  }
  return out;
}

function parseEnv(items: string[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!items) return out;
  for (const raw of items) {
    const eq = raw.indexOf('=');
    if (eq <= 0) continue;
    const key = raw.slice(0, eq).trim();
    const val = raw.slice(eq + 1).trim();
    if (!key) continue;
    out[key] = val;
  }
  return out;
}

async function addFromMarketplace(serverId: string, opts: AddOptions) {
  const client = createMarketplaceClient(opts.registry ? { registryUrl: opts.registry } : {});

  const server = await client.getServer(serverId);
  if (!server) {
    throw new Error(
      `Server "${serverId}" not found in marketplace. Use "cortex mcp search" to find available servers.`
    );
  }

  // Determine transport to use
  const transportType = resolveMarketplaceTransportType(server, opts.transportType);
  const serverInfo = convertMarketplaceToServerInfo(
    server.id,
    server.transports as TransportMap,
    transportType
  );

  const si = ServerInfoSchema.parse(serverInfo);
  await upsert(si);

  outputMarketplaceAddResult(opts, server, transportType, si);
}

type TransportMap = {
  stdio?: { command: string; args?: string[]; env?: Record<string, string> };
  sse?: { url: string; headers?: Record<string, string> };
  streamableHttp?: { url: string; headers?: Record<string, string> };
};

function convertMarketplaceToServerInfo(
  id: string,
  transports: TransportMap,
  transportType: TransportKind
): ServerInfo {
  const transportConfig = transports[transportType];
  if (!transportConfig) {
    throw new Error(
      `Transport "${transportType}" not available. Available: ${Object.keys(transports).join(', ')}`
    );
  }
  if (transportType === 'stdio' && transports.stdio) {
    return {
      name: id,
      transport: 'stdio',
      command: transports.stdio.command,
      args: transports.stdio.args || [],
    };
  }
  if (transportType === 'sse' && transports.sse) {
    return {
      name: id,
      transport: 'sse',
      endpoint: transports.sse.url,
      headers: transports.sse.headers,
    };
  }
  if (transportType === 'streamableHttp' && transports.streamableHttp) {
    return {
      name: id,
      transport: 'streamableHttp',
      endpoint: transports.streamableHttp.url,
      headers: transports.streamableHttp.headers,
    };
  }
  throw new Error(`Unsupported transport configuration for ${transportType}`);
}

function getPreferredTransport(transports: Record<string, unknown>): TransportKind {
  // Prefer stdio, then sse, then streamableHttp
  if (transports.stdio) return 'stdio';
  if (transports.sse) return 'sse';
  if (transports.streamableHttp) return 'streamableHttp';
  throw new Error('No supported transport found');
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

function isValidClient(client: string): client is SupportedClient {
  return ['claude', 'cline', 'devin', 'cursor', 'continue', 'windsurf', 'json'].includes(client);
}

function resolveMarketplaceTransportType(
  server: {
    transports: Record<string, unknown>;
  },
  requested?: TransportKindWithHttp
): TransportKind {
  let t = requested || getPreferredTransport(server.transports);
  if (t === 'http') t = 'streamableHttp';
  return t as TransportKind;
}

function outputMarketplaceAddResult(
  opts: AddOptions,
  server: ServerManifest,
  transportType: TransportKind,
  si: ServerInfo
) {
  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
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
          },
        },
        null,
        2
      )}\n`
    );
    return;
  }
  const riskBadge = getRiskBadge(server.security?.riskLevel || 'medium');
  const verifiedBadge = server.security?.verifiedPublisher ? ' ✓' : '';
  process.stdout.write(`Added MCP server: ${server.name}${verifiedBadge} ${riskBadge}\n`);
  process.stdout.write(`  ID: ${server.id}\n`);
  process.stdout.write(`  Transport: ${transportType}\n`);
  process.stdout.write(`  Owner: ${server.owner}\n`);
  if (server.description) {
    process.stdout.write(`  Description: ${server.description}\n`);
  }
  if (opts.client && isValidClient(opts.client)) {
    const installCmd = server.install[opts.client];
    if (installCmd) {
      process.stdout.write(`\n${opts.client} install command:\n`);
      if (opts.client === 'json') {
        process.stdout.write(`${JSON.stringify(installCmd, null, 2)}\n`);
      } else {
        process.stdout.write(`  ${installCmd}\n`);
      }
    }
  }
}
