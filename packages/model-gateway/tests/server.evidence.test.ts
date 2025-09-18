import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';

// Minimal mock router implementing needed methods
const mockRouter = () => {
	return {
		isPrivacyModeEnabled: () => false,
		hasAvailableModels: () => true,
		hasCapability: () => true,
		initialize: async () => {},
		generateEmbedding: async ({ text }: { text: string }) => ({
			embedding: [0.1, 0.2, 0.3],
			model: 'mock-embed',
		}),
		generateEmbeddings: async ({ texts }: { texts: string[] }) => ({
			embeddings: texts.map(() => [0.1, 0.2]),
			model: 'mock-embed',
		}),
		rerank: async ({ query, documents }: { query: string; documents: string[] }) => ({
			documents,
			scores: documents.map((_d, i) => 1 - i * 0.1),
			model: 'mock-rerank',
		}),
		generateChat: async ({ messages }: { messages: Array<{ role: string; content: string }> }) => ({
			content: `Echo: ${messages[messages.length - 1].content}`,
			model: 'mock-chat',
		}),
	} as any;
};

// Mock policy router
const mockPolicy = () => ({ enforce: async () => {} }) as any;

describe('model-gateway evidence auto-attachment', () => {
	const app = createServer(mockRouter(), mockPolicy());

	it('embeddings response includes evidence array', async () => {
		const res = await app.inject({
			method: 'POST',
			url: '/embeddings',
			payload: { texts: ['alpha', 'beta'] },
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(Array.isArray(body.evidence)).toBe(true);
		expect(body.evidence.length).toBeGreaterThan(0);
		expect(body.evidence[0].hash).toHaveLength(64);
	});

	it('rerank response includes evidence array', async () => {
		const res = await app.inject({
			method: 'POST',
			url: '/rerank',
			payload: { query: 'q', docs: ['d1', 'd2', 'd3'] },
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.evidence?.length).toBeGreaterThan(0);
	});

	it('chat response includes evidence array', async () => {
		const res = await app.inject({
			method: 'POST',
			url: '/chat',
			payload: { msgs: [{ role: 'user', content: 'Explain recursion' }] },
		});
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.evidence?.[0]?.text).toContain('Explain recursion');
	});
});
