import { createHash } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

describe('crypto hashing fuzz', () => {
	it('sha256 digest is 64 hex chars', () => {
		return fc.assert(
			fc.property(fc.string(), (input) => {
				const digest = createHash('sha256').update(input).digest('hex');
				expect(digest).toMatch(/^[a-f0-9]{64}$/);
			}),
		);
	});
});
