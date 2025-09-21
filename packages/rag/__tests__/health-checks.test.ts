import { describe, expect, it } from 'vitest';
import {
	createEmbedderHealthCheck,
	createPgvectorHealthCheck,
	createRerankerHealthCheck,
} from '../src/server/health-checks.js';
import { HealthProvider } from '../src/server/health-provider.js';

// Stub embedder
const goodEmbedder = {
	async embed(q: string[]) {
		return q.map(() => [0.1, 0.2, 0.3]);
	},
};
const badEmbedder = {
	async embed() {
		throw new Error('embedder down');
	},
};

// Stub store implementing minimal interface
const healthyStore = {
	async upsert() {},
	async query() {
		return [];
	},
	async health() {
		return { ok: true };
	},
};
const unhealthyStore = {
	async upsert() {},
	async query() {
		throw new Error('db error');
	},
	async health() {
		return { ok: false };
	},
};

// Stub reranker readiness
const readyReranker = createRerankerHealthCheck({ isReady: async () => true });
const notReadyReranker = createRerankerHealthCheck({ isReady: async () => false });

describe('component health checks', () => {
	it('reports embedder ok and includes dim/latency', async () => {
		const embedderCheck = createEmbedderHealthCheck(goodEmbedder);
		const provider = new HealthProvider({
			extraChecks: async () => ({ ...(await embedderCheck()) }),
		});
		const ready = await provider.readiness();
		expect(ready.checks.embedder.ok).toBe(true);
		const info = ready.checks.embedder.info as { dim?: number } | undefined;
		expect(info?.dim ?? 0).toBeGreaterThan(0);
	});

	it('reports embedder failure', async () => {
		const embedderCheck = createEmbedderHealthCheck(badEmbedder);
		const provider = new HealthProvider({
			extraChecks: async () => ({ ...(await embedderCheck()) }),
		});
		const ready = await provider.readiness();
		expect(ready.checks.embedder.ok).toBe(false);
	});

	it('reports pgvector store ok', async () => {
		const storeCheck = createPgvectorHealthCheck(
			healthyStore as unknown as Parameters<typeof createPgvectorHealthCheck>[0],
		);
		const provider = new HealthProvider({ extraChecks: async () => ({ ...(await storeCheck()) }) });
		const ready = await provider.readiness();
		expect(ready.checks.store.ok).toBe(true);
	});

	it('reports pgvector store failure', async () => {
		const storeCheck = createPgvectorHealthCheck(
			unhealthyStore as unknown as Parameters<typeof createPgvectorHealthCheck>[0],
		);
		const provider = new HealthProvider({ extraChecks: async () => ({ ...(await storeCheck()) }) });
		const ready = await provider.readiness();
		expect(ready.checks.store.ok).toBe(false);
	});

	it('reports reranker readiness', async () => {
		const provider = new HealthProvider({
			extraChecks: async () => ({ ...(await readyReranker()) }),
		});
		const ready = await provider.readiness();
		expect(ready.checks.reranker.ok).toBe(true);
	});

	it('reports reranker not-ready', async () => {
		const provider = new HealthProvider({
			extraChecks: async () => ({ ...(await notReadyReranker()) }),
		});
		const ready = await provider.readiness();
		expect(ready.checks.reranker.ok).toBe(false);
	});
});
