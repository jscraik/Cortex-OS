import { withSpan } from '@cortex-os/telemetry';
import type { Span } from '@opentelemetry/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	instrumentGeneration,
	instrumentReranker,
	instrumentRetrieval,
} from '../src/observability/local-memory-telemetry.js';

// Mock the telemetry module
vi.mock('@cortex-os/telemetry', () => ({
	withSpan: vi.fn(),
}));

describe('Local Memory telemetry instrumentation', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('emits gen_ai.retrieval spans with brAInwav attributes', async () => {
		const mockWithSpan = vi.mocked(withSpan);
		mockWithSpan.mockImplementation(async (_name, fn) => fn({} as Span));

		await instrumentRetrieval(async () => 'ok', {
			tokenCount: 42,
			model: 'qwen3-embed',
		});

		expect(mockWithSpan).toHaveBeenCalledWith(
			'gen_ai.retrieval',
			expect.any(Function),
			expect.objectContaining({
				attributes: expect.objectContaining({
					'brAInwav.operation': 'retrieval',
					'brAInwav.model': 'qwen3-embed',
					'brAInwav.tokens': 42,
				}),
			}),
		);
	});

	it('emits gen_ai.reranker spans when reranker executes', async () => {
		const mockWithSpan = vi.mocked(withSpan);
		mockWithSpan.mockImplementation(async (_name, fn) => fn({} as Span));

		await instrumentReranker(async () => ['doc-1'], {
			model: 'qwen3-reranker',
			tokenCount: 21,
		});

		expect(mockWithSpan).toHaveBeenCalledWith(
			'gen_ai.reranker',
			expect.any(Function),
			expect.objectContaining({
				attributes: expect.objectContaining({
					'brAInwav.operation': 'reranker',
					'brAInwav.model': 'qwen3-reranker',
					'brAInwav.tokens': 21,
				}),
			}),
		);
	});

	it('emits gen_ai.generation spans for chunk metadata synthesis', async () => {
		const mockWithSpan = vi.mocked(withSpan);
		mockWithSpan.mockImplementation(async (_name, fn) => fn({} as Span));

		await instrumentGeneration(
			async () => ({
				chunkId: 'chunk-1',
				summary: 'summary',
			}),
			{
				model: 'glm-4.5',
				tokenCount: 15,
			},
		);

		expect(mockWithSpan).toHaveBeenCalledWith(
			'gen_ai.generation',
			expect.any(Function),
			expect.objectContaining({
				attributes: expect.objectContaining({
					'brAInwav.operation': 'generation',
					'brAInwav.model': 'glm-4.5',
					'brAInwav.tokens': 15,
				}),
			}),
		);
	});
});
