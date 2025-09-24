import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MLXAdapter } from '../src/adapters/mlx-adapter.js';
import type { OllamaAdapter } from '../src/adapters/ollama-adapter.js';
import { type ChatRequest, ModelRouter } from '../src/model-router.js';

describe('ModelRouter - Chat Generation', () => {
	let router: ModelRouter;
	let mockMLXAdapter: MLXAdapter;
	let mockOllamaAdapter: OllamaAdapter;

	beforeEach(async () => {
		mockMLXAdapter = {
			generateChat: vi.fn(),
			isAvailable: vi.fn().mockResolvedValue(false),
		} as any;

		mockOllamaAdapter = {
			generateChat: vi.fn(),
			isAvailable: vi.fn().mockResolvedValue(true),
			listModels: vi.fn().mockResolvedValue(['llama2']),
		} as any;

		router = new ModelRouter(mockMLXAdapter, mockOllamaAdapter);
		await router.initialize();
	});

	it('should generate chat response with proper type safety', async () => {
		// Arrange: Create a properly typed ChatRequest
		const chatRequest: ChatRequest = {
			messages: [{ role: 'user', content: 'hello' }],
			model: 'llama2',
			max_tokens: 100,
			temperature: 0.7,
		};

		(mockOllamaAdapter.generateChat as any).mockResolvedValue({
			content: 'Hello! How can I help you?',
			model: 'llama2',
		});

		// Act: Call generateChat with properly typed request
		const result = await router.generateChat(chatRequest);

		// Assert
		expect(result).toEqual({
			content: 'Hello! How can I help you?',
			model: 'llama2',
		});
		expect(mockOllamaAdapter.generateChat).toHaveBeenCalledWith({
			messages: chatRequest.messages,
			model: chatRequest.model,
			max_tokens: chatRequest.max_tokens,
			temperature: chatRequest.temperature,
		});
	});

	it('should handle minimal chat request', async () => {
		// Arrange: Create minimal valid ChatRequest
		const chatRequest: ChatRequest = {
			messages: [{ role: 'user', content: 'hello' }],
		};

		(mockOllamaAdapter.generateChat as any).mockResolvedValue({
			content: 'Hello!',
			model: 'llama2',
		});

		// Act
		const result = await router.generateChat(chatRequest);

		// Assert
		expect(result).toEqual({ content: 'Hello!', model: 'llama2' });
	});

	it('should handle system and assistant messages', async () => {
		// Arrange: Create ChatRequest with different message roles
		const chatRequest: ChatRequest = {
			messages: [
				{ role: 'system', content: 'You are a helpful assistant.' },
				{ role: 'user', content: 'What is the weather like?' },
				{ role: 'assistant', content: 'I need more location information.' },
				{ role: 'user', content: 'In New York' },
			],
			model: 'llama2',
			temperature: 0.5,
		};

		(mockOllamaAdapter.generateChat as any).mockResolvedValue({
			content: 'The weather in New York is sunny.',
			model: 'llama2',
		});

		// Act
		const result = await router.generateChat(chatRequest);

		// Assert
		expect(result).toEqual({
			content: 'The weather in New York is sunny.',
			model: 'llama2',
		});
		expect(mockOllamaAdapter.generateChat).toHaveBeenCalledWith({
			messages: chatRequest.messages,
			model: 'llama2',
			temperature: 0.5,
			max_tokens: undefined,
		});
	});
});
