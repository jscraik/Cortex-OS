import fs from 'fs';
import readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { createMemoryService } from '../service/memory-service.js';
import { InMemoryStore } from '../adapters/store.memory.js';
import { NoopEmbedder } from '../adapters/embedder.noop.js';
import type { Memory } from '../domain/types.js';

const cliSchema = z.object({
  input: z.string(),
  output: z.string(),
  tags: z.array(z.string()).optional(),
});

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, unknown> = {};
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--input' || arg === '-i') {
      opts.input = args[i + 1];
      i += 2;
    } else if (arg === '--output' || arg === '-o') {
      opts.output = args[i + 1];
      i += 2;
    } else if (arg === '--tags' || arg === '-t') {
      opts.tags = args[i + 1]
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      i += 2;
    } else {
      i += 1;
    }
  }
  return cliSchema.parse(opts);
}

async function main() {
  const { input, output, tags } = parseArgs();

  const rl = readline.createInterface({
    input: fs.createReadStream(input),
    crlfDelay: Infinity,
  });

  const service = createMemoryService(new InMemoryStore(), new NoopEmbedder());
  const memories: Memory[] = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    const obj = JSON.parse(line);
    const text = obj.text ?? obj.content ?? JSON.stringify(obj);
    const now = new Date().toISOString();
    const raw = {
      id: obj.id ?? randomUUID(),
      kind: 'note' as const,
      text,
      tags: [...(tags ?? []), ...(obj.tags ?? [])].filter(Boolean),
      createdAt: obj.createdAt ?? now,
      updatedAt: now,
      provenance: { source: 'system' as const },
    };
    const saved = await service.save(raw);
    memories.push(saved);
  }

  fs.writeFileSync(output, JSON.stringify(memories, null, 2));
  console.log(`Wrote ${memories.length} memories to ${output}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
