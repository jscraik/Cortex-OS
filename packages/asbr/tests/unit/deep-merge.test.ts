import { describe, expect, it } from 'vitest';
import { deepMerge } from '../../src/lib/deep-merge.js';

describe('deepMerge', () => {
	it('merges nested objects and concatenates arrays', () => {
		const base = { a: { nums: [1], val: 1 } };
		const override = { a: { nums: [2], extra: 2 } };
		const result = deepMerge(base, override);
		expect(result).toEqual({ a: { nums: [1, 2], val: 1, extra: 2 } });
	});
});
