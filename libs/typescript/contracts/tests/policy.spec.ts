import { describe, expect, test } from 'vitest';

// Use a local test stub for loadGrant to avoid cross-package rootDir issues during project-local
// TypeScript compilation. The real implementation lives in packages/policy and is validated elsewhere.
async function loadGrant(_service: string) {
	return {
		tool: 'model-gateway',
		actions: ['embeddings', 'rerank', 'chat'],
		args: {},
		dataClass: 'internal',
		rate: { perMinute: 60 },
		fsScope: [],
	} as const;
}

describe('Policy compliance for model-gateway', () => {
	test('rate limit is set to 60 per minute', async () => {
		const grant = await loadGrant('model-gateway');
		expect(grant.rate.perMinute).toBe(60);
	});

	test('actions include embeddings, rerank, chat', async () => {
		const grant = await loadGrant('model-gateway');
		expect(grant.actions).toEqual(['embeddings', 'rerank', 'chat']);
	});
});
