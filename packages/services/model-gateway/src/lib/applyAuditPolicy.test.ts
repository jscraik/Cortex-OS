import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../policy.js', () => ({
	loadGrant: vi.fn().mockResolvedValue({
		actions: ['embeddings'],
		rate: { perMinute: 60 },
		rules: { allow_embeddings: true, allow_rerank: true, allow_chat: true },
	}),
	enforce: vi.fn(),
}));

vi.mock('../audit.js', () => ({
	auditEvent: vi.fn(() => ({ id: '1' })),
	record: vi.fn().mockResolvedValue(undefined),
}));

const { applyAuditPolicy } = await import('./applyAuditPolicy');
const { enforce } = await import('../policy');
const { record } = await import('../audit');

describe('applyAuditPolicy', () => {
	it('enforces policy and records audit', async () => {
		const req = { headers: {} } as unknown as FastifyRequest;
		await applyAuditPolicy(req, 'embeddings', { text: 'hi' });
		expect(enforce).toHaveBeenCalled();
		expect(record).toHaveBeenCalled();
	});
});
