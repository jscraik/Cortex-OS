import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create a shared mock function
const mockExecute = vi.fn();

// Mock the AgentHandler module
vi.mock('../../../src/server/handlers/agent.handler', () => ({
	AgentHandler: class {
		execute = mockExecute; // Use the shared mock
	},
}));

// Import after mocking
import { agentRoutes } from '../../../src/server/routes/agent.routes.js';

describe('Agent Routes - Advanced Tests', () => {
	let app: Hono;

	beforeEach(() => {
		app = new Hono();
		app.route('/agents', agentRoutes);

		// Reset mocks
		vi.clearAllMocks();
	});

	describe('Agent Execution Endpoint (/agents/execute)', () => {
		it('should successfully execute agent with valid request', async () => {
			const validRequest = {
				agentId: 'test-agent-123',
				input: 'Analyze this code for quality issues',
				context: { userId: 'user-123' },
				options: { timeout: 30000 },
			};

			const expectedResponse = {
				agentId: 'test-agent-123',
				response: 'Code analysis completed successfully',
				timestamp: '2025-09-21T18:40:00.000Z',
				status: 'completed',
			};

			mockExecute.mockResolvedValue(expectedResponse);

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validRequest),
			});

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result).toEqual(expectedResponse);
			expect(mockExecute).toHaveBeenCalledWith(
				expect.any(Object), // Context object
				validRequest,
			);
		});

		it('should handle minimal valid request', async () => {
			const minimalRequest = {
				agentId: 'minimal-agent',
				input: 'Simple task',
			};

			const expectedResponse = {
				agentId: 'minimal-agent',
				response: 'Task completed',
				timestamp: '2025-09-21T18:40:00.000Z',
				status: 'completed',
			};

			mockExecute.mockResolvedValue(expectedResponse);

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(minimalRequest),
			});

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result).toEqual(expectedResponse);
		});

		it('should handle large agent execution requests', async () => {
			const largeRequest = {
				agentId: 'performance-test-agent',
				input: 'x'.repeat(50000), // 50KB input
				context: {
					largeData: Array(1000).fill('test-data'),
					metadata: {
						nested: {
							deep: {
								structure: 'value',
							},
						},
					},
				},
			};

			const expectedResponse = {
				agentId: 'performance-test-agent',
				response: 'Large request processed successfully',
				timestamp: '2025-09-21T18:40:00.000Z',
				status: 'completed',
			};

			mockExecute.mockResolvedValue(expectedResponse);

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(largeRequest),
			});

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result).toEqual(expectedResponse);
		});

		it('should handle agent execution with special characters and Unicode', async () => {
			const unicodeRequest = {
				agentId: 'unicode-agent-🤖',
				input: 'Process this: 你好世界 🌍 Iñtërnâtiônàlizætiøn ñoño café naïve résumé',
				context: {
					emoji: '🚀📊💻🔐',
					unicode: 'Ελληνικά, Русский, 中文, العربية, हिन्दी',
					special: '!@#$%^&*()_+-=[]{}|;\':",./<>?',
				},
			};

			const expectedResponse = {
				agentId: 'unicode-agent-🤖',
				response: 'Unicode content processed: 多语言支持 ✅',
				timestamp: '2025-09-21T18:40:00.000Z',
				status: 'completed',
			};

			mockExecute.mockResolvedValue(expectedResponse);

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(unicodeRequest),
			});

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result).toEqual(expectedResponse);
		});
	});

	describe('Request Validation and Error Handling', () => {
		it('should reject requests without Content-Type header', async () => {
			const response = await app.request('/agents/execute', {
				method: 'POST',
				body: JSON.stringify({ agentId: 'test', input: 'test' }),
			});

			expect(response.status).toBe(400);
			const result = await response.json();
			expect(result.message).toBe('Content-Type must be application/json');
		});

		it('should reject requests with wrong Content-Type', async () => {
			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'text/plain' },
				body: 'plain text body',
			});

			expect(response.status).toBe(400);
			const result = await response.json();
			expect(result.message).toBe('Content-Type must be application/json');
		});

		it('should reject requests exceeding size limit (1MB)', async () => {
			const oversizedRequest = {
				agentId: 'large-agent',
				input: 'x'.repeat(1024 * 1024 + 1), // Slightly over 1MB
			};

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(oversizedRequest),
			});

			expect(response.status).toBe(413);
			const result = await response.json();
			expect(result.message).toBe('Request entity too large');
		});

		it('should reject malformed JSON requests', async () => {
			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{ invalid json syntax',
			});

			expect(response.status).toBe(400);
			const result = await response.json();
			expect(result.message).toBe('Invalid JSON in request body');
		});

		it('should validate required fields using Zod schema', async () => {
			const invalidRequest = {
				// Missing agentId and input
				context: { test: 'data' },
			};

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(invalidRequest),
			});

			expect(response.status).toBe(400);
			const result = await response.json();
			expect(result.message).toBe('Invalid request body');
		});

		it('should reject empty agentId', async () => {
			const invalidRequest = {
				agentId: '',
				input: 'test input',
			};

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(invalidRequest),
			});

			expect(response.status).toBe(400);
			const result = await response.json();
			expect(result.message).toBe('Invalid request body');
		});

		it('should reject empty input', async () => {
			const invalidRequest = {
				agentId: 'test-agent',
				input: '',
			};

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(invalidRequest),
			});

			expect(response.status).toBe(400);
			const result = await response.json();
			expect(result.message).toBe('Invalid request body');
		});
	});

	describe('HTTP Method Handling', () => {
		it('should reject GET requests to /agents/execute', async () => {
			const response = await app.request('/agents/execute', {
				method: 'GET',
			});

			expect(response.status).toBe(405);
			const result = await response.json();
			expect(result.message).toBe('Method Not Allowed');
		});

		it('should reject PUT requests to /agents/execute', async () => {
			const response = await app.request('/agents/execute', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ agentId: 'test', input: 'test' }),
			});

			expect(response.status).toBe(405);
			const result = await response.json();
			expect(result.message).toBe('Method Not Allowed');
		});

		it('should reject DELETE requests to /agents/execute', async () => {
			const response = await app.request('/agents/execute', {
				method: 'DELETE',
			});

			expect(response.status).toBe(405);
			const result = await response.json();
			expect(result.message).toBe('Method Not Allowed');
		});

		it('should reject PATCH requests to /agents/execute', async () => {
			const response = await app.request('/agents/execute', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ agentId: 'test', input: 'test' }),
			});

			expect(response.status).toBe(405);
			const result = await response.json();
			expect(result.message).toBe('Method Not Allowed');
		});
	});

	describe('Handler Error Handling', () => {
		it('should handle handler execution errors gracefully', async () => {
			const validRequest = {
				agentId: 'error-agent',
				input: 'This will cause an error',
			};

			mockExecute.mockRejectedValue(new Error('Agent execution failed'));

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validRequest),
			});

			expect(response.status).toBe(500);
			expect(mockExecute).toHaveBeenCalled();
		});

		it('should handle handler timeout scenarios', async () => {
			const validRequest = {
				agentId: 'timeout-agent',
				input: 'This will timeout',
			};

			mockExecute.mockRejectedValue(new Error('Request timeout'));

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validRequest),
			});

			expect(response.status).toBe(500);
			expect(mockExecute).toHaveBeenCalled();
		});
	});

	describe('brAInwav Production Requirements', () => {
		it('should handle brAInwav specialized agent execution', async () => {
			const brAInwavRequest = {
				agentId: 'brAInwav-code-analysis-agent',
				input: 'Analyze this TypeScript code for brAInwav standards compliance',
				context: {
					branding: 'brAInwav',
					standards: ['typescript', 'eslint', 'prettier'],
					compliance: true,
				},
				options: {
					strictMode: true,
					brAInwavStandards: true,
				},
			};

			const expectedResponse = {
				agentId: 'brAInwav-code-analysis-agent',
				response: 'brAInwav code analysis completed - standards compliant ✅',
				timestamp: '2025-09-21T18:40:00.000Z',
				status: 'completed',
			};

			mockExecute.mockResolvedValue(expectedResponse);

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(brAInwavRequest),
			});

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result).toEqual(expectedResponse);
			expect(result.response).toContain('brAInwav');
		});

		it('should handle concurrent brAInwav agent executions', async () => {
			const requests = Array(10)
				.fill(0)
				.map((_, i) => ({
					agentId: `brAInwav-concurrent-agent-${i}`,
					input: `Concurrent task ${i}`,
					context: { concurrencyTest: true, taskId: i },
				}));

			// Mock handler to return unique responses
			mockExecute.mockImplementation((_: any, req: any) =>
				Promise.resolve({
					agentId: req.agentId,
					response: `Processed ${req.input}`,
					timestamp: '2025-09-21T18:40:00.000Z',
					status: 'completed',
				}),
			);

			const promises = requests.map((request) =>
				app.request('/agents/execute', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(request),
				}),
			);

			const responses = await Promise.all(promises);

			responses.forEach((response) => {
				expect(response.status).toBe(200);
			});

			// Handler should be called for each request
			expect(mockExecute).toHaveBeenCalledTimes(10);
		});

		it('should maintain brAInwav agent execution performance', async () => {
			const performanceRequest = {
				agentId: 'brAInwav-performance-agent',
				input: 'High-performance processing task',
				options: {
					priority: 'high',
					brAInwavOptimized: true,
				},
			};

			const startTime = Date.now();

			mockExecute.mockResolvedValue({
				agentId: 'brAInwav-performance-agent',
				response: 'High-performance task completed',
				timestamp: '2025-09-21T18:40:00.000Z',
				status: 'completed',
			});

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(performanceRequest),
			});

			const endTime = Date.now();
			const duration = endTime - startTime;

			expect(response.status).toBe(200);
			// brAInwav performance requirement: API response under 100ms (excluding actual agent processing)
			expect(duration).toBeLessThan(100);
		});
	});

	describe('Edge Cases and Resilience', () => {
		it('should handle null/undefined values in request', async () => {
			const edgeCaseRequest = {
				agentId: 'edge-case-agent',
				input: 'test',
				context: {
					nullValue: null,
					undefinedValue: undefined,
					emptyString: '',
					emptyArray: [],
					emptyObject: {},
				},
			};

			mockExecute.mockResolvedValue({
				agentId: 'edge-case-agent',
				response: 'Edge case handled successfully',
				timestamp: '2025-09-21T18:40:00.000Z',
				status: 'completed',
			});

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(edgeCaseRequest),
			});

			expect(response.status).toBe(200);
		});

		it('should handle deeply nested request structures', async () => {
			const deepRequest = {
				agentId: 'deep-structure-agent',
				input: 'Process nested data',
				context: {
					level1: {
						level2: {
							level3: {
								level4: {
									level5: {
										deepValue: 'nested data',
										array: [1, 2, { nested: true }],
									},
								},
							},
						},
					},
				},
			};

			mockExecute.mockResolvedValue({
				agentId: 'deep-structure-agent',
				response: 'Deep structure processed',
				timestamp: '2025-09-21T18:40:00.000Z',
				status: 'completed',
			});

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(deepRequest),
			});

			expect(response.status).toBe(200);
		});

		it('should handle requests with circular JSON references gracefully', async () => {
			// Create object with circular reference
			const circularObj: any = { agentId: 'circular-agent', input: 'test' };
			circularObj.self = circularObj;

			// This should fail at JSON.stringify level, resulting in malformed JSON error
			let jsonString: string;
			try {
				jsonString = JSON.stringify(circularObj);
			} catch {
				// Expected - use a malformed JSON to simulate this
				jsonString = '{"agentId":"circular-agent","input":"test","self":';
			}

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: jsonString,
			});

			expect(response.status).toBe(400);
			const result = await response.json();
			expect(result.message).toBe('Invalid JSON in request body');
		});
	});

	describe('Response Format Validation', () => {
		it('should validate response matches expected schema', async () => {
			const validRequest = {
				agentId: 'schema-test-agent',
				input: 'Test response format',
			};

			const validResponse = {
				agentId: 'schema-test-agent',
				response: 'Schema validation successful',
				timestamp: '2025-09-21T18:40:00.000Z',
				status: 'completed' as const,
			};

			mockExecute.mockResolvedValue(validResponse);

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validRequest),
			});

			expect(response.status).toBe(200);
			const result = await response.json();

			// Validate all required fields are present
			expect(result).toHaveProperty('agentId');
			expect(result).toHaveProperty('response');
			expect(result).toHaveProperty('timestamp');
			expect(result).toHaveProperty('status');

			// Validate types
			expect(typeof result.agentId).toBe('string');
			expect(typeof result.response).toBe('string');
			expect(typeof result.timestamp).toBe('string');
			expect(['completed', 'failed', 'pending']).toContain(result.status);
		});

		it('should handle response with optional error field', async () => {
			const validRequest = {
				agentId: 'error-response-agent',
				input: 'Test error response format',
			};

			const errorResponse = {
				agentId: 'error-response-agent',
				response: 'Task completed with warnings',
				timestamp: '2025-09-21T18:40:00.000Z',
				status: 'completed' as const,
				error: 'Minor warning: deprecated feature used',
			};

			mockExecute.mockResolvedValue(errorResponse);

			const response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validRequest),
			});

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.error).toBe('Minor warning: deprecated feature used');
		});
	});
});
