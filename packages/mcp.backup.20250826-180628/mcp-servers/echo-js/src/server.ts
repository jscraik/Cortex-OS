#!/usr/bin/env node
import readline from 'node:readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
for await (const line of rl) {
  const msg = JSON.parse(line.toString());
  process.stdout.write(
    JSON.stringify({ id: msg.id, result: { ok: true, echo: msg } }) + '\n'
  );
}
