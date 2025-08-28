#!/usr/bin/env node
import readline from 'node:readline/promises';
import { z } from 'zod';

const RequestSchema = z.object({
  id: z.union([z.string(), z.number()]),
  message: z.string(),
});

export function handleRequest(input: string): string {
  const msg = RequestSchema.parse(JSON.parse(input));
  return JSON.stringify({ id: msg.id, result: { ok: true, echo: msg.message } });
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
for await (const line of rl) {
  try {
    process.stdout.write(handleRequest(line.toString()) + '\n');
  } catch {
    process.stdout.write(
      JSON.stringify({ id: null, error: { message: 'Invalid request' } }) + '\n',
    );
  }
}
