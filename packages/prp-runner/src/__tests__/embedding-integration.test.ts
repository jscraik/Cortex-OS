/**
 * @file embedding-integration.test.ts
 * @description Test embedding and reranking capabilities with functional adapters
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
	addDocuments,
	createEmbeddingState,
	generateEmbeddings,
	getDocument,
	getStats,
	removeDocument,
	similaritySearch,
} from '../lib/embedding/index.js';
import { createRerankerState, rerank } from '../lib/reranker/index.js';

describe('🔍 Embedding and Reranking Integration Tests', () => {
	let embeddingState: ReturnType<typeof createEmbeddingState>;
	let rerankerState: ReturnType<typeof createRerankerState>;

	beforeEach(() => {
		embeddingState = createEmbeddingState('mock');
		rerankerState = createRerankerState('mock');
	});

	describe('Embedding Core Functionality', () => {
		it('creates embedding state with correct configuration', () => {
			const stats = getStats(embeddingState);
			expect(stats.provider).toBe('mock');
			expect(stats.dimensions).toBe(1024);
			expect(stats.totalDocuments).toBe(0);
		});

		it('generates embeddings for single text', async () => {
			const [vec] = await generateEmbeddings(embeddingState, 'Hello, world!');
			expect(vec).toHaveLength(1024);
			const magnitude = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
			expect(magnitude).toBeCloseTo(1.0, 5);
		});

		it('adds and retrieves documents', async () => {
			const texts = ['Test document'];
			const { state, ids } = await addDocuments(embeddingState, texts, [
				{ source: 'test' },
			]);
			embeddingState = state;
			const doc = getDocument(embeddingState, ids[0]);
			expect(doc?.text).toBe('Test document');
		});

		it('removes documents from store', async () => {
			const { state, ids } = await addDocuments(embeddingState, ['Remove me']);
			embeddingState = state;
			const { state: removedState, removed } = removeDocument(
				embeddingState,
				ids[0],
			);
			embeddingState = removedState;
			expect(removed).toBe(true);
			expect(getDocument(embeddingState, ids[0])).toBeUndefined();
		});

		it('performs similarity search', async () => {
			const docs = [
				'Python is a programming language',
				'JavaScript powers the web',
				'Machine learning models predict outcomes',
			];
			const res = await addDocuments(embeddingState, docs);
			embeddingState = res.state;
			const results = await similaritySearch(embeddingState, {
				text: 'programming',
				topK: 2,
			});
			expect(results.length).toBe(2);
			expect(results[0].similarity).toBeGreaterThanOrEqual(
				results[1].similarity,
			);
		});
	});

	describe('Reranker Functionality', () => {
		it('reranks documents using mock provider', async () => {
			const docs = ['alpha beta', 'beta gamma', 'gamma delta'];
			const results = await rerank(rerankerState, 'beta', docs, 2);
			expect(results.length).toBe(2);
			expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
		});
	});
});
