import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { cosine } from '../src/vector.js';

describe('vector cosine', () => {
	it('cosine(a, a) is 1 for non-zero vectors', () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.double({
						noNaN: true,
						noDefaultInfinity: true,
						min: -1e6,
						max: 1e6,
					}),
					{ minLength: 1, maxLength: 10 },
				),
				(arr) => {
					fc.pre(arr.some((x) => Math.abs(x) > 1e-3));
					expect(cosine(arr, arr)).toBeCloseTo(1);
				},
			),
		);
	});
});
