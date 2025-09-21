import type { HealthCheckDetail } from '../lib/health.js';
import type { Embedder, Store } from '../lib/types.js';

// Embedder health: verifies the embedder can embed a tiny string quickly
export function createEmbedderHealthCheck(embedder: Embedder, timeoutMs = 1500) {
	return async function embedderHealth(): Promise<Record<string, HealthCheckDetail>> {
		const controller = new AbortController();
		const t = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const start = Date.now();
			const vecs = await embedder.embed(['healthcheck']);
			const ms = Date.now() - start;
			const ok = Array.isArray(vecs) && Array.isArray(vecs[0]) && vecs[0].length > 0;
			return {
				embedder: {
					ok,
					info: { latencyMs: ms, dim: ok ? vecs[0].length : 0 },
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return {
				embedder: {
					ok: false,
					error: message,
				},
			};
		} finally {
			clearTimeout(t);
		}
	};
}

// Pgvector health: checks connection and simple SELECT 1 if store is PgVectorStore-like
export function createPgvectorHealthCheck(
	store: Store & { init?: () => Promise<void>; health?: () => Promise<{ ok: boolean }> },
) {
	return async function pgvectorHealth(): Promise<Record<string, HealthCheckDetail>> {
		try {
			// If store exposes health(), prefer it
			if (typeof store.health === 'function') {
				const res = await store.health();
				return { store: { ok: !!res?.ok } };
			}
			// Otherwise attempt a minimal no-op via query expecting graceful error if uninitialized
			const sample = new Array(8).fill(0);
			try {
				await store.query(sample, 1);
				return { store: { ok: true } };
			} catch {
				return { store: { ok: false, error: 'query failed' } };
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return { store: { ok: false, error: message } };
		}
	};
}

// Reranker health: allow caller to pass a heartbeat function or process-ready predicate
export function createRerankerHealthCheck(options: {
	// Return true if the reranker process/server is ready
	isReady: () => Promise<boolean> | boolean;
	// Optional: capture last-known latency or endpoint to include in info
	info?: () => Promise<Record<string, unknown>> | Record<string, unknown>;
}) {
	return async function rerankerHealth(): Promise<Record<string, HealthCheckDetail>> {
		try {
			const ok = await options.isReady();
			const info = options.info ? await options.info() : undefined;
			return { reranker: { ok: !!ok, ...(info ? { info } : {}) } };
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return { reranker: { ok: false, error: message } };
		}
	};
}
