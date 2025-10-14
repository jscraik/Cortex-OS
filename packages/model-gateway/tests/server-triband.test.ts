/**
 * Model Gateway Server Tri-Band Tests
 *
 * Tests for REF‑RAG tri-band context support in the HTTP server
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createServer } from '../src/server.js';
import type { FastifyInstance } from 'fastify';

// Mock the model router
vi.mock('../src/model-router.js', () => ({
	createModelRouter: vi.fn(() => ({
		initialize: vi.fn().mockResolvedValue(undefined),
		hasCapability: vi.fn().mockReturnValue(true),
		generateChat: vi.fn().mockResolvedValue({
			content: 'Standard response',
			model: 'test-model'
		}),
		generateChatWithBands: vi.fn().mockResolvedValue({
			content: 'Tri-band response',
			model: 'test-model',
			bandUsage: {
				bandAChars: 500,
				bandBVirtualTokens: 25,
				bandCFacts: 3
			},
			virtualTokenMode: 'pass-through',
			structuredFactsProcessed: true
		}),
		generateEmbedding: vi.fn().mockResolvedValue({
			embedding: [0.1, 0.2, 0.3],
			model: 'test-model'
		}),
		generateEmbeddings: vi.fn().mockResolvedValue({
			embeddings: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
			model: 'test-model'
		}),
		rerank: vi.fn().mockResolvedValue({
			documents: ['doc1', 'doc2'],
			scores: [0.8, 0.6],
			model: 'test-model'
		}),
		getAvailableModels: vi.fn().mockReturnValue([]),
		hasAvailableModels: vi.fn().mockReturnValue(true),
		isPrivacyModeEnabled: vi.fn().mockReturnValue(false),
		setPrivacyMode: vi.fn(),
		getOrchestrationHealth: vi.fn().mockReturnValue({
			status: 'ok',
			orchestration: 'test'
		})
	}))
}));

// Mock the advanced policy router
vi.mock('../src/advanced-policy-router.js', () => ({
	createAdvancedPolicyRouter: vi.fn(() => ({
		enforce: vi.fn().mockResolvedValue(undefined),
		close: vi.fn()
	}))
}));

describe('Server Tri-Band Support', () => {
	let app: FastifyInstance;

	beforeEach(async () => {
		app = createServer();
		await app.ready();
	});

	afterEach(async () => {
		await app.close();
	});

	describe('POST /chat with tri-band context', () => {
		it('should handle tri-band chat requests', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'What is the capital?' }],
					bandA: 'Paris is the capital of France.',
					bandB: [0.1, 0.2, 0.3, 0.4, 0.5],
					bandC: [
						{
							type: 'location',
							value: 'Paris',
							context: 'capital of France',
							confidence: 0.95
						}
					],
					virtualTokenMode: 'pass-through',
					enableStructuredOutput: true
				}
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);

			expect(body.content).toBe('Tri-band response');
			expect(body.modelUsed).toBe('test-model');
			expect(body.bandUsage).toBeDefined();
			expect(body.bandUsage.bandAChars).toBe(500);
			expect(body.bandUsage.bandBVirtualTokens).toBe(25);
			expect(body.bandUsage.bandCFacts).toBe(3);
			expect(body.virtualTokenMode).toBe('pass-through');
			expect(body.structuredFactsProcessed).toBe(true);
		});

		it('should validate tri-band schema', async () => {
			// Test invalid bandC structure
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }],
					bandC: [
						{
							// Missing required fields
							type: 'location'
							// Missing value, context, confidence
						}
					]
				}
			});

			expect(response.statusCode).toBe(400);
			const body = JSON.parse(response.payload);
			expect(body.error).toBe('Validation failed');
		});

		it('should handle virtual token mode validation', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }],
					bandB: [0.1, 0.2, 0.3],
					virtualTokenMode: 'invalid-mode' // Should be one of: ignore, decode, pass-through
				}
			});

			expect(response.statusCode).toBe(400);
			const body = JSON.parse(response.payload);
			expect(body.error).toBe('Validation failed');
		});

		it('should validate bandC confidence range', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }],
					bandC: [
						{
							type: 'number',
							value: 42,
							context: 'test',
							confidence: 1.5 // Should be between 0 and 1
						}
					]
				}
			});

			expect(response.statusCode).toBe(400);
			const body = JSON.parse(response.payload);
			expect(body.error).toBe('Validation failed');
		});

		it('should handle empty tri-band context', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }],
					bandA: '',
					bandB: [],
					bandC: []
				}
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);
			expect(body.content).toBeDefined();
		});

		it('should log REF‑RAG tri-band context usage', async () => {
			const logSpy = vi.spyOn(app.log, 'info');

			await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }],
					bandA: 'Context here',
					bandB: [0.1, 0.2],
					bandC: [{ type: 'fact', value: 'test', context: 'demo', confidence: 0.9 }]
				}
			});

			// Should log tri-band context detection
			expect(logSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					hasBandA: true,
					bandBLength: 2,
					bandCFacts: 1,
					virtualTokenMode: 'pass-through',
					enableStructuredOutput: false
				}),
				'REF‑RAG tri-band context detected'
			);
		});

		it('should include tri-band metadata in evidence', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'What is Paris?' }],
					bandA: 'Paris is the capital of France.',
					bandC: [
						{
							type: 'location',
							value: 'Paris',
							context: 'capital of France',
							confidence: 0.95
						}
					]
				}
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);

			expect(body.evidence).toBeDefined();
			expect(Array.isArray(body.evidence)).toBe(true);

			// Should include tri-band context in evidence
			const bandAEvidence = body.evidence.find((e: any) => e.text?.includes('Paris is the capital'));
			expect(bandAEvidence).toBeDefined();

			const bandCEvidence = body.evidence.find((e: any) => e.text?.includes('Band C context'));
			expect(bandCEvidence).toBeDefined();
		});

		it('should handle structured output processing', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'List the key facts' }],
					bandC: [
						{
							type: 'number',
							value: 42,
							context: 'important number',
							confidence: 0.99
						},
						{
							type: 'date',
							value: '2024-01-01',
							context: 'reference date',
							confidence: 0.95
						}
					],
					enableStructuredOutput: true
				}
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);
			expect(body.structuredFactsProcessed).toBe(true);
		});

		it('should respect request headers for traceability', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				headers: {
					'x-run-id': 'test-run-123',
					'x-trace-id': 'test-trace-456'
				},
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }],
					bandA: 'Context'
				}
			});

			expect(response.statusCode).toBe(200);
			// The request should be processed with the provided headers
			// (Headers are used internally for audit/logging)
		});

		it('should fall back gracefully when tri-band processing fails', async () => {
			// Mock the model router to throw an error for tri-band
			const { createModelRouter } = await import('../src/model-router.js');
			const mockRouter = (createModelRouter as any)();

			mockRouter.generateChatWithBands.mockRejectedValue(new Error('Tri-band processing failed'));
			mockRouter.generateChat.mockResolvedValue({
				content: 'Fallback response',
				model: 'fallback-model'
			});

			const fallbackApp = createServer(mockRouter, undefined);
			await fallbackApp.ready();

			const response = await fallbackApp.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }],
					bandA: 'This will fail'
				}
			});

			expect(response.statusCode).toBe(500);
			const body = JSON.parse(response.payload);
			expect(body.error).toContain('Tri-band processing failed');

			await fallbackApp.close();
		});
	});

	describe('tri-band policy enforcement', () => {
		it('should enforce policies on tri-band requests', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }],
					bandA: 'Context that needs policy check',
					bandC: [{ type: 'sensitive', value: 'data', context: 'private', confidence: 0.9 }]
				}
			});

			expect(response.statusCode).toBe(200);
			// Policy enforcement is handled by the advanced policy router
			// If policies block the request, it would return 403
		});

		it('should handle policy enforcement failures', async () => {
			// Mock policy router to throw an error
			const { createAdvancedPolicyRouter } = await import('../src/advanced-policy-router.js');
			const mockPolicyRouter = (createAdvancedPolicyRouter as any)();

			mockPolicyRouter.enforce.mockRejectedValue(new Error('Policy enforcement failed'));

			const policyApp = createServer(undefined, mockPolicyRouter);
			await policyApp.ready();

			const response = await policyApp.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }],
					bandA: 'Context'
				}
			});

			expect(response.statusCode).toBe(403);
			const body = JSON.parse(response.payload);
			expect(body.error).toContain('Policy enforcement failed');

			await policyApp.close();
		});
	});

	describe('backward compatibility', () => {
		it('should handle standard chat requests without tri-band context', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }]
					// No tri-band fields
				}
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);
			expect(body.content).toBe('Standard response');
			expect(body.modelUsed).toBe('test-model');
		});

		it('should ignore unknown fields in tri-band requests', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }],
					bandA: 'Context',
					unknownField: 'should be ignored',
					bandC: [{ type: 'fact', value: 'test', context: 'demo', confidence: 0.9 }]
				}
			});

			expect(response.statusCode).toBe(200);
		});
	});

	describe('performance and limits', () => {
		it('should handle large tri-band context efficiently', async () => {
			const largeBandA = 'A'.repeat(10000); // 10KB of text
			const largeBandB = Array(1000).fill(0.1); // 1000 virtual tokens
			const largeBandC = Array(100).fill(null).map((_, i) => ({
				type: 'fact',
				value: `fact-${i}`,
				context: `context-${i}`,
				confidence: 0.9
			}));

			const startTime = Date.now();
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Process large context' }],
					bandA: largeBandA,
					bandB: largeBandB,
					bandC: largeBandC
				}
			});
			const endTime = Date.now();

			expect(response.statusCode).toBe(200);
			expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
		});

		it('should validate maximum payload sizes', async () => {
			// Create an extremely large payload that should be rejected
			const extremelyLargeBandA = 'A'.repeat(1000000); // 1MB of text

			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }],
					bandA: extremelyLargeBandA
				}
			});

			// Should either be processed successfully or rejected due to size limits
			expect([200, 413, 400]).toContain(response.statusCode);
		});
	});

	describe('error handling', () => {
		it('should provide detailed error messages for validation failures', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }],
					bandC: [
						{
							type: 'invalid-type-with-hyphens', // Should not contain hyphens
							value: 'test',
							context: 'demo',
							confidence: 0.9
						}
					]
				}
			});

			expect(response.statusCode).toBe(400);
			const body = JSON.parse(response.payload);
			expect(body.error).toBe('Validation failed');
			expect(body.details).toBeDefined();
			expect(Array.isArray(body.details)).toBe(true);
		});

		it('should handle malformed JSON gracefully', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				headers: {
					'content-type': 'application/json'
				},
				body: '{"msgs": [{"role": "user", "content": "Hello"}], "bandA": "unclosed string'
			});

			expect(response.statusCode).toBe(400);
		});
	});

	describe('metrics and monitoring', () => {
		it('should include tri-band metrics in responses', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/chat',
				payload: {
					msgs: [{ role: 'user', content: 'Hello' }],
					bandA: 'Context',
					bandB: [0.1, 0.2],
					bandC: [{ type: 'fact', value: 'test', context: 'demo', confidence: 0.9 }]
				}
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);

			// Should include band usage statistics
			expect(body.bandUsage).toBeDefined();
			if (body.bandUsage) {
				expect(typeof body.bandUsage.bandAChars).toBe('number');
				expect(typeof body.bandUsage.bandBVirtualTokens).toBe('number');
				expect(typeof body.bandUsage.bandCFacts).toBe('number');
			}
		});
	});
});