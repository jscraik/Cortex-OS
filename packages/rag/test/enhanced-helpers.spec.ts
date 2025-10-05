import { describe, expect, it, vi } from 'vitest';
import { type Document, embedQuery, generateAnswer, rerankDocs, retrieveDocs } from '../src/lib';

describe('enhanced pipeline helpers', () => {
	it('embeds query', async () => {
		const embedder = { embed: vi.fn(async () => [[1, 2, 3]]) } as any;
		const result = await embedQuery(embedder, 'hello');
		expect(result).toEqual([1, 2, 3]);
		expect(embedder.embed).toHaveBeenCalledWith(['hello']);
	});

	it('retrieves documents by similarity', async () => {
		const embedder = { embed: vi.fn(async () => [[0, 1]]) } as any;
		const docs: Document[] = [
			{ id: '1', content: 'a', embedding: [1, 0] },
			{ id: '2', content: 'b', embedding: [0, 1] },
		];
		const result = await retrieveDocs(embedder, [1, 0], docs, 1);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('1');
	});

	it('reranks documents', async () => {
		const reranker = {
			rerank: vi.fn(async () => [{ id: '2', text: 'b', score: 0.9 }]),
		} as any;
		const docs: Document[] = [
			{ id: '1', content: 'a' },
			{ id: '2', content: 'b' },
		];
		const result = await rerankDocs(reranker, 'q', docs, 1);
		expect(result).toEqual([{ id: '2', content: 'b', metadata: undefined, similarity: 0.9 }]);
	});

	it('generates answer with context', async () => {
		const generator = {
			generate: vi.fn(async () => ({
				content: 'ans',
				provider: 'test',
				usage: {},
			})),
		} as any;
		const docs: Document[] = [{ id: '1', content: 'doc' }];
		const result = await generateAnswer(generator, 'q', docs);
		expect(result.answer).toBe('ans');
		expect(generator.generate).toHaveBeenCalled();
	});

	it('throws when contextPrompt is provided', async () => {
		const generator = {
			generate: vi.fn(async () => ({
				content: 'ans',
				provider: 'test',
				usage: {},
			})),
		} as any;
		const docs: Document[] = [{ id: '1', content: 'doc' }];

		await expect(
			generateAnswer(generator, 'q', docs, { contextPrompt: 'inline system prompt' }),
		).rejects.toThrow(/contextPrompt is deprecated/);
	});

	it('renders registered context prompt when contextPromptId provided', async () => {
		const generator = {
			generate: vi.fn(async () => ({
				content: 'ans',
				provider: 'test',
				usage: {},
			})),
		} as any;
		const docs: Document[] = [{ id: '1', content: 'doc' }];

		await generateAnswer(generator, 'q', docs, { contextPromptId: 'sys.a2a.rag-default' });

		expect(generator.generate).toHaveBeenCalledTimes(1);
		const [prompt] = generator.generate.mock.calls[0];
		expect(prompt).toMatch(/You are a brAInwav assistant\./);
		expect(prompt).toMatch(/Question: q/);
	});
});
