#!/usr/bin/env node
/*
 * Lightweight CLI for brAInwav Vibe Check MCP.
 * Wraps the JSON-RPC call required by AGENTS.md §11.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

function usage(code = 0) {
  const text = `Usage: pnpm oversight:vibe-check --goal <text> (--plan <text>|--plan-file <path>|--plan -) [options]

Required:
  --goal <text>             Task goal sent to vibe_check
  One of:
    --plan <text>           Execution plan (use quotes for multi-line)
    --plan -                Read plan from STDIN
    --plan-file <path>      Read plan from file

Optional:
  --session <id>            Session identifier (defaults to env or UUID)
  --id <jsonrpc-id>         Custom JSON-RPC id (defaults to cli-<timestamp>)
  --save <path>             Write response JSON to disk
  --json                    Emit compact JSON (pretty by default)
  --help                    Show this message
`;
  process.stdout.write(text);
  process.exit(code);
}

function parseArgs(argv) {
  const opts = {
    goal: process.env.VIBE_CHECK_GOAL ?? '',
    plan: process.env.VIBE_CHECK_PLAN ?? '',
    planFile: '',
    planFromStdin: false,
    session: process.env.VIBE_CHECK_SESSION_ID ?? '',
    id: '',
    savePath: '',
    pretty: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--goal':
        opts.goal = argv[++i] ?? '';
        break;
      case '--plan':
        {
          const value = argv[++i];
          if (value === undefined) opts.plan = '';
          else if (value === '-') opts.planFromStdin = true;
          else opts.plan = value;
        }
        break;
      case '--plan-file':
        opts.planFile = argv[++i] ?? '';
        break;
      case '--session':
        opts.session = argv[++i] ?? '';
        break;
      case '--id':
        opts.id = argv[++i] ?? '';
        break;
      case '--save':
        opts.savePath = argv[++i] ?? '';
        break;
      case '--json':
        opts.pretty = false;
        break;
      case '--help':
        usage(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`brAInwav-vibe-check: unknown option ${arg}`);
          usage(1);
        } else {
          console.error(`brAInwav-vibe-check: unexpected argument ${arg}`);
          usage(1);
        }
    }
  }

  return opts;
}

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', (err) => reject(err));
  });
}

async function preparePlan(opts) {
  if (opts.planFromStdin) {
    const stdin = await readStdin();
    opts.plan = stdin.trim();
  } else if (opts.planFile) {
    opts.plan = readFileSync(opts.planFile, 'utf8').trim();
  }
  return opts.plan;
}

function ensureValue(name, value) {
  if (!value || !value.trim()) {
    console.error(`brAInwav-vibe-check: missing required ${name}`);
    usage(1);
  }
  return value.trim();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  await preparePlan(opts);

  const goal = ensureValue('goal', opts.goal);
  const plan = ensureValue('plan', opts.plan);
  const sessionId = (opts.session && opts.session.trim()) || randomUUID();
  const requestId = (opts.id && opts.id.trim()) || `cli-${Date.now()}`;
  const baseUrl = process.env.VIBE_CHECK_HTTP_URL ?? 'http://127.0.0.1:2091';
  const endpoint = `${baseUrl.replace(/\/$/, '')}/mcp`;

  const payload = {
    jsonrpc: '2.0',
    id: requestId,
    method: 'tools/call',
    params: {
      name: 'vibe_check',
      arguments: { goal, plan, sessionId },
    },
  };

  console.error(`brAInwav-vibe-check: POST ${endpoint} session=${sessionId}`);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(`brAInwav-vibe-check: network failure — ${(error && error.message) || error}`);
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`brAInwav-vibe-check: HTTP ${response.status} ${response.statusText} — ${bodyText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  let data;
  try {
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType.includes('text/event-stream')) {
      const payload = await readEventStream(response.body);
      data = JSON.parse(payload);
    } else {
      const fallback = await response.text();
      throw new Error(
        `brAInwav-vibe-check: unexpected content-type "${contentType}" — ${fallback.slice(0, 200)}`
      );
    }
  } catch (error) {
    throw new Error(`brAInwav-vibe-check: failed to parse JSON — ${(error && error.message) || error}`);
  }

  const output = opts.pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  process.stdout.write(`${output}\n`);

  if (opts.savePath) {
    const dir = dirname(opts.savePath);
    if (dir && dir !== '.') {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(opts.savePath, `${output}\n`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function readEventStream(body) {
  if (!body || typeof body.getReader !== 'function') {
    throw new Error('brAInwav-vibe-check: SSE response missing readable body');
  }

  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
  }
  buffer += decoder.decode();

  const events = buffer.split('\n\n');
  let lastData;
  for (const event of events) {
    const dataLines = event
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart());
    if (dataLines.length > 0) {
      lastData = dataLines.join('\n');
    }
  }

  if (!lastData) {
    throw new Error('brAInwav-vibe-check: SSE stream did not contain a data payload');
  }

  return lastData;
}
