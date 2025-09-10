import { describe, expect, it } from 'vitest';
import { generateEvidenceId, truncateString } from '../src/lib/utils.js';

describe('utils', () => {
	it('generates unique evidence ids', () => {
		const id1 = generateEvidenceId('test');
		const id2 = generateEvidenceId('test');
		expect(id1).not.toEqual(id2);
		expect(id1.startsWith('test-')).toBe(true);
	});

	it('truncates strings from the end', () => {
		expect(truncateString('abcdef', 4)).toBe('cdef');
	});
});
