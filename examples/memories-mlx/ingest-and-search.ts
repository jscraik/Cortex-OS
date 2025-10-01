import { createMemoryProviderFromEnv } from '@cortex-os/memory-core';
import type { MemoryStoreInput } from '@cortex-os/tool-spec';

function applyDefaults(): void {
	process.env.MEMORY_DB_PATH = process.env.MEMORY_DB_PATH || './data/unified-memories.db';
	process.env.MEMORY_DEFAULT_LIMIT = process.env.MEMORY_DEFAULT_LIMIT || '8';
	process.env.MEMORY_MAX_LIMIT = process.env.MEMORY_MAX_LIMIT || '25';
	process.env.MEMORY_DEFAULT_THRESHOLD = process.env.MEMORY_DEFAULT_THRESHOLD || '0.3';
}

function createDemoInput(): MemoryStoreInput {
	return {
		content: 'The quick brown fox jumps over the lazy dog',
		tags: ['example', 'animal'],
		domain: 'demo',
		importance: 6,
		metadata: {
			source: 'mlx-demo-script',
			createdAt: new Date().toISOString(),
		},
	};
}

async function runDemo(): Promise<void> {
	applyDefaults();
	const provider = createMemoryProviderFromEnv();
	const storeInput = createDemoInput();
	const stored = await provider.store(storeInput);

	console.log('Stored memory:', stored);

	const results = await provider.search({
		query: 'brown fox',
		limit: 5,
		search_type: 'hybrid',
	});

	console.log(
		'Query results:',
		results.slice(0, 3).map((memory) => ({ id: memory.id, score: memory.score, content: memory.content })),
	);
}

runDemo().catch((error) => {
	console.error(error);
	process.exit(1);
});
