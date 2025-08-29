#!/usr/bin/env node
import readline from 'node:readline/promises';
import { pathToFileURL } from 'node:url';
import {
  createServer,
  addTool,
  handleRequest as dispatchRequest,
} from '../../../src/lib/server/index.js';

const server = createServer({ name: 'echo', version: '1.0.0' });
addTool(
  server,
  { name: 'echo', inputSchema: { properties: { message: { type: 'string' } } } },
  (args: Record<string, unknown>) => ({ ok: true, echo: (args as any).message }),
);

export async function handleRequest(input: string): Promise<string> {
  const msg = JSON.parse(input);
  const res = await dispatchRequest(msg, server);
  return JSON.stringify(res);
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  for await (const line of rl) {
    try {
      process.stdout.write((await handleRequest(line.toString())) + '\n');
    } catch {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32600, message: 'Invalid request' },
        }) + '\n',
      );
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
