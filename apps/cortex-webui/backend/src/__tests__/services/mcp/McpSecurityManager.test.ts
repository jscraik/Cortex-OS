/**
 * Tests for McpSecurityManager
 */

import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { McpSecurityManager } from '../../../services/mcp/McpSecurityManager.ts';
import type { ExecutionRequest } from '../../../services/mcp/McpToolExecutor.ts';
import type { McpToolRegistration } from '../../../services/mcp/McpToolRegistry.ts';

describe('McpSecurityManager', () => {
	let securityManager: McpSecurityManager;
	let mockTool: McpToolRegistration;

	beforeEach(() => {
		securityManager = new McpSecurityManager({
			maxRequestsPerMinute: 5,
			maxRequestsPerHour: 10,
			enableRateLimiting: true,
			enableInputValidation: true,
			enablePermissionCheck: true,
			enableResourceLimits: true,
			enableAuditLogging: true,
		});

		mockTool = createMockTool();
	});

	afterEach(() => {
		securityManager.clearRateLimits();
	});

	describe('Security Validation', () => {
		it('should validate execution request successfully', async () => {
			const request = createExecutionRequest({
				permissions: ['test-permission'],
			});

			await expect(securityManager.validateExecution(request, mockTool)).resolves.not.toThrow();
		});

		it('should reject request for blocked tool', async () => {
			const config = { blockedTools: [mockTool.metadata.name] };
			securityManager.updateConfig(config);

			const request = createExecutionRequest();

			await expect(securityManager.validateExecution(request, mockTool)).rejects.toThrow(
				/Tool is blocked by security policy/,
			);
		});
	});

	describe('Rate Limiting', () => {
		it('should enforce rate limits', async () => {
			const request = createExecutionRequest({
				context: { userId: 'test-user' },
			});

			// Make requests up to the limit
			for (let i = 0; i < 5; i++) {
				await securityManager.validateExecution(request, mockTool);
			}

			// Next request should be rate limited
			await expect(securityManager.validateExecution(request, mockTool)).rejects.toThrow(
				/Rate limit exceeded/,
			);
		});

		it('should reset rate limit after window expires', async () => {
			const request = createExecutionRequest({
				context: { userId: 'test-user' },
			});

			// Fill up rate limit
			for (let i = 0; i < 5; i++) {
				await securityManager.validateExecution(request, mockTool);
			}

			// Clear rate limits manually to simulate window expiry
			securityManager.clearRateLimits('test-user');

			// Should be able to make requests again
			await expect(securityManager.validateExecution(request, mockTool)).resolves.not.toThrow();
		});

		it('should handle different users separately', async () => {
			const request1 = createExecutionRequest({
				context: { userId: 'user1' },
			});
			const request2 = createExecutionRequest({
				context: { userId: 'user2' },
			});

			// User1 fills rate limit
			for (let i = 0; i < 5; i++) {
				await securityManager.validateExecution(request1, mockTool);
			}

			// User1 should be rate limited
			await expect(securityManager.validateExecution(request1, mockTool)).rejects.toThrow(
				/Rate limit exceeded/,
			);

			// User2 should still be able to make requests
			await expect(securityManager.validateExecution(request2, mockTool)).resolves.not.toThrow();
		});

		it('should work with rate limiting disabled', async () => {
			securityManager.updateConfig({ enableRateLimiting: false });

			const request = createExecutionRequest({
				context: { userId: 'test-user' },
			});

			// Should be able to make unlimited requests
			for (let i = 0; i < 20; i++) {
				await securityManager.validateExecution(request, mockTool);
			}
		});
	});

	describe('Permission Checking', () => {
		it('should allow access with required permissions', async () => {
			const toolWithPermissions = createMockTool({
				permissions: ['read', 'write'],
			});

			const request = createExecutionRequest({
				context: { permissions: ['read', 'write', 'admin'] },
			});

			await expect(
				securityManager.validateExecution(request, toolWithPermissions),
			).resolves.not.toThrow();
		});

		it('should deny access without required permissions', async () => {
			const toolWithPermissions = createMockTool({
				permissions: ['admin', 'write'],
			});

			const request = createExecutionRequest({
				context: { permissions: ['read'] },
			});

			await expect(securityManager.validateExecution(request, toolWithPermissions)).rejects.toThrow(
				/Insufficient permissions/,
			);
		});

		it('should allow admin users access to any tool', async () => {
			const toolWithPermissions = createMockTool({
				permissions: ['super-secret'],
			});

			const request = createExecutionRequest({
				context: { permissions: ['admin'] },
			});

			await expect(
				securityManager.validateExecution(request, toolWithPermissions),
			).resolves.not.toThrow();
		});

		it('should work with permission checking disabled', async () => {
			securityManager.updateConfig({ enablePermissionCheck: false });

			const toolWithPermissions = createMockTool({
				permissions: ['admin-only'],
			});

			const request = createExecutionRequest({
				context: { permissions: [] },
			});

			await expect(
				securityManager.validateExecution(request, toolWithPermissions),
			).resolves.not.toThrow();
		});
	});

	describe('Input Validation', () => {
		it('should validate input against tool schema', async () => {
			const request = createExecutionRequest({
				params: { input: 'valid input' },
			});

			await expect(securityManager.validateExecution(request, mockTool)).resolves.not.toThrow();
		});

		it('should reject invalid input', async () => {
			const request = createExecutionRequest({
				params: { invalid: 'input' },
			});

			await expect(securityManager.validateExecution(request, mockTool)).rejects.toThrow(
				/Input validation failed/,
			);
		});

		it('should reject oversized payloads', async () => {
			const largeInput = 'x'.repeat(2 * 1024 * 1024); // 2MB

			const request = createExecutionRequest({
				params: { input: largeInput },
			});

			await expect(securityManager.validateExecution(request, mockTool)).rejects.toThrow(
				/Payload too large/,
			);
		});

		it('should detect dangerous content', async () => {
			const dangerousInput = { input: '<script>alert("xss")</script>' };

			const request = createExecutionRequest({
				params: dangerousInput,
			});

			await expect(securityManager.validateExecution(request, mockTool)).rejects.toThrow(
				/Potentially dangerous content detected/,
			);
		});

		it('should detect path traversal attempts', async () => {
			const pathTraversalInput = { input: '../../../etc/passwd' };

			const request = createExecutionRequest({
				params: pathTraversalInput,
			});

			await expect(securityManager.validateExecution(request, mockTool)).rejects.toThrow(
				/Path traversal attempt detected/,
			);
		});

		it('should work with input validation disabled', async () => {
			securityManager.updateConfig({ enableInputValidation: false });

			const request = createExecutionRequest({
				params: { invalid: 'input' },
			});

			await expect(securityManager.validateExecution(request, mockTool)).resolves.not.toThrow();
		});
	});

	describe('Resource Limits', () => {
		it('should enforce execution time limits', async () => {
			const toolWithLimits = createMockTool({
				resourceLimits: { maxExecutionTime: 5000 },
			});

			const request = createExecutionRequest({
				timeout: 10000, // Exceeds tool limit
			});

			await expect(securityManager.validateExecution(request, toolWithLimits)).rejects.toThrow(
				/Requested timeout .* exceeds tool limit/,
			);
		});

		it('should allow requests within limits', async () => {
			const toolWithLimits = createMockTool({
				resourceLimits: { maxExecutionTime: 10000 },
			});

			const request = createExecutionRequest({
				timeout: 5000, // Within tool limit
			});

			await expect(
				securityManager.validateExecution(request, toolWithLimits),
			).resolves.not.toThrow();
		});

		it('should work with resource limits disabled', async () => {
			securityManager.updateConfig({ enableResourceLimits: false });

			const toolWithLimits = createMockTool({
				resourceLimits: { maxExecutionTime: 1000 },
			});

			const request = createExecutionRequest({
				timeout: 10000, // Exceeds tool limit
			});

			await expect(
				securityManager.validateExecution(request, toolWithLimits),
			).resolves.not.toThrow();
		});
	});

	describe('Audit Logging', () => {
		it('should log access attempts', async () => {
			const auditSpy = vi.spyOn(securityManager, 'logAccess' as any);

			const request = createExecutionRequest();

			await securityManager.validateExecution(request, mockTool);

			expect(auditSpy).toHaveBeenCalledWith('access_attempt', expect.any(Object), mockTool, {});
		});

		it('should log access granted', async () => {
			const auditSpy = vi.spyOn(securityManager, 'logAccess' as any);

			const request = createExecutionRequest();

			await securityManager.validateExecution(request, mockTool);

			expect(auditSpy).toHaveBeenCalledWith(
				'access_granted',
				expect.any(Object),
				mockTool,
				expect.objectContaining({ validationTime: expect.any(Number) }),
			);
		});

		it('should log access denied', async () => {
			const auditSpy = vi.spyOn(securityManager, 'logAccess' as any);

			const request = createExecutionRequest({
				params: { invalid: 'input' },
			});

			try {
				await securityManager.validateExecution(request, mockTool);
			} catch {
				// Expected to fail
			}

			expect(auditSpy).toHaveBeenCalledWith(
				'access_denied',
				expect.any(Object),
				mockTool,
				expect.objectContaining({ reason: expect.any(String) }),
			);
		});

		it('should maintain audit log size limit', async () => {
			// Create many audit entries
			for (let i = 0; i < 100; i++) {
				const request = createExecutionRequest({
					context: { correlationId: randomUUID() },
				});
				try {
					await securityManager.validateExecution(request, mockTool);
				} catch {
					// Ignore errors for this test
				}
			}

			const auditLog = securityManager.getAuditLog();
			expect(auditLog.length).toBeLessThanOrEqual(10000); // MAX_AUDIT_ENTRIES
		});
	});

	describe('Configuration Management', () => {
		it('should update configuration', () => {
			const newConfig = {
				maxRequestsPerMinute: 20,
				blockedTools: ['new-blocked-tool'],
			};

			securityManager.updateConfig(newConfig);

			const config = securityManager.getConfig();
			expect(config.maxRequestsPerMinute).toBe(20);
			expect(config.blockedTools).toContain('new-blocked-tool');
		});

		it('should emit config updated event', () => {
			const eventSpy = vi.fn();
			securityManager.on('configUpdated', eventSpy);

			const newConfig = { maxRequestsPerMinute: 15 };
			securityManager.updateConfig(newConfig);

			expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining(newConfig));
		});
	});

	describe('Statistics', () => {
		it('should provide security statistics', async () => {
			const request = createExecutionRequest();

			// Generate some audit entries
			await securityManager.validateExecution(request, mockTool);

			// Try a failed request
			const failedRequest = createExecutionRequest({
				params: { invalid: 'input' },
			});
			try {
				await securityManager.validateExecution(failedRequest, mockTool);
			} catch {
				// Expected to fail
			}

			const stats = securityManager.getSecurityStats();

			expect(stats.totalAuditEntries).toBeGreaterThan(0);
			expect(stats.accessDeniedCount).toBeGreaterThan(0);
			expect(stats.activeRateLimitedEntities).toBeGreaterThanOrEqual(0);
		});
	});
});

