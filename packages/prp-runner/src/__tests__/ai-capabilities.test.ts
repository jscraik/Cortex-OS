/**
 * @file ai-capabilities.test.ts
 * @description Test unified AI capabilities combining LLM, embeddings, and RAG
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { AI_PRESETS, type AICoreCapabilities, createAICapabilities } from '../ai-capabilities.js';
import { AVAILABLE_MLX_MODELS } from '../mlx-adapter.js';

describe('🧠 AI Core Capabilities Integration Tests', () => {
	let aiCore: AICoreCapabilities;

	beforeEach(() => {
		// Use mock/test configuration for consistent testing
		aiCore = createAICapabilities('full');
	});

	describe('Capability Initialization', () => {
		it('should create AI capabilities with full configuration', async () => {
			const capabilities = await aiCore.getCapabilities();

			expect(capabilities).toBeDefined();
			expect(capabilities.llm).toBeDefined();
			expect(capabilities.llm.provider).toBe('mlx');
			// Use the value for runtime assertion (QWEN_SMALL is the default for 'full')
			expect(capabilities.llm.model).toBe(AVAILABLE_MLX_MODELS.QWEN_SMALL);
			expect(capabilities.embedding).toBeDefined();
			expect(capabilities.embedding?.dimensions).toBe(1024);
			expect(capabilities.features).toContain('text-generation');
			expect(capabilities.features).toContain('embeddings');
			expect(capabilities.features).not.toContain('rag');
			expect(capabilities.reranker).toBeUndefined();
		});

		it('should create LLM-only configuration', () => {
			const llmOnly = createAICapabilities('llm-only');
			expect(llmOnly).toBeDefined();
		});

		it('should create RAG-focused configuration', () => {
			const ragFocused = createAICapabilities('rag-focused');
			expect(ragFocused).toBeDefined();
		});
	});

	describe('Text Generation', () => {
		it('should generate text using LLM', async () => {
			const prompt = 'What is 2+2?';
			const result = await aiCore.generate(prompt);

			expect(result).not.toBeNull();
			expect(typeof result).toBe('string');
			expect(result?.length).toBeGreaterThan(0);
		}, 15000);

		it('should generate text with system prompt', async () => {
			const prompt = 'Count to 3';
			const systemPrompt = 'You are a helpful assistant that provides concise answers.';

			const result = await aiCore.generate(prompt, {
				systemPrompt,
				maxTokens: 50,
				temperature: 0.1,
			});

			expect(result).not.toBeNull();
			expect(typeof result).toBe('string');
		}, 15000);

		it('should handle generation options', async () => {
			const result = await aiCore.generate('Tell me about AI', {
				temperature: 0.1,
				maxTokens: 30,
			});

			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
		}, 15000);
	});

	describe('Knowledge Management', () => {
		it('should add documents to knowledge base', async () => {
			const documents = [
				'Artificial intelligence is the simulation of human intelligence by machines.',
				'Machine learning is a subset of AI that enables systems to learn from data.',
				'Deep learning uses neural networks with multiple layers.',
			];

			const ids = await aiCore.addKnowledge(documents);

			expect(ids).toBeDefined();
			expect(ids.length).toBe(3);
			expect(ids.every((id) => typeof id === 'string')).toBe(true);

			const stats = aiCore.getKnowledgeStats();
			expect(stats.documentsStored).toBe(3);
		}, 30000);

		it('should add documents with metadata', async () => {
			const documents = ['Test document with metadata'];
			const metadata = [{ category: 'test', source: 'unit-test' }];

			const ids = await aiCore.addKnowledge(documents, metadata);

			expect(ids.length).toBe(1);

			const stats = aiCore.getKnowledgeStats();
			expect(stats.documentsStored).toBe(1);
		}, 30000);

		it('should search knowledge base', async () => {
			// Add knowledge first
			const documents = [
				'Python is a programming language used for data science.',
				'JavaScript is used for web development.',
				'Machine learning requires statistical knowledge.',
			];

			await aiCore.addKnowledge(documents);

			// Search for relevant documents
			const results = await aiCore.searchKnowledge('programming languages', 2);

			expect(results).toBeDefined();
			expect(Array.isArray(results)).toBe(true);
			expect(results.length).toBeGreaterThan(0);
			expect(results.length).toBeLessThanOrEqual(2);

			// Results should have similarity scores
			results.forEach((result) => {
				expect(result.similarity).toBeDefined();
				expect(typeof result.similarity).toBe('number');
			});
		}, 45000);

		it('should clear knowledge base', async () => {
			await aiCore.addKnowledge(['Test document']);
			expect(aiCore.getKnowledgeStats().documentsStored).toBe(1);

			aiCore.clearKnowledge();
			expect(aiCore.getKnowledgeStats().documentsStored).toBe(0);
		}, 30000);
	});

	describe('RAG (Retrieval-Augmented Generation)', () => {
		beforeEach(async () => {
			// Set up knowledge base for RAG testing
			const knowledgeBase = [
				'The Eiffel Tower is located in Paris, France and was built in 1889.',
				'The Great Wall of China is approximately 13,000 miles long.',
				'Mount Everest is the highest mountain in the world at 29,029 feet.',
				'The Amazon rainforest covers approximately 2.1 million square miles.',
				'The Pacific Ocean is the largest ocean covering about 63 million square miles.',
				'Python is a high-level programming language created by Guido van Rossum.',
				'JavaScript was created by Brendan Eich in 1995 for web browsers.',
				'Machine learning algorithms can recognize patterns in large datasets.',
			];

			await aiCore.addKnowledge(knowledgeBase);
		}, 60000);

		it('should perform complete RAG workflow', async () => {
			const query = 'Tell me about the Eiffel Tower';

			const result = await aiCore.ragQuery({
				query,
				systemPrompt: 'Answer based on the provided context.',
			});

			expect(result).toBeDefined();
			expect(result.answer).toBeDefined();
			expect(typeof result.answer).toBe('string');
			expect(result.answer.length).toBeGreaterThan(0);

			expect(result.sources).toBeDefined();
			expect(Array.isArray(result.sources)).toBe(true);
			expect(result.sources.length).toBeGreaterThan(0);

			expect(result.prompt).toBeDefined();
			expect(result.confidence).toBeDefined();
			expect(typeof result.confidence).toBe('number');

			// Should find Eiffel Tower information
			const hasEiffelInfo = result.sources.some((source) =>
				source.text.toLowerCase().includes('eiffel tower'),
			);
			expect(hasEiffelInfo).toBe(true);
		}, 45000);

		it('should handle queries with no relevant context', async () => {
			const query = 'What is quantum computing?';

			const result = await aiCore.ragQuery({
				query,
			});

			expect(result).toBeDefined();
			expect(result.answer).toBeDefined();
			expect(result.sources).toBeDefined();

			// Should have low confidence for unrelated query
			expect(result.confidence).toBeLessThan(0.7);
		}, 30000);

		it('should prioritize relevant sources', async () => {
			const query = 'programming languages and development';

			const result = await aiCore.ragQuery({
				query,
			});

			expect(result.sources.length).toBeGreaterThan(0);

			// Should prioritize programming-related content
			const topSource = result.sources[0];
			expect(topSource.text.toLowerCase()).toMatch(/python|javascript|programming/);
		}, 30000);
	});

	describe('Embedding and Similarity', () => {
		it('should generate embeddings for text', async () => {
			const text = 'This is a test sentence for embedding generation.';
			const embedding = await aiCore.getEmbedding(text);

			expect(embedding).toBeDefined();
			expect(Array.isArray(embedding)).toBe(true);
			expect(embedding?.length).toBe(1024); // Qwen model dimensions

			// Check that embeddings contain meaningful values
			const hasNonZero = embedding?.some((value) => value !== 0);
			expect(hasNonZero).toBe(true);
		}, 30000);

		it('should calculate similarity between texts', async () => {
			const text1 = 'Machine learning is a subset of artificial intelligence';
			const text2 = 'AI and machine learning are related technologies';
			const text3 = 'The weather is sunny today';

			const similarity12 = await aiCore.calculateSimilarity(text1, text2);
			const similarity13 = await aiCore.calculateSimilarity(text1, text3);

			expect(similarity12).toBeDefined();
			expect(similarity13).toBeDefined();
			expect(typeof similarity12).toBe('number');
			expect(typeof similarity13).toBe('number');

			// Related texts should be more similar than unrelated texts
			expect(similarity12).not.toBeNull();
			expect(similarity13).not.toBeNull();
			if (similarity12 !== null && similarity13 !== null) {
				expect(similarity12).toBeGreaterThan(similarity13);
				// Similarities should be in valid range [-1, 1]
				expect(similarity12).toBeGreaterThanOrEqual(-1);
				expect(similarity12).toBeLessThanOrEqual(1);
				expect(similarity13).toBeGreaterThanOrEqual(-1);
				expect(similarity13).toBeLessThanOrEqual(1);
			}
		}, 45000);

		it('should handle identical texts', async () => {
			const text = 'Identical text for similarity testing';
			const similarity = await aiCore.calculateSimilarity(text, text);

			expect(similarity).toBeDefined();
			expect(similarity).toBeCloseTo(1.0, 2); // Should be very close to 1.0
		}, 30000);
	});

	describe('System Health and Capabilities', () => {
		it('should report system capabilities', async () => {
			const capabilities = await aiCore.getCapabilities();

			expect(capabilities.llm).toBeDefined();
			expect(capabilities.llm.provider).toBe('mlx');
			expect(capabilities.llm.model).toBeDefined();
			expect(typeof capabilities.llm.healthy).toBe('boolean');

			expect(capabilities.embedding).toBeDefined();
			expect(capabilities.embedding?.provider).toBeDefined();
			expect(capabilities.embedding?.dimensions).toBe(1024);

			expect(capabilities.features).toBeDefined();
			expect(Array.isArray(capabilities.features)).toBe(true);
			expect(capabilities.features.length).toBeGreaterThan(0);
		}, 15000);

		it('should track knowledge base statistics', async () => {
			const initialStats = aiCore.getKnowledgeStats();
			expect(initialStats.documentsStored).toBe(0);

			await aiCore.addKnowledge(['Test document']);

			const afterStats = aiCore.getKnowledgeStats();
			expect(afterStats.documentsStored).toBe(1);
			expect(afterStats.embeddingStats).toBeDefined();
		}, 30000);
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle empty knowledge base gracefully', async () => {
			const results = await aiCore.searchKnowledge('any query');

			expect(results).toBeDefined();
			expect(Array.isArray(results)).toBe(true);
			expect(results.length).toBe(0);
		}, 15000);

		it('should handle RAG query with no context', async () => {
			const result = await aiCore.ragQuery({
				query: 'What is the meaning of life?',
			});

			expect(result).toBeDefined();
			expect(result.answer).toBeDefined();
			expect(result.sources).toBeDefined();
			expect(result.sources.length).toBe(0);
		}, 30000);

		it('should handle very long text inputs', async () => {
			const longText = 'word '.repeat(500);
			const embedding = await aiCore.getEmbedding(longText);

			expect(embedding).toBeDefined();
			expect(embedding?.length).toBe(1024);
		}, 45000);
	});

	describe('Reranking Configuration', () => {
		it('should skip reranking when none is configured', async () => {
			const ragOnly = createAICapabilities(AI_PRESETS.RAG_FOCUSED);
			await ragOnly.addKnowledge(['Rerank test document']);
			const result = await ragOnly.ragQuery({ query: 'Rerank test' });

			expect(result.sources).toBeDefined();
			const caps = await ragOnly.getCapabilities();
			expect(caps.reranker).toBeUndefined();
		}, 30000);

		it('should fail fast when embedding adapter is missing', async () => {
			const llmOnly = createAICapabilities(AI_PRESETS.LLM_ONLY);
			await expect(llmOnly.ragQuery({ query: 'test without embeddings' })).rejects.toThrow(
				'Embedding adapter not configured for RAG',
			);
		}, 15000);
	});

	describe('Different AI Presets', () => {
		it('should work with LLM-only preset', async () => {
			const llmOnly = createAICapabilities(AI_PRESETS.LLM_ONLY);

			const result = await llmOnly.generate('Hello, AI!');
			expect(result).toBeDefined();
			expect(typeof result).toBe('string');

			// Should not have embedding capabilities
			const embedding = await llmOnly.getEmbedding('test');
			expect(embedding).toBeNull();
		}, 15000);

		it('should work with RAG-focused preset', async () => {
			const ragFocused = createAICapabilities(AI_PRESETS.RAG_FOCUSED);

			await ragFocused.addKnowledge(['Test knowledge for RAG']);
			const results = await ragFocused.searchKnowledge('test');

			expect(results.length).toBeGreaterThan(0);
		}, 30000);
	});
});
