import { describe, expect, it } from 'vitest';
import { createEnvelope, withEvidence } from './src/envelope';

describe('withEvidence helper', () => {
	it('attaches evidence array immutably', () => {
		const base = createEnvelope({
			type: 'test.event',
			source: 'https://test',
			data: { foo: 'bar' },
		});
		const evidence = [
			{ id: 'e1', text: 'snippet one' },
			{ id: 'e2', uri: 'https://example.com/doc' },
		];
		const enriched = withEvidence(base, evidence);
		expect(enriched).not.toBe(base);
		expect(enriched.data.evidence.length).toBe(2);
		// Original envelope untouched
		// The original data should not contain evidence
		expect((base.data as Record<string, unknown>).evidence).toBeUndefined();
	});

	it('replaces existing evidence when called again', () => {
		const base = createEnvelope({
			type: 'test.event',
			source: 'https://test',
			data: {},
		});
		const enriched1 = withEvidence(base, [{ text: 'first' }]);
		const enriched2 = withEvidence(enriched1, [{ text: 'second' }]);
		expect(enriched2.data.evidence[0].text).toBe('second');
		expect(enriched1.data.evidence[0].text).toBe('first');
	});

	it('rejects invalid evidence (empty item)', () => {
		const base = createEnvelope({
			type: 'test.event',
			source: 'https://test',
			data: {},
		});
		// @ts-expect-error intentional invalid structure for test
		expect(() => withEvidence(base, [{}])).toThrow();
	});
});
