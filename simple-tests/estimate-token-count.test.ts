import { describe, expect, it } from 'vitest';
import { estimateTokenCount } from '../packages/model-gateway/src/lib/estimate-token-count.js';

describe('estimateTokenCount', () => {
	it('roughly estimates one token per four characters', () => {
		expect(estimateTokenCount('Hello world')).toBe(3); // length 11 -> ceil(11/4) = 3
		expect(estimateTokenCount('')).toBe(0);
	});
});
