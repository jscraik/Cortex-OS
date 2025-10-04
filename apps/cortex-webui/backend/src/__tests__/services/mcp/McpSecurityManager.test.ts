/**
 * Tests for McpSecurityManager
 */

import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BudgetError, CapabilityTokenError, CapabilityTokenIssuer } from '@cortex-os/security';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { McpSecurityManager } from '../../../services/mcp/McpSecurityManager';
import type { ExecutionRequest } from '../../../services/mcp/McpToolExecutor';
import type { McpToolRegistration } from '../../../services/mcp/McpToolRegistry';

const TEST_CAPABILITY_SECRET = 'unit-test-secret';
const TEST_TENANT = 'unit-test-tenant';
const TEST_BUDGET_PROFILE = 'unit-test-profile';

let testBudgetDir: string;
let budgetFilePath: string;
let capabilityIssuer: CapabilityTokenIssuer;
let defaultCapabilityToken: string;

describe('McpSecurityManager', () => {
	let securityManager: McpSecurityManager;
	let mockTool: McpToolRegistration;

	beforeEach(() => {
		testBudgetDir = mkdtempSync(path.join(tmpdir(), 'mcp-security-'));
		budgetFilePath = path.join(testBudgetDir, 'budget.yml');
		writeFileSync(
			budgetFilePath,
			`budgets:\n  ${TEST_BUDGET_PROFILE}:\n    max_total_req: 100\n    max_total_duration_ms: 600000\n`,
		);

		securityManager = new McpSecurityManager({
			maxRequestsPerMinute: 5,
			maxRequestsPerHour: 10,
			enableRateLimiting: true,
			enableInputValidation: true,
			enablePermissionCheck: true,
			enableResourceLimits: true,
			enableAuditLogging: true,
			capabilitySecret: TEST_CAPABILITY_SECRET,
			budgetFilePath,
			budgetProfile: TEST_BUDGET_PROFILE,
		});

		capabilityIssuer = new CapabilityTokenIssuer(TEST_CAPABILITY_SECRET);
		mockTool = createMockTool();
		defaultCapabilityToken = issueCapabilityToken(mockTool);
	});

	afterEach(() => {
		securityManager.clearRateLimits();
		rmSync(testBudgetDir, { recursive: true, force: true });
		vi.useRealTimers();
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

	describe('Capability Tokens and Budgets', () => {
		it('should require a capability token', async () => {
			const request = createExecutionRequest({
				context: { capabilityTokens: [] },
			});

			await expect(securityManager.validateExecution(request, mockTool)).rejects.toThrow(
				CapabilityTokenError,
			);
		});

		it('should reject expired capability tokens', async () => {
			const baseTime = new Date('2025-01-01T00:00:00Z');
			vi.useFakeTimers();
			vi.setSystemTime(baseTime);

			const expiredToken = issueCapabilityToken(mockTool, { ttlSeconds: 1 });
			vi.setSystemTime(new Date(baseTime.getTime() + 120_000));

			const request = createExecutionRequest({
				context: { capabilityTokens: [expiredToken] },
			});

			await expect(securityManager.validateExecution(request, mockTool)).rejects.toThrow(
				CapabilityTokenError,
			);
		});

		it('should allow execution with valid capability token', async () => {
			const request = createExecutionRequest();
			await expect(securityManager.validateExecution(request, mockTool)).resolves.not.toThrow();
		});

		it('should enforce budget limits', async () => {
			const tightDir = mkdtempSync(path.join(tmpdir(), 'mcp-budget-tight-'));
			const tightBudgetFile = path.join(tightDir, 'budget.yml');
			writeFileSync(
				tightBudgetFile,
				`budgets:\n  tight:\n    max_total_req: 1\n`,
			);

			const tightManager = new McpSecurityManager({
				maxRequestsPerMinute: 5,
				maxRequestsPerHour: 10,
				enableRateLimiting: true,
				enableInputValidation: true,
				enablePermissionCheck: true,
				enableResourceLimits: true,
				enableAuditLogging: true,
				capabilitySecret: TEST_CAPABILITY_SECRET,
				budgetFilePath: tightBudgetFile,
				budgetProfile: 'tight',
			});
			const tightToken = issueCapabilityToken(mockTool, { budgetProfile: 'tight' });
			const request = createExecutionRequest({
				context: { capabilityTokens: [tightToken], budgetProfile: 'tight' },
			});

			try {
				await tightManager.validateExecution(request, mockTool);
				await expect(tightManager.validateExecution(request, mockTool)).rejects.toThrow(BudgetError);
			} finally {
				tightManager.clearRateLimits();
				rmSync(tightDir, { recursive: true, force: true });
			}
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
			const token = issueCapabilityToken(toolWithPermissions);
			const request = createExecutionRequest({
				toolId: toolWithPermissions.metadata.id,
				context: {
					permissions: ['read', 'write', 'admin'],
					capabilityTokens: [token],
				},
			});

			await expect(
				securityManager.validateExecution(request, toolWithPermissions),
			).resolves.not.toThrow();
		});

		it('should deny access without required permissions', async () => {
			const toolWithPermissions = createMockTool({
				permissions: ['admin', 'write'],
			});
			const token = issueCapabilityToken(toolWithPermissions);
			const request = createExecutionRequest({
				toolId: toolWithPermissions.metadata.id,
				context: { permissions: ['read'], capabilityTokens: [token] },
			});

			await expect(securityManager.validateExecution(request, toolWithPermissions)).rejects.toThrow(
				/Insufficient permissions/,
			);
		});

		it('should allow admin users access to any tool', async () => {
			const toolWithPermissions = createMockTool({
				permissions: ['super-secret'],
			});
			const token = issueCapabilityToken(toolWithPermissions);
			const request = createExecutionRequest({
				toolId: toolWithPermissions.metadata.id,
				context: { permissions: ['admin'], capabilityTokens: [token] },
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
			const token = issueCapabilityToken(toolWithPermissions);
			const request = createExecutionRequest({
				toolId: toolWithPermissions.metadata.id,
				context: { permissions: [], capabilityTokens: [token] },
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
			const token = issueCapabilityToken(toolWithLimits);
			const request = createExecutionRequest({
				timeout: 10000, // Exceeds tool limit
				toolId: toolWithLimits.metadata.id,
				context: { capabilityTokens: [token] },
			});

			await expect(securityManager.validateExecution(request, toolWithLimits)).rejects.toThrow(
				/Requested timeout .* exceeds tool limit/,
			);
		});

		it('should allow requests within limits', async () => {
			const toolWithLimits = createMockTool({
				resourceLimits: { maxExecutionTime: 10000 },
			});
			const token = issueCapabilityToken(toolWithLimits);
			const request = createExecutionRequest({
				timeout: 5000, // Within tool limit
				toolId: toolWithLimits.metadata.id,
				context: { capabilityTokens: [token] },
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
			const token = issueCapabilityToken(toolWithLimits);
			const request = createExecutionRequest({
				timeout: 10000, // Exceeds tool limit
				toolId: toolWithLimits.metadata.id,
				context: { capabilityTokens: [token] },
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

function issueCapabilityToken(
	tool: McpToolRegistration,
	options: { tenant?: string; ttlSeconds?: number; budgetProfile?: string } = {},
): string {
	const tenant = options.tenant ?? TEST_TENANT;
	const budgetProfile = options.budgetProfile ?? TEST_BUDGET_PROFILE;
	return capabilityIssuer.issue({
		tenant,
		action: `tool.execute.${tool.metadata.name}`,
		resourcePrefix: `mcp/tools/${tool.metadata.id}`,
		budgetProfile,
		ttlSeconds: options.ttlSeconds ?? 300,
	}).token;
}

function createExecutionRequest(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
	const contextOverrides = overrides.context ?? {};
	const capabilityTokens =
		contextOverrides.capabilityTokens ?? [defaultCapabilityToken];
	const tenant = contextOverrides.tenant ?? TEST_TENANT;
	return {
		toolId: overrides.toolId ?? mockTool.metadata.id,
		params: overrides.params ?? { input: 'test input' },
		context: {
			userId: contextOverrides.userId ?? 'test-user',
			sessionId: contextOverrides.sessionId ?? 'test-session',
			correlationId: contextOverrides.correlationId ?? randomUUID(),
			timestamp: contextOverrides.timestamp ?? new Date().toISOString(),
			permissions: contextOverrides.permissions ?? [],
			tenant,
			capabilityTokens,
			budgetProfile: contextOverrides.budgetProfile ?? TEST_BUDGET_PROFILE,
			requestCost: contextOverrides.requestCost,
			requestDurationMs: contextOverrides.requestDurationMs,
		},
		timeout: overrides.timeout,
	};
}
