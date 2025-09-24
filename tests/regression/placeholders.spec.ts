import { describe, expect, it } from 'vitest';
import { scanRepoForPlaceholders } from '../../scripts/brainwav-production-guard';

const forbiddenTokens = ['TODO:', 'Mock', 'not yet implemented'];
const allowlist = [/docs\//, /README\.md$/];

describe('brAInwav placeholder regression', () => {
	it('should not find forbidden placeholder tokens in codebase', async () => {
		const results = await scanRepoForPlaceholders(forbiddenTokens, allowlist);
		expect(results.length).toBe(0);
	});
});
