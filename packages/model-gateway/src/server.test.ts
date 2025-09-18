import { describe, expect, it, vi } from 'vitest';
import type { IModelRouter } from './model-router.js';
import { createServer } from './server.js';

vi.mock('./audit', () => ({
	auditEvent: vi.fn(() => ({})),
	record: vi.fn(async () => {}),
}));

vi.mock('./policy', () => ({
	loadGrant: vi.fn(async () => ({})),
	enforce: vi.fn(),
}));

class MockModelRouter {
	// Single-text path used by server when texts.length === 1
	async generateEmbedding({ text: _text, model }: { text: string; model?: string }) {
		return {
			embedding: [0.1, 0.2],
			model: model || 'mock-model',
		};
	}
	// Batch path when multiple texts are provided
	async generateEmbeddings({ texts, model }: { texts: string[]; model?: string }) {
		return {
			embeddings: texts.map(() => [0.1, 0.2]),
			model: model || 'mock-model',
		};
	}
}

describe('embeddings endpoint', () => {
	it('returns embeddings array with evidence', async () => {
		const server = createServer(new MockModelRouter() as unknown as IModelRouter);
		const res = await server.inject({
			method: 'POST',
			url: '/embeddings',
			payload: { texts: ['hello'] },
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		// Server returns { vectors, dimensions, modelUsed, evidence }
		expect(body.vectors).toHaveLength(1);
		expect(body.dimensions).toBe(2);
		expect(body.modelUsed).toBe('mock-model');
		expect(body.evidence).toBeInstanceOf(Array);
		expect(body.evidence).toHaveLength(1);
		expect(body.evidence[0]).toMatchObject({
			kind: 'other',
			text: 'hello',
			hash: expect.any(String),
			timestamp: expect.any(String),
			metadata: { gateway: true },
		});
		await server.close();
	});
});

describe('evidence attachment', () => {
	it('attaches evidence to chat responses', async () => {
		const mockRouter = new MockModelRouter() as unknown as IModelRouter;
		mockRouter.hasCapability = vi.fn().mockReturnValue(true);
		mockRouter.generateChat = vi.fn().mockResolvedValue({
			content: 'Hello there!',
			model: 'mock-chat-model',
		});

		const server = createServer(mockRouter);
		const res = await server.inject({
			method: 'POST',
			url: '/chat',
			payload: {
				msgs: [{ role: 'user', content: 'Hello, what is the weather today?' }],
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.content).toBe('Hello there!');
		expect(body.modelUsed).toBe('mock-chat-model');
		expect(body.evidence).toBeInstanceOf(Array);
		expect(body.evidence).toHaveLength(1);
		expect(body.evidence[0]).toMatchObject({
			kind: 'other',
			text: 'Hello, what is the weather today?',
			hash: expect.any(String),
			timestamp: expect.any(String),
			metadata: { gateway: true },
		});
		await server.close();
	});

	it('attaches evidence to rerank responses', async () => {
		const mockRouter = new MockModelRouter() as unknown as IModelRouter;
		mockRouter.rerank = vi.fn().mockResolvedValue({
			documents: ['doc1', 'doc2'],
			scores: [0.9, 0.7],
			model: 'mock-rerank-model',
		});

		const server = createServer(mockRouter);
		const res = await server.inject({
			method: 'POST',
			url: '/rerank',
			payload: {
				query: 'search query',
				docs: ['document one', 'document two'],
				topK: 2,
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.evidence).toBeInstanceOf(Array);
		expect(body.evidence).toHaveLength(3); // query + first 2 docs
		expect(body.evidence[0]).toMatchObject({
			kind: 'other',
			text: 'search query',
		});
		await server.close();
	});
});
