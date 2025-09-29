import { EvidenceEnhancer } from '@cortex-os/evidence-runner';
import { ToolMapper } from '@cortex-os/mcp-core';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BrowserExecutor, DatabaseExecutor } from '../src/index.js';

/**
 * MCP Bridge Smoke Tests for brAInwav Cortex-OS Phase 8
 *
 * These tests validate end-to-end functionality of Evidence Enhancement & MCP Bridge
 * Gated by PLAYWRIGHT=1 environment variable for browser automation tests
 */

describe('MCP Bridge Smoke Tests - Phase 8 Integration', () => {
	const isPlaywrightEnabled = process.env.PLAYWRIGHT === '1';

	beforeAll(() => {
		if (!isPlaywrightEnabled) {
			console.log('⚠️  Skipping browser tests - set PLAYWRIGHT=1 to enable');
		}
	});

	describe('Evidence Enhancement Integration', () => {
		it('should enhance evidence end-to-end with MLX integration', async () => {
			const evidenceEnhancer = new EvidenceEnhancer({
				mlxModelPath: '/test/models/qwen3-4b',
				enableMLXGeneration: true,
				enableEmbeddingSearch: true,
				confidenceBoost: 0.1,
				temperature: 0.3,
				maxTokens: 512,
			});

			const context = {
				taskId: 'smoke-test-evidence-001',
				claim: 'brAInwav Cortex-OS Phase 8 implementation provides secure evidence enhancement',
				sources: [
					{
						type: 'file' as const,
						path: '/src/evidence-enhancer.ts',
						content: 'export class EvidenceEnhancer { /* implementation */ }',
					},
				],
				metadata: {
					priority: 'high' as const,
					domain: 'integration-testing',
				},
			};

			const result = await evidenceEnhancer.enhanceEvidence(context);

			// Validate brAInwav branding and functionality
			expect(result.metadata.processor).toContain('brAInwav');
			expect(result.confidence).toBeGreaterThan(0.4);
			expect(result.aiAnalysis).toBeDefined();
			expect(result.processingTime).toBeLessThan(2000); // <2s SLA
			expect(result.enhancements).toContain('mlx-generation');
		});

		it('should handle error scenarios gracefully with brAInwav branding', async () => {
			const faultyEnhancer = new EvidenceEnhancer({
				mlxModelPath: '/nonexistent/model/path',
				enableMLXGeneration: true,
				enableEmbeddingSearch: true,
				confidenceBoost: 0.1,
				temperature: 0.3,
				maxTokens: 512,
			});

			const context = {
				taskId: 'smoke-test-error-002',
				claim: 'Error handling maintains brAInwav brand visibility',
				sources: [
					{
						type: 'file' as const,
						path: '/test/error.ts',
						content: 'console.log("test");',
					},
				],
			};

			const result = await faultyEnhancer.enhanceEvidence(context);

			// Should maintain brAInwav branding even in error scenarios
			expect(result.metadata.processor).toContain('brAInwav');
			expect(result.fallbackUsed).toBe(true);
			expect(result.errors).toBeDefined();
			expect(result.errors?.[0]).toContain('MLX model unavailable');
		});
	});

	describe('Browser Executor Integration', () => {
		const conditionalTest = isPlaywrightEnabled ? it : it.skip;

		conditionalTest('should extract DOM content securely with brAInwav branding', async () => {
			const browserExecutor = new BrowserExecutor({
				headless: true,
				timeout: 30000,
				viewport: { width: 1280, height: 720 },
				enableSandbox: true,
				allowedDomains: ['example.com'],
				maxConcurrentBrowsers: 3,
			});

			const extractionRequest = {
				url: 'https://example.com',
				selectors: ['h1', '.content'],
				timeout: 10000,
			};

			const result = await browserExecutor.extractDOM(extractionRequest);

			// Validate secure extraction with brAInwav branding
			expect(result.success).toBe(true);
			expect(result.metadata.processorName).toContain('brAInwav');
			expect(result.extractedContent).toBeDefined();
			expect(result.processingTime).toBeLessThan(5000); // <5s SLA

			await browserExecutor.cleanup();
		});

		conditionalTest('should block malicious domains with proper error messages', async () => {
			const browserExecutor = new BrowserExecutor({
				headless: true,
				timeout: 30000,
				enableSandbox: true,
				allowedDomains: ['example.com'],
				maxConcurrentBrowsers: 3,
			});

			const maliciousRequest = {
				url: 'https://malicious-site.com/dangerous-script',
				selectors: ['*'],
				timeout: 5000,
			};

			await expect(browserExecutor.extractDOM(maliciousRequest)).rejects.toThrow(
				'Domain not allowed',
			);

			await browserExecutor.cleanup();
		});
	});

	describe('Database Executor Integration', () => {
		it('should execute parameterized queries securely with brAInwav branding', async () => {
			const databaseExecutor = new DatabaseExecutor({
				connectionString: 'postgresql://test:test@localhost:5432/testdb',
				poolSize: 5,
				queryTimeout: 30000,
				enableParameterValidation: true,
				allowedOperations: ['SELECT', 'INSERT'],
				maxConcurrentQueries: 3,
				preferReadReplica: false,
			});

			const queryRequest = {
				query: 'SELECT id, name FROM users WHERE status = $1',
				parameters: ['active'],
				timeout: 10000,
			};

			const result = await databaseExecutor.executeQuery(queryRequest);

			// Validate secure database operations with brAInwav branding
			expect(result.success).toBe(true);
			expect(result.metadata.processorName).toContain('brAInwav');
			expect(result.processingTime).toBeLessThan(500); // <500ms SLA
			expect(result.rows).toBeDefined();

			await databaseExecutor.cleanup();
		});

		it('should block SQL injection attempts with proper error handling', async () => {
			const databaseExecutor = new DatabaseExecutor({
				connectionString: 'postgresql://test:test@localhost:5432/testdb',
				poolSize: 5,
				queryTimeout: 30000,
				enableParameterValidation: true,
				allowedOperations: ['SELECT'],
				maxConcurrentQueries: 3,
				preferReadReplica: false,
			});

			const maliciousQuery = {
				query: "SELECT * FROM users WHERE name = 'admin'; DROP TABLE users; --",
				parameters: [],
				timeout: 5000,
			};

			await expect(databaseExecutor.executeQuery(maliciousQuery)).rejects.toThrow(
				'SQL injection detected',
			);

			await databaseExecutor.cleanup();
		});

		it('should handle transaction rollback with proper error messages', async () => {
			const databaseExecutor = new DatabaseExecutor({
				connectionString: 'postgresql://test:test@localhost:5432/testdb',
				poolSize: 5,
				queryTimeout: 30000,
				enableParameterValidation: true,
				allowedOperations: ['INSERT', 'UPDATE'],
				maxConcurrentQueries: 3,
				preferReadReplica: false,
			});

			const transactionQueries = [
				{
					query: 'INSERT INTO orders (user_id, amount) VALUES ($1, $2)',
					parameters: [123, 99.99],
				},
				{
					query: 'UPDATE accounts SET balance = balance - $1 WHERE user_id = $2',
					parameters: [99.99, 123],
				},
			];

			const result = await databaseExecutor.executeTransaction(transactionQueries);

			expect(result.success).toBe(true);
			expect(result.transactionId).toBeDefined();
			expect(result.results).toHaveLength(2);

			await databaseExecutor.cleanup();
		});
	});

	describe('Tool Mapping Integration', () => {
		it('should map unknown tools with safe fallbacks and brAInwav branding', async () => {
			const toolMapper = new ToolMapper({
				enableSafeFallbacks: true,
				maxRetries: 3,
				fallbackTimeout: 5000,
				supportedToolTypes: ['web-search', 'file-read', 'database-query'],
				securityLevel: 'strict',
				allowExternalTools: false,
			});

			const unknownToolRequest = {
				toolType: 'ai-analysis-tool',
				parameters: {
					input: 'analyze system performance',
					mode: 'comprehensive',
				},
				context: {
					source: 'user',
					priority: 'medium' as const,
					allowFallbacks: true,
				},
			};

			const result = await toolMapper.mapTool(unknownToolRequest);

			// Validate tool mapping with brAInwav branding
			expect(result.success).toBe(true);
			expect(result.metadata.processor).toContain('brAInwav');
			expect(result.processingTime).toBeLessThan(100); // <100ms SLA
			expect(result.fallbackUsed).toBe(true);
			expect(result.mappedTool).toBeDefined();
			expect(result.confidence).toBeGreaterThan(0.3);
		});

		it('should block dangerous tool requests with security violations', async () => {
			const toolMapper = new ToolMapper({
				enableSafeFallbacks: true,
				maxRetries: 3,
				fallbackTimeout: 5000,
				supportedToolTypes: ['web-search'],
				securityLevel: 'strict',
				allowExternalTools: false,
			});

			const dangerousToolRequest = {
				toolType: 'system-command',
				parameters: {
					command: 'rm -rf /',
					shell: '/bin/bash',
				},
				context: {
					source: 'external',
					priority: 'high' as const,
				},
			};

			const result = await toolMapper.mapTool(dangerousToolRequest);

			expect(result.success).toBe(false);
			expect(result.error).toContain('Security violation');
			expect(result.securityReason).toBe('dangerous-operation');
			expect(result.metadata.processor).toContain('brAInwav');
		});
	});

	describe('End-to-End Integration Workflow', () => {
		const conditionalTest = isPlaywrightEnabled ? it : it.skip;

		conditionalTest('should complete full evidence enhancement workflow', async () => {
			const telemetryEvents: any[] = [];
			const telemetryCallback = vi.fn((event) => {
				telemetryEvents.push(event);
			});

			// Initialize all components with telemetry
			const evidenceEnhancer = new EvidenceEnhancer({
				mlxModelPath: '/test/models/qwen3-4b',
				enableMLXGeneration: true,
				enableEmbeddingSearch: true,
				confidenceBoost: 0.1,
				temperature: 0.3,
				maxTokens: 512,
				telemetryCallback,
			});

			const browserExecutor = new BrowserExecutor({
				headless: true,
				timeout: 30000,
				enableSandbox: true,
				allowedDomains: ['example.com'],
				maxConcurrentBrowsers: 3,
				telemetryCallback,
			});

			const toolMapper = new ToolMapper({
				enableSafeFallbacks: true,
				maxRetries: 3,
				fallbackTimeout: 5000,
				supportedToolTypes: ['web-search', 'browser-action'],
				securityLevel: 'strict',
				allowExternalTools: false,
				telemetryCallback,
			});

			// Step 1: Map unknown tool to browser action
			const toolMappingResult = await toolMapper.mapTool({
				toolType: 'web-data-extraction',
				parameters: { url: 'https://example.com', selectors: ['.content'] },
				context: { source: 'automation', priority: 'high' },
			});

			expect(toolMappingResult.success).toBe(true);
			expect(toolMappingResult.metadata.processor).toContain('brAInwav');

			// Step 2: Execute browser action
			const browserResult = await browserExecutor.extractDOM({
				url: 'https://example.com',
				selectors: ['.content'],
				timeout: 10000,
			});

			expect(browserResult.success).toBe(true);
			expect(browserResult.metadata.processorName).toContain('brAInwav');

			// Step 3: Enhance evidence with extracted data
			const evidenceResult = await evidenceEnhancer.enhanceEvidence({
				taskId: 'e2e-workflow-test',
				claim: 'Web data extraction completed successfully',
				sources: [
					{
						type: 'file',
						path: 'https://example.com',
						content: JSON.stringify(browserResult.extractedContent),
					},
				],
			});

			expect(evidenceResult.metadata.processor).toContain('brAInwav');
			expect(evidenceResult.confidence).toBeGreaterThan(0.5);

			// Validate telemetry events contain brAInwav branding
			expect(telemetryEvents.length).toBeGreaterThan(0);
			telemetryEvents.forEach((event) => {
				if (event.processor) {
					expect(event.processor).toContain('brAInwav');
				}
			});

			// Cleanup
			await browserExecutor.cleanup();
		});

		it('should maintain performance SLAs across all components', async () => {
			const startTime = Date.now();

			// Quick operations for performance testing
			const evidenceEnhancer = new EvidenceEnhancer({
				mlxModelPath: '/test/models/qwen3-4b',
				enableMLXGeneration: true,
				enableEmbeddingSearch: true,
				confidenceBoost: 0.1,
				temperature: 0.3,
				maxTokens: 512,
			});

			const toolMapper = new ToolMapper({
				enableSafeFallbacks: true,
				maxRetries: 3,
				fallbackTimeout: 5000,
				supportedToolTypes: ['web-search'],
				securityLevel: 'strict',
				allowExternalTools: false,
			});

			// Parallel operations
			const [evidenceResult, toolResult] = await Promise.all([
				evidenceEnhancer.enhanceEvidence({
					taskId: 'performance-test',
					claim: 'Performance test claim',
					sources: [{ type: 'file', path: '/test', content: 'test data' }],
				}),
				toolMapper.mapTool({
					toolType: 'quick-search',
					parameters: { query: 'performance test' },
					context: { source: 'test', priority: 'high' },
				}),
			]);

			const totalTime = Date.now() - startTime;

			// Validate individual and total performance
			expect(evidenceResult.processingTime).toBeLessThan(2000); // Evidence <2s
			expect(toolResult.processingTime).toBeLessThan(100); // Tool mapping <100ms
			expect(totalTime).toBeLessThan(3000); // Total <3s

			// Validate brAInwav branding
			expect(evidenceResult.metadata.processor).toContain('brAInwav');
			expect(toolResult.metadata.processor).toContain('brAInwav');
		});
	});

	describe('Health Checks and Observability', () => {
		it('should provide comprehensive health status with brAInwav branding', async () => {
			const evidenceEnhancer = new EvidenceEnhancer({
				mlxModelPath: '/test/models/qwen3-4b',
				enableMLXGeneration: true,
				enableEmbeddingSearch: true,
				confidenceBoost: 0.1,
				temperature: 0.3,
				maxTokens: 512,
			});

			const browserExecutor = new BrowserExecutor({
				headless: true,
				timeout: 30000,
				enableSandbox: true,
				allowedDomains: ['example.com'],
				maxConcurrentBrowsers: 3,
			});

			const toolMapper = new ToolMapper({
				enableSafeFallbacks: true,
				maxRetries: 3,
				fallbackTimeout: 5000,
				supportedToolTypes: ['web-search'],
				securityLevel: 'strict',
				allowExternalTools: false,
			});

			// Get health status from all components
			const [evidenceHealth, browserHealth, toolHealth] = await Promise.all([
				evidenceEnhancer.health(),
				browserExecutor.health(),
				toolMapper.health(),
			]);

			// Validate health status includes brAInwav branding
			expect(evidenceHealth.processorName).toContain('brAInwav');
			expect(browserHealth.processorName).toContain('brAInwav');
			expect(toolHealth.processorName).toContain('brAInwav');

			// Validate health status
			expect(evidenceHealth.status).toBe('healthy');
			expect(browserHealth.status).toBe('healthy');
			expect(toolHealth.status).toBe('healthy');

			await browserExecutor.cleanup();
		});
	});
});
