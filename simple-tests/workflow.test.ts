import { describe, expect, it } from 'vitest';
import {
	analyzeContext,
	collectRawEvidence,
	validateEvidence,
} from '../src/lib/workflow';

describe('workflow phases', () => {
	it('analyzeContext extracts unique lowercase words and count', () => {
		const result = analyzeContext({ context: 'Hello hello world' });
		expect(result).toEqual({ tokens: ['hello', 'world'], count: 2 });
	});

	it('collectRawEvidence trims and filters sources', () => {
		const result = collectRawEvidence({
			sources: ['  first ', 'second', ' third  '],
		});
		expect(result).toEqual(['first', 'second', 'third']);
	});

	it('validateEvidence deduplicates entries and validates content', () => {
		const result = validateEvidence({ evidence: ['alpha', 'beta', 'alpha'] });
		expect(result).toEqual(['alpha', 'beta']);
	});

	it('validateEvidence throws on empty evidence entries', () => {
		expect(() => validateEvidence({ evidence: [''] })).toThrow();
	});
});
