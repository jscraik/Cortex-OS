#!/usr/bin/env node
/** @file_path packages/mcp/src/cli/mcp.ts
 * @description Main MCP CLI entry point (consolidated from apps/cortex-cli/commands/mcp*.ts)
 */

/* eslint-disable no-console */

import { Command } from 'commander';
// Respect AGENTS.md boundaries: use package export, not internal src path
import { readAll as readRegistry } from '@cortex-os/mcp-registry/fs-store';

const program = new Command();

program.name('mcp').description('MCP (Model Context Protocol) CLI for Cortex-OS').version('1.0.0');

// Simple placeholder commands for now
const registry = program.command('registry').description('MCP registry management');

registry
  .command('list')
  .option('--json', 'Output as JSON', false)
  .description('List installed MCP servers')
  .action(async (opts: { json?: boolean }) => {
    const servers = await readRegistry();
    if (opts.json) {
      const out = {
        kind: 'mcp.serverList',
        at: new Date().toISOString(),
        count: servers.length,
        servers,
      };
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (!servers.length) {
      console.log('No MCP servers installed.');
      return;
    }
    console.log('Installed MCP Servers:\n');
    for (const s of servers) {
      const status = s.enabled ? '✅ Enabled' : '❌ Disabled';
      console.log(`- ${s.name} (${s.transport?.type ?? 'unknown'}) ${status}`);
    }
  });

// Placeholder commands removed to avoid confusion in production

// Add quick test command
program
  .command('test')
  .option('--url <sseUrl>', 'Remote MCP SSE URL', 'https://mcp.brainwav.io/sse')
  .option('--token <token>', 'Bearer token if set')
  .action(async (opts: { url: string; token?: string }) => {
    console.log(`[INFO] Open MCP Inspector and connect to ${opts.url}`);
    if (opts.token) console.log(`[INFO] Use Authorization: Bearer ${opts.token}`);
  });

// Parse command line arguments
program.parse();
