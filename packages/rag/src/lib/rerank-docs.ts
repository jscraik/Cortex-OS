import { generateRunId, recordLatency, recordOperation } from '@cortex-os/observability';
import type { Qwen3Reranker } from '../pipeline/qwen3-reranker.js';
import { withTimeout } from './backpressure.js';
import { CircuitBreaker } from './circuit-breaker.js';
import type { TokenBucket } from './rate-limiter.js';
import { withRetry } from './retry.js';
import type { Document, ReliabilityPolicy } from './types.js';

// Keep a breaker per reranker instance so state persists across calls
const breakerByReranker = new WeakMap<object, CircuitBreaker>();

export interface RerankReliabilityOptions {
	reliability?: ReliabilityPolicy;
	fallback?: 'none' | 'original-topK';
	rateLimiter?: TokenBucket; // optional token bucket to throttle reranker calls
	timeoutMs?: number; // optional timeout for reranker operations
}

export async function rerankDocs(
	reranker: Qwen3Reranker,
	query: string,
	documents: Document[],
	topK: number,
	options?: RerankReliabilityOptions,
): Promise<Document[]> {
	// Optional rate limiting: if no tokens, return fallback immediately
	if (options?.rateLimiter && !options.rateLimiter.tryRemove(1)) {
		const mode = options?.fallback ?? 'original-topK';
		return mode === 'original-topK' ? documents.slice(0, topK) : [];
	}
	const rerankDocsPayload = documents.map((doc: Document) => ({
		id: doc.id,
		text: doc.content,
	}));

	const rel = options?.reliability;
	const fallbackMode = options?.fallback ?? 'original-topK';

	const op = async () => {
		const rerankOperation = () => reranker.rerank(query, rerankDocsPayload, topK);
		return options?.timeoutMs
			? withTimeout(rerankOperation, options.timeoutMs, `Reranker timed out`)
			: rerankOperation();
	};

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
		const runId = generateRunId();
		const start = Date.now();
		const result = rel?.retry
			? await withRetry(exec, {
				maxAttempts: rel.retry.maxAttempts,
				baseDelayMs: rel.retry.baseDelayMs ?? 100,
			})
			: await exec();
		const ms = Date.now() - start;
		recordLatency('rag.reranker', ms, { component: 'rag' });
		recordOperation('rag.reranker', true, runId, { component: 'rag' });

		return result.map((doc: { id: string; text: string; score?: number }) => ({
			id: doc.id,
			content: doc.text,
			metadata: documents.find((d: Document) => d.id === doc.id)?.metadata,
			similarity: doc.score,
		}));
	} catch {
		const runId = generateRunId();
		recordOperation('rag.reranker', false, runId, { component: 'rag' });
		if (fallbackMode === 'original-topK') {
			return documents.slice(0, topK);
		}
		// none
		return [];
	}
}
