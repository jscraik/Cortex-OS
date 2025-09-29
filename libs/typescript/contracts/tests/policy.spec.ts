import { PolicyContract } from '@cortex-os/contracts';
import { describe, expect, test } from 'vitest';

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
