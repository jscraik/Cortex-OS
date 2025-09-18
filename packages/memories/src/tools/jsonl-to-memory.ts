import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import readline from 'node:readline';
import { z } from 'zod';
import { InMemoryStore } from '../adapters/store.memory.js';
import type { Memory } from '../domain/types.js';
import { createEmbedderFromEnv } from '../service/embedder-factory.js';
import { createMemoryService } from '../service/memory-service.js';

const cliSchema = z.object({
	input: z.string(),
	output: z.string(),
	tags: z.array(z.string()).optional(),
});

function parseArgs() {
	const args = process.argv.slice(2);
	const opts: Record<string, unknown> = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--input' || arg === '-i') opts.input = args[++i];
		else if (arg === '--output' || arg === '-o') opts.output = args[++i];
		else if (arg === '--tags' || arg === '-t')
			opts.tags = args[++i]
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean);
	}
	return cliSchema.parse(opts);
}

async function main() {
	const { input, output, tags } = parseArgs();

	const rl = readline.createInterface({
		input: fs.createReadStream(input),
		crlfDelay: Infinity,
	});

	const service = createMemoryService(new InMemoryStore(), createEmbedderFromEnv());
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
