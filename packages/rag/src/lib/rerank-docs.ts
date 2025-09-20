import type { Qwen3Reranker } from '../pipeline/qwen3-reranker.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { withRetry } from './retry.js';
import type { Document, ReliabilityPolicy } from './types.js';

// Keep a breaker per reranker instance so state persists across calls
const breakerByReranker = new WeakMap<object, CircuitBreaker>();

export interface RerankReliabilityOptions {
	reliability?: ReliabilityPolicy;
	fallback?: 'none' | 'original-topK';
}

export async function rerankDocs(
	reranker: Qwen3Reranker,
	query: string,
	documents: Document[],
	topK: number,
	options?: RerankReliabilityOptions,
): Promise<Document[]> {
	const rerankDocsPayload = documents.map((doc: Document) => ({
		id: doc.id,
		text: doc.content,
	}));

	const rel = options?.reliability;
	const fallbackMode = options?.fallback ?? 'original-topK';

	const op = async () => reranker.rerank(query, rerankDocsPayload, topK);

	const exec = async () => {
		if (rel?.breaker) {
			let cb = breakerByReranker.get(reranker);
			if (!cb) {
				cb = new CircuitBreaker({
					failureThreshold: rel.breaker.failureThreshold,
					resetTimeoutMs: rel.breaker.resetTimeoutMs,
				});
				breakerByReranker.set(reranker, cb);
			}
			return cb.execute(op);
		}
		return op();
	};

	try {
		const result = rel?.retry
			? await withRetry(exec, {
				maxAttempts: rel.retry.maxAttempts,
				baseDelayMs: rel.retry.baseDelayMs ?? 100,
			})
			: await exec();

		return result.map((doc: { id: string; text: string; score?: number }) => ({
			id: doc.id,
			content: doc.text,
			metadata: documents.find((d: Document) => d.id === doc.id)?.metadata,
			similarity: doc.score,
		}));
	} catch {
		if (fallbackMode === 'original-topK') {
			return documents.slice(0, topK);
		}
		// none
		return [];
	}
}
