import { describe, expect, it } from 'vitest';
import { CitationBundler } from '../src/lib/citation-bundler';

describe('CitationBundler', () => {
	it('bundles chunks with citation metadata', () => {
		const bundler = new CitationBundler();
		const result = bundler.bundle([{ id: '1', text: 'alpha', source: 'doc1' }]);
		expect(result.citations[0]).toEqual({
			id: '1',
			source: 'doc1',
			text: 'alpha',
		});
	});
});
