import { describe, expect, it, vi } from 'vitest';

vi.mock('fastify', () => {
	return {
		default: () => {
			const routes: Record<string, any> = {};
			return {
				post: (url: string, handler: any) => {
					routes[url] = handler;
				},
				inject: async ({ url, payload }: any) => {
					const reply: any = {
						send: (data: any) => (reply.body = data),
					};
					await routes[url]({ body: payload, headers: {} }, reply);
					return { statusCode: 200, body: reply.body };
				},
				listen: vi.fn(),
			};
		},
	};
});

vi.mock('./lib/applyAuditPolicy', () => ({
	applyAuditPolicy: vi.fn().mockResolvedValue(undefined),
}));

import { createServer } from './server.js';

describe('server', () => {
	it('handles embeddings', async () => {
		const router = {
			generateEmbedding: vi.fn().mockResolvedValue({ embedding: [1, 2], model: 'm' }),
			generateEmbeddings: vi.fn(),
			rerank: vi.fn(),
			generateChat: vi.fn(),
		};
		const app = createServer(router as any);
		const res = await app.inject({
			method: 'POST',
			url: '/embeddings',
			payload: { texts: ['hi'] },
		});
		expect(res.statusCode).toBe(200);
		expect(router.generateEmbedding).toHaveBeenCalled();
	});
});
