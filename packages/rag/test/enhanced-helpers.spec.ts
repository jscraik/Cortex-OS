import { promptGuard } from '@cortex-os/prompts';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { runLlamaIndexBridge } from '../src/lib/llama-index-bridge.js';
import * as processModule from '../src/lib/run-process.js';
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

	it('rejects raw context prompts when guard is enabled', async () => {
		const generator = {
			generate: vi.fn(async () => ({
				content: 'ans',
				provider: 'test',
				usage: {},
			})),
		} as any;
		const docs: Document[] = [{ id: '1', content: 'doc' }];
		const originalEnv = process.env.NODE_ENV;
		promptGuard.setEnabled(true);
		process.env.NODE_ENV = 'production';
		try {
			await expect(
				generateAnswer(generator, 'q', docs, {
					contextPrompt: 'You are a raw inline prompt violating policy.',
				}),
			).rejects.toThrow(/Prompt ID is required/);
		} finally {
			promptGuard.setEnabled(false);
			process.env.NODE_ENV = originalEnv;
		}
	});
});

describe('llama-index bridge', () => {
	const fixtureUrl = new URL('../../../tests/rag/fixtures/llama-index-config-v013.json', import.meta.url);

	it('invokes uv project bridge with structured payload', async () => {
		const spy = vi
			.spyOn(processModule, 'runProcess')
			.mockResolvedValue({
				status: 'ok',
				settings: { mode: 'settings', provider: 'anthropic' },
				runtime: 'llama-index-bridge',
			});
		const payload = {
			operation: 'settings',
			config: { provider: 'anthropic', llm: 'claude-3-5-sonnet' },
		};

		const result = await runLlamaIndexBridge(payload, { timeoutMs: 45_000 });

		expect(spy).toHaveBeenCalledWith(
			'uv',
			['run', '--project', 'apps/cortex-py', 'python', '-m', 'cortex_py.rag.bridge'],
			expect.objectContaining({
				input: JSON.stringify(payload),
				parseJson: true,
				timeoutMs: 45_000,
			}),
		);

		const legacyConfig = JSON.parse(readFileSync(fixtureUrl, 'utf8')) as Record<string, unknown>;
		expect(legacyConfig['mode']).toBe('legacy');
		expect(result.settings?.mode).toBe('settings');
		expect(result.runtime).toBe('llama-index-bridge');

		spy.mockRestore();
	});
});
