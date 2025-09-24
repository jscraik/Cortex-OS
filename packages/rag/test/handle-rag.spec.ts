import { describe, expect, it } from 'vitest';
import { handleRAG } from '../src/index.js';

describe('handleRAG', () => {
	it('returns error for invalid input', async () => {
		const out = await handleRAG({} as any);
		const res = JSON.parse(out);
		expect(res.error.code).toBe('INVALID_INPUT');
	});
});
