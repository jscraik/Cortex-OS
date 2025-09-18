import {
	createEmbedderFromEnv,
	createMemoryService,
	createPolicyAwareStoreFromEnv,
} from '../../packages/memories/src/index.js';

async function main() {
	process.env.MEMORIES_EMBEDDER = process.env.MEMORIES_EMBEDDER || 'mlx';
	process.env.MEMORIES_LONG_STORE = process.env.MEMORIES_LONG_STORE || 'sqlite';
	process.env.MEMORIES_SQLITE_PATH =
		process.env.MEMORIES_SQLITE_PATH || './data/memories.db';
	// Prefer MLX_EMBED_BASE_URL; fallback to MLX_SERVICE_URL
	if (!process.env.MLX_EMBED_BASE_URL && !process.env.MLX_SERVICE_URL) {
		process.env.MLX_EMBED_BASE_URL = 'http://127.0.0.1:8000';
	}

	const store = createPolicyAwareStoreFromEnv();
	const embedder = createEmbedderFromEnv();
	const service = createMemoryService(store, embedder);

	// Ingest
	await service.save({
		id: `ex-${Date.now()}`,
		kind: 'note',
		text: 'The quick brown fox jumps over the lazy dog',
		createdAt: new Date().toISOString(),
		tags: ['example', 'animal'],
		embeddingModel: embedder.name(),
	});

	// Search
	const results = await service.search({
		query: 'brown fox',
		limit: 5,
	});

	console.log(
		'Top results:',
		results
			.map((r) => ({ id: r.id, score: r.score, text: r.text }))
			.slice(0, 3),
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
