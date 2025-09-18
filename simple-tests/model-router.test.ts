import { beforeEach, describe, expect, it } from 'vitest';
import type { MLXAdapter } from '../packages/model-gateway/src/adapters/mlx-adapter';
import type { OllamaAdapter } from '../packages/model-gateway/src/adapters/ollama-adapter';
import { ModelRouter } from '../packages/model-gateway/src/model-router';

import {
	MockMLXAdapter,
	MockOllamaAdapter,
	UnavailableMLXAdapter,
} from './test-utils/mock-adapters';

// Use the typed mocks imported from test-utils

describe('ModelRouter initialization', () => {
	let mockMLXAdapter: MockMLXAdapter;
	let mockOllamaAdapter: MockOllamaAdapter;
	let unavailableMLXAdapter: UnavailableMLXAdapter;

	beforeEach(() => {
		mockMLXAdapter = new MockMLXAdapter();
		mockOllamaAdapter = new MockOllamaAdapter();
		unavailableMLXAdapter = new UnavailableMLXAdapter();
	});

	it('initializes models for all capabilities when providers available', async () => {
		// Type-safe casting to the expected adapter types
		const router = new ModelRouter(
			mockMLXAdapter as unknown as MLXAdapter,
			mockOllamaAdapter as unknown as OllamaAdapter,
		);

		await expect(router.initialize()).resolves.not.toThrow();
	});

	it('detects unavailable mlx provider for embeddings', async () => {
		// Type-safe casting with unavailable adapter
		const router = new ModelRouter(
			unavailableMLXAdapter as unknown as MLXAdapter,
			mockOllamaAdapter as unknown as OllamaAdapter,
		);

		await expect(router.initialize()).resolves.not.toThrow();

		// Test that it falls back to Ollama when MLX is unavailable
		const result = await router.generateEmbedding({ text: 'test text' });
		expect(result.model).toContain('nomic'); // Should use Ollama model
	});

	it('handles embedding generation with type safety', async () => {
		const router = new ModelRouter(
			mockMLXAdapter as unknown as MLXAdapter,
			mockOllamaAdapter as unknown as OllamaAdapter,
		);

		await router.initialize();

		const result = await router.generateEmbedding({ text: 'test embedding' });
		expect(result).toHaveProperty('embedding');
		expect(result).toHaveProperty('model');
		expect(Array.isArray(result.embedding)).toBe(true);
		expect(result.embedding).toHaveLength(1536);
	});

	it('handles batch embedding generation', async () => {
		const router = new ModelRouter(
			mockMLXAdapter as unknown as MLXAdapter,
			mockOllamaAdapter as unknown as OllamaAdapter,
		);

		await router.initialize();

		const texts = ['text 1', 'text 2', 'text 3'];
		const result = await router.generateEmbeddings({ texts });

		expect(result).toHaveProperty('embeddings');
		expect(result).toHaveProperty('model');
		expect(Array.isArray(result.embeddings)).toBe(true);
		expect(result.embeddings).toHaveLength(texts.length);
		expect(result.embeddings[0]).toHaveLength(1536);
	});

	it('handles chat generation with proper interface', async () => {
		const router = new ModelRouter(
			mockMLXAdapter as unknown as MLXAdapter,
			mockOllamaAdapter as unknown as OllamaAdapter,
		);

		await router.initialize();

		const messages = [
			{ role: 'system' as const, content: 'You are a helpful assistant.' },
			{ role: 'user' as const, content: 'Hello, how are you?' },
		];

		const result = await router.generateChat({
			messages,
			max_tokens: 100,
			temperature: 0.7,
		});

		expect(result).toHaveProperty('content');
		expect(result).toHaveProperty('model');
		expect(typeof result.content).toBe('string');
		expect(result.content.length).toBeGreaterThan(0);
	});
});

describe('ModelRouter fallback behavior', () => {
	it('falls back to available provider when primary is unavailable', async () => {
		const unavailableMLX = new UnavailableMLXAdapter();
		const availableOllama = new MockOllamaAdapter();

		const router = new ModelRouter(
			unavailableMLX as unknown as MLXAdapter,
			availableOllama as unknown as OllamaAdapter,
		);

		await router.initialize();

		// Should successfully generate embedding using Ollama fallback
		const result = await router.generateEmbedding({ text: 'fallback test' });
		expect(result.model).toContain('nomic'); // Ollama model name
	});
});
