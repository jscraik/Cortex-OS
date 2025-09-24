import { describe, expect, it } from 'vitest';
import { Qwen3Reranker } from '../src/pipeline/qwen3-reranker.js';

describe('Qwen3Reranker.createBatches (helper)', () => {
	it('splits documents into batches of given size', () => {
		const rr = new Qwen3Reranker({});
		const docs = Array.from({ length: 7 }, (_, i) => ({
			id: String(i),
			text: `t${i}`,
		}));
		const batches = (rr as any).createBatches(docs, 3) as any[][];
		expect(batches.length).toBe(3);
		expect(batches[0].length).toBe(3);
		expect(batches[1].length).toBe(3);
		expect(batches[2].length).toBe(1);
		expect(batches.flat().map((d) => d.id)).toEqual(docs.map((d) => d.id));
	});
});
