import { describe, expect, it } from 'vitest';
import { ragQueryCompletedSchema } from '../src/rag-events.js';

describe('contract: RAG query completed evidence extension', () => {
	const base = {
		queryId: 'q1',
		results: [
			{ text: 'Answer fragment', score: 0.8 },
			{ text: 'Another fragment', score: 0.6 },
		],
		provider: 'local-rag',
		duration: 42,
		timestamp: new Date().toISOString(),
	};

	it('accepts event without evidence', () => {
		const parsed = ragQueryCompletedSchema.parse(base);
		expect(parsed.results.length).toBe(2);
		expect(parsed.evidence).toBeUndefined();
	});

	it('accepts event with valid evidence array', () => {
		const sample = {
			...base,
			evidence: [
				{ id: 'e1', text: 'Citation text' },
				{ id: 'e2', uri: 'https://example.com/doc' },
			],
		};
		const parsed = ragQueryCompletedSchema.parse(sample);
		expect(parsed.evidence?.length).toBe(2);
	});

	it('rejects event with invalid evidence item', () => {
		// intentional invalid evidence item for negative test
		const bad = {
			...base,
			evidence: [{}], // missing text|uri
		};
		expect(() => ragQueryCompletedSchema.parse(bad)).toThrow();
	});
});
