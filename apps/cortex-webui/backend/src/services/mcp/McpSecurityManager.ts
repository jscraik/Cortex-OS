/**
 * MCP Tool Security Manager for cortex-webui
 *
 * Provides comprehensive security validation including permission checking,
 * input validation, resource limits, rate limiting, and audit logging.
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { z } from 'zod';
import logger from '../utils/logger.js';
import type { ExecutionRequest } from './McpToolExecutor.js';
import type { ExecutionContext, McpToolRegistration } from './McpToolRegistry.js';

// Security configuration
export interface SecurityConfig {
	enableRateLimiting: boolean;
	enableInputValidation: boolean;
	enablePermissionCheck: boolean;
	enableResourceLimits: boolean;
	enableAuditLogging: boolean;
	maxRequestsPerMinute: number;
	maxRequestsPerHour: number;
	maxPayloadSize: number; // bytes
	allowedOrigins: string[];
	blockedTools: string[];
	adminRoles: string[];
	defaultTimeout: number; // ms
}

// Permission levels
export enum PermissionLevel {
	READ = 'read',
	WRITE = 'write',
	EXECUTE = 'execute',
	ADMIN = 'admin',
}

// Rate limiting data structure
interface RateLimitEntry {
	count: number;
	windowStart: number;
	lastReset: number;
}

// Audit log entry
export interface AuditLogEntry {
	id: string;
	timestamp: string;
	toolId: string;
	userId?: string;
	sessionId?: string;
	action: 'access_attempt' | 'access_granted' | 'access_denied' | 'execution' | 'error';
	details: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
	correlationId: string;
}

// Security validation schemas
const securityConfigSchema = z.object({
	enableRateLimiting: z.boolean().default(true),
	enableInputValidation: z.boolean().default(true),
	enablePermissionCheck: z.boolean().default(true),
	enableResourceLimits: z.boolean().default(true),
	enableAuditLogging: z.boolean().default(true),
	maxRequestsPerMinute: z.number().int().min(1).max(10000).default(60),
	maxRequestsPerHour: z.number().int().min(1).max(100000).default(1000),
	maxPayloadSize: z
		.number()
		.int()
		.min(1024)
		.max(1024 * 1024 * 10)
		.default(1024 * 1024),
	allowedOrigins: z.array(z.string().url()).default([]),
	blockedTools: z.array(z.string()).default([]),
	adminRoles: z.array(z.string()).default(['admin', 'superadmin']),
	defaultTimeout: z.number().int().min(1000).max(300000).default(30000),
});

export class McpSecurityManager extends EventEmitter {
	private config: SecurityConfig;
	private rateLimitMap = new Map<string, RateLimitEntry>();
	private auditLog: AuditLogEntry[] = [];
	private readonly MAX_AUDIT_ENTRIES = 10000;

	constructor(config: Partial<SecurityConfig> = {}) {
		super();
		this.config = securityConfigSchema.parse(config);
	}

	/**
	 * Validate execution request for security compliance
	 */
	public async validateExecution(
		request: ExecutionRequest,
		tool: McpToolRegistration,
	): Promise<void> {
		const startTime = Date.now();

		try {
			// Log access attempt
			await this.logAccess('access_attempt', request, tool, {});

			// Check if tool is blocked
			if (this.config.blockedTools.includes(tool.metadata.name)) {
				throw new Error('Tool is blocked by security policy');
			}

			// Rate limiting check
			if (this.config.enableRateLimiting) {
				await this.checkRateLimit(request.context);
			}

			// Permission check
			if (this.config.enablePermissionCheck) {
				await this.checkPermissions(request.context, tool);
			}

			// Input validation
			if (this.config.enableInputValidation) {
				await this.validateInput(request.params, tool);
			}

			// Resource limits check
			if (this.config.enableResourceLimits) {
				await this.checkResourceLimits(request, tool);
			}

			// Log successful access
			await this.logAccess('access_granted', request, tool, {
				validationTime: Date.now() - startTime,
			});
		} catch (error) {
			// Log denied access
			await this.logAccess('access_denied', request, tool, {
				reason: error instanceof Error ? error.message : 'Unknown security violation',
				validationTime: Date.now() - startTime,
			});
			throw error;
		}
	}

	/**
	 * Check rate limits
	 */
	private async checkRateLimit(context: ExecutionContext): Promise<void> {
		const key = this.getRateLimitKey(context);
		const now = Date.now();

		let entry = this.rateLimitMap.get(key);
		if (!entry) {
			entry = { count: 0, windowStart: now, lastReset: now };
			this.rateLimitMap.set(key, entry);
		}

		// Check minute window
		const minuteWindow = 60 * 1000;
		if (now - entry.windowStart > minuteWindow) {
			entry.count = 0;
			entry.windowStart = now;
		}

		entry.count++;

		if (entry.count > this.config.maxRequestsPerMinute) {
			throw new Error(
				`Rate limit exceeded: ${entry.count}/${this.config.maxRequestsPerMinute} per minute`,
			);
		}

		// Check hourly limit
		const hourlyWindow = 60 * 60 * 1000;
		if (now - entry.lastReset > hourlyWindow) {
			entry.count = 1; // Reset count but allow current request
			entry.lastReset = now;
		} else if (entry.count > this.config.maxRequestsPerHour) {
			throw new Error(
				`Hourly rate limit exceeded: ${entry.count}/${this.config.maxRequestsPerHour} per hour`,
			);
		}
	}

	/**
	 * Check user permissions
	 */
	private async checkPermissions(
		context: ExecutionContext,
		tool: McpToolRegistration,
	): Promise<void> {
		const userPermissions = context.permissions || [];
		const requiredPermissions = tool.metadata.permissions || [];

		// Admin users have access to everything
		if (this.hasAdminRole(userPermissions)) {
			return;
		}

		// Check if user has required permissions
		const hasRequiredPermissions = requiredPermissions.every((permission) =>
			userPermissions.includes(permission),
		);

		if (!hasRequiredPermissions && requiredPermissions.length > 0) {
			throw new Error(
				`Insufficient permissions. Required: ${requiredPermissions.join(', ')}, User has: ${userPermissions.join(', ')}`,
			);
		}
	}

	/**
	 * Validate input parameters
	 */
	private async validateInput(params: unknown, tool: McpToolRegistration): Promise<void> {
		// Check payload size
		const payloadSize = JSON.stringify(params).length;
		if (payloadSize > this.config.maxPayloadSize) {
			throw new Error(
				`Payload too large: ${payloadSize} bytes, max allowed: ${this.config.maxPayloadSize} bytes`,
			);
		}

		// Validate against tool schema
		try {
			tool.schema.inputSchema.parse(params);
		} catch (error) {
			throw new Error(
				`Input validation failed: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
			);
		}

		// Additional security checks
		await this.performSecurityScans(params);
	}

	/**
	 * Perform security scans on input data
	 */
	private async performSecurityScans(params: unknown): Promise<void> {
		const paramsStr = JSON.stringify(params).toLowerCase();

		// Check for common injection patterns
		const dangerousPatterns = [
			/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
			/javascript:/gi, // JavaScript protocol
			/on\w+\s*=/gi, // Event handlers
			/import\s+.*from/gi, // Import statements
			/eval\s*\(/gi, // eval usage
			/function\s*\(/gi, // Function definitions
		];

		for (const pattern of dangerousPatterns) {
			if (pattern.test(paramsStr)) {
				throw new Error('Potentially dangerous content detected in input');
			}
		}

		// Check for file path traversal attempts
		const pathTraversalPatterns = [/\.\.\//g, /\.\.\\/g, /\//g, /\\/g];
		const paramsObj = params as Record<string, unknown>;

		const checkPathTraversal = (obj: unknown): boolean => {
			if (typeof obj === 'string') {
				return pathTraversalPatterns.some((pattern) => pattern.test(obj));
			}
			if (Array.isArray(obj)) {
				return obj.some(checkPathTraversal);
			}
			if (obj && typeof obj === 'object') {
				return Object.values(obj).some(checkPathTraversal);
			}
			return false;
		};

		if (checkPathTraversal(paramsObj)) {
			throw new Error('Path traversal attempt detected in input');
		}
	}

	/**
	 * Check resource limits
	 */
	private async checkResourceLimits(
		request: ExecutionRequest,
		tool: McpToolRegistration,
	): Promise<void> {
		const limits = tool.metadata.resourceLimits;

		if (!limits) {
			return; // No specific limits for this tool
		}

		// Check timeout
		const requestedTimeout = request.timeout || this.config.defaultTimeout;
		if (requestedTimeout > limits.maxExecutionTime) {
			throw new Error(
				`Requested timeout ${requestedTimeout}ms exceeds tool limit ${limits.maxExecutionTime}ms`,
			);
		}
	}

	/**
	 * Log security events
	 */
	private async logAccess(
		action: AuditLogEntry['action'],
		request: ExecutionRequest,
		tool: McpToolRegistration,
		details: Record<string, unknown>,
	): Promise<void> {
		if (!this.config.enableAuditLogging) {
			return;
		}

		const entry: AuditLogEntry = {
			id: randomUUID(),
			timestamp: new Date().toISOString(),
			toolId: tool.metadata.id,
			userId: request.context.userId,
			sessionId: request.context.sessionId,
			action,
			details: {
				toolName: tool.metadata.name,
				toolCategory: tool.metadata.category,
				userPermissions: request.context.permissions,
				...details,
			},
			correlationId: request.context.correlationId,
		};

		this.auditLog.push(entry);

		// Maintain audit log size
		if (this.auditLog.length > this.MAX_AUDIT_ENTRIES) {
			this.auditLog = this.auditLog.slice(-this.MAX_AUDIT_ENTRIES);
		}

		// Emit audit event
		this.emit('auditLog', entry);

		// Log important events
		if (action === 'access_denied') {
			logger.warn('brAInwav MCP security access denied', {
				toolId: tool.metadata.id,
				toolName: tool.metadata.name,
				userId: request.context.userId,
				reason: details.reason,
				correlationId: request.context.correlationId,
			});
		}
	}

	/**
	 * Get rate limit key for context
	 */
	private getRateLimitKey(context: ExecutionContext): string {
		if (context.userId) {
			return `user:${context.userId}`;
		}
		if (context.sessionId) {
			return `session:${context.sessionId}`;
		}
		return `anonymous:${context.correlationId}`;
	}

	/**
	 * Check if user has admin role
	 */
	private hasAdminRole(userPermissions: string[]): boolean {
		return this.config.adminRoles.some((role) => userPermissions.includes(role));
	}

	/**
	 * Get audit log entries
	 */
	public getAuditLog(
		options: {
			toolId?: string;
			userId?: string;
			action?: AuditLogEntry['action'];
			limit?: number;
			offset?: number;
			startDate?: string;
			endDate?: string;
		} = {},
	): AuditLogEntry[] {
		let entries = [...this.auditLog];

		// Apply filters
		if (options.toolId) {
			entries = entries.filter((entry) => entry.toolId === options.toolId);
		}
		if (options.userId) {
			entries = entries.filter((entry) => entry.userId === options.userId);
		}
		if (options.action) {
			entries = entries.filter((entry) => entry.action === options.action);
		}
		if (options.startDate) {
			const startDate = new Date(options.startDate);
			entries = entries.filter((entry) => new Date(entry.timestamp) >= startDate);
		}
		if (options.endDate) {
			const endDate = new Date(options.endDate);
			entries = entries.filter((entry) => new Date(entry.timestamp) <= endDate);
		}

		// Sort by timestamp (newest first)
		entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

		// Apply pagination
		const limit = options.limit || 100;
		const offset = options.offset || 0;
		return entries.slice(offset, offset + limit);
	}

	/**
	 * Get security statistics
	 */
	public getSecurityStats(): {
		totalAuditEntries: number;
		accessDeniedCount: number;
		mostAccessedTools: Array<{ toolId: string; count: number }>;
		rateLimitViolations: number;
		activeRateLimitedEntities: number;
	} {
		const accessDeniedCount = this.auditLog.filter(
			(entry) => entry.action === 'access_denied',
		).length;

		const toolAccessCounts = new Map<string, number>();
		this.auditLog.forEach((entry) => {
			if (entry.action === 'access_granted') {
				const count = toolAccessCounts.get(entry.toolId) || 0;
				toolAccessCounts.set(entry.toolId, count + 1);
			}
		});

		const mostAccessedTools = Array.from(toolAccessCounts.entries())
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([toolId, count]) => ({ toolId, count }));

		return {
			totalAuditEntries: this.auditLog.length,
			accessDeniedCount,
			mostAccessedTools,
			rateLimitViolations: accessDeniedCount, // Simplified for now
			activeRateLimitedEntities: this.rateLimitMap.size,
		};
	}

	/**
	 * Clear rate limits (for admin use)
	 */
	public clearRateLimits(userId?: string): void {
		if (userId) {
			const keysToDelete = Array.from(this.rateLimitMap.keys()).filter((key) =>
				key.startsWith(`user:${userId}`),
			);
			keysToDelete.forEach((key) => {
				this.rateLimitMap.delete(key);
			});
		} else {
			this.rateLimitMap.clear();
		}
	}

	/**
	 * Update security configuration
	 */
	public updateConfig(newConfig: Partial<SecurityConfig>): void {
		this.config = securityConfigSchema.parse({ ...this.config, ...newConfig });
		this.emit('configUpdated', this.config);
		logger.info('brAInwav MCP security configuration updated', { config: this.config });
	}

	/**
	 * Get current configuration
	 */
	public getConfig(): SecurityConfig {
		return { ...this.config };
	}
}