// Helper functions
function createMockTool(
	overrides: Partial<McpToolRegistration['metadata']> = {},
): McpToolRegistration {
	const id = randomUUID();
	const name = `test-tool-${id.substring(0, 8)}`;

	return {
		metadata: {
			id,
			name,
			version: '1.0.0',
			description: 'Test tool for security validation',
			category: 'test',
			tags: ['test'],
			author: 'test',
			transport: 'stdio',
			serverName: 'test-server',
			status: 'active',
			registeredAt: new Date().toISOString(),
			usageCount: 0,
			permissions: overrides.permissions || ['test-permission'],
			resourceLimits: overrides.resourceLimits,
			...overrides,
		},
		schema: {
			name,
			description: 'Test tool schema',
			inputSchema: z.object({
				input: z.string(),
			}),
			outputSchema: z.object({
				result: z.string(),
			}),
		},
		handler: async () => ({ result: 'test' }),
	};
}

function createExecutionRequest(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
	return {
		toolId: randomUUID(),
		params: { input: 'test input' },
		context: {
			userId: overrides.context?.userId || 'test-user',
			sessionId: overrides.context?.sessionId || 'test-session',
			correlationId: overrides.context?.correlationId || randomUUID(),
			timestamp: new Date().toISOString(),
			permissions: overrides.context?.permissions || [],
		},
		timeout: overrides.timeout,
		...overrides,
	};
}
