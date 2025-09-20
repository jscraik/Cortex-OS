/**
 * @fileoverview Tool Security & Validation Layer - Phase 3.5
 * @module ToolSecurityLayer
 * @description Comprehensive tool security validation with input sanitization, authorization, and audit logging
 * @author brAInwav Development Team
 * @version 3.5.0
 * @since 2024-12-09
 */

import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { URL } from 'url';
import { ToolValidationError, ToolValidationErrorCode } from './tool-validation-error';

/**
 * Security context for tool operations
 */
export interface SecurityContext {
	validated: boolean;
	securityLevel: 'low' | 'medium' | 'high' | 'critical';
	permissions: string[];
	auditId: string;
	timestamp: Date;
	userId?: string;
	sessionId?: string;
	correlationId?: string;
}

/**
 * Authorization context
 */
export interface AuthorizationContext {
	userId?: string;
	roles?: string[];
	permissions?: string[];
	capabilities?: string[];
	apiKey?: string;
	sessionId?: string;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
	userId: string;
	requestsRemaining: number;
	resetTime: Date;
	windowSizeMs: number;
	currentRequests: number;
}

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
	windowSizeMs: number;
	maxRequests: number;
	maxRequestsByCritical: number;
	maxRequestsByHigh: number;
	maxRequestsByMedium: number;
	maxRequestsByLow: number;
}

/**
 * User rate limit tracking
 */
interface UserRateLimit {
	requests: { timestamp: number; securityLevel: string }[];
	suspiciousPatterns: string[];
	lastSuspiciousActivity?: number;
}

/**
 * Comprehensive tool security and validation layer
 */
export class ToolSecurityLayer extends EventEmitter {
	private readonly rateLimits = new Map<string, UserRateLimit>();
	private readonly auditLog: any[] = [];
	private readonly suspiciousPatterns = new Set<string>();

	// Security configuration
	private readonly config = {
		maxInputSize: 1024 * 1024, // 1MB
		maxArrayLength: 1000,
		maxObjectDepth: 10,
		maxStringLength: 10000,
		allowedUrlSchemes: ['https', 'http'],
		rateLimitConfig: {
			windowSizeMs: 60000, // 1 minute
			maxRequests: 100,
			maxRequestsByCritical: 2,
			maxRequestsByHigh: 5,
			maxRequestsByMedium: 20,
			maxRequestsByLow: 50,
		} as RateLimitConfig,
		sensitiveFields: new Set([
			'password',
			'passwd',
			'pwd',
			'secret',
			'token',
			'apikey',
			'api_key',
			'creditcard',
			'credit_card',
			'ssn',
			'social_security',
			'private_key',
			'privatekey',
			'auth',
			'authorization',
			'session',
			'cookie',
		]),
	};

	constructor() {
		super();
		this.initializeSuspiciousPatterns();
	}

	/**
	 * Initialize suspicious activity patterns
	 */
	private initializeSuspiciousPatterns(): void {
		const patterns = [
			'list-users',
			'list-permissions',
			'check-admin',
			'dump-database',
			'system-info',
			'enumerate',
			'probe',
			'scan',
			'brute-force',
		];
		for (const pattern of patterns) {
			this.suspiciousPatterns.add(pattern);
		}
	}

	/**
	 * Validate and sanitize tool input
	 */
	async validateInput(
		input: unknown,
		context: { correlationId?: string; userId?: string } = {},
	): Promise<unknown> {
		const startTime = Date.now();
		const inputHash = this.generateInputHash(input);
		const auditId = this.generateAuditId();

		try {
			// Check input size first
			this.validateInputSize(input);

			// Deep validation and sanitization
			const sanitized = await this.deepValidateAndSanitize(input, '', 0);

			// Emit successful validation audit event
			this.emitAuditEvent({
				event: 'input-validated',
				auditId,
				timestamp: new Date(),
				success: true,
				inputHash,
				correlationId: context.correlationId,
				userId: context.userId,
				validationTime: Date.now() - startTime,
			});

			return sanitized;
		} catch (error) {
			// Emit security violation audit event
			this.emitAuditEvent({
				event: 'security-violation',
				auditId,
				timestamp: new Date(),
				violationType: error instanceof ToolValidationError ? error.code : 'UNKNOWN',
				inputHash,
				blocked: true,
				correlationId: context.correlationId,
				userId: context.userId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			throw error;
		}
	}

	/**
	 * Sanitize input by removing dangerous content
	 */
	async sanitizeInput(input: unknown): Promise<unknown> {
		return this.deepSanitize(input, '', 0);
	}

	/**
	 * Deep validation and sanitization
	 */
	private async deepValidateAndSanitize(
		value: unknown,
		path: string,
		depth: number,
	): Promise<unknown> {
		if (depth > this.config.maxObjectDepth) {
			throw ToolValidationError.inputValidationFailed(
				path,
				`Maximum object depth (${this.config.maxObjectDepth}) exceeded`,
			);
		}

		if (value === null || value === undefined) {
			return value;
		}

		// Validate data types
		this.validateDataType(value, path);

		// Check for prototype pollution
		this.checkPrototypePollution(value, path);

		if (typeof value === 'string') {
			return this.validateAndSanitizeString(value, path);
		}

		if (typeof value === 'number' || typeof value === 'boolean') {
			return value;
		}

		if (Array.isArray(value)) {
			if (value.length > this.config.maxArrayLength) {
				throw ToolValidationError.inputValidationFailed(
					path,
					`Array length (${value.length}) exceeds maximum (${this.config.maxArrayLength})`,
				);
			}

			return Promise.all(
				value.map((item, index) =>
					this.deepValidateAndSanitize(item, `${path}[${index}]`, depth + 1),
				),
			);
		}

		if (typeof value === 'object') {
			const result: Record<string, unknown> = {};
			const entries = Object.entries(value as Record<string, unknown>);

			for (const [key, val] of entries) {
				const keyPath = path ? `${path}.${key}` : key;

				// Special validations based on key names
				this.validateSpecialFields(key, val, keyPath);

				result[key] = await this.deepValidateAndSanitize(val, keyPath, depth + 1);
			}

			return result;
		}

		return value;
	}

	/**
	 * Deep sanitization without validation errors
	 */
	private async deepSanitize(value: unknown, path: string, depth: number): Promise<unknown> {
		if (depth > this.config.maxObjectDepth || value === null || value === undefined) {
			return value;
		}

		if (typeof value === 'string') {
			return this.sanitizeString(value);
		}

		if (typeof value === 'number' || typeof value === 'boolean') {
			return value;
		}

		if (Array.isArray(value)) {
			return Promise.all(
				value
					.slice(0, this.config.maxArrayLength)
					.map((item, index) => this.deepSanitize(item, `${path}[${index}]`, depth + 1)),
			);
		}

		if (typeof value === 'object') {
			const result: Record<string, unknown> = {};
			const entries = Object.entries(value as Record<string, unknown>);

			for (const [key, val] of entries) {
				// Skip dangerous prototype properties
				if (this.isDangerousPrototypeProperty(key)) {
					continue;
				}

				const keyPath = path ? `${path}.${key}` : key;
				result[key] = await this.deepSanitize(val, keyPath, depth + 1);
			}

			return result;
		}

		return value;
	}

	/**
	 * Validate input size
	 */
	private validateInputSize(input: unknown): void {
		const size = this.calculateInputSize(input);
		if (size > this.config.maxInputSize) {
			throw new ToolValidationError(
				ToolValidationErrorCode.SIZE_LIMIT_EXCEEDED,
				`Input size (${size} bytes) exceeds maximum allowed (${this.config.maxInputSize} bytes)`,
				[{ reason: 'Input too large', severity: 'medium' }],
			);
		}
	}

	/**
	 * Calculate approximate input size
	 */
	private calculateInputSize(input: unknown): number {
		return JSON.stringify(input).length;
	}

	/**
	 * Validate data types
	 */
	private validateDataType(value: unknown, path: string): void {
		// Reject functions, symbols, and other non-serializable types
		if (typeof value === 'function') {
			throw new ToolValidationError(
				ToolValidationErrorCode.INVALID_DATA_TYPE,
				`Invalid data type at ${path}: functions not allowed`,
				[{ field: path, reason: 'Functions not allowed in input', severity: 'high' }],
			);
		}

		if (typeof value === 'symbol') {
			throw new ToolValidationError(
				ToolValidationErrorCode.INVALID_DATA_TYPE,
				`Invalid data type at ${path}: symbols not allowed`,
				[{ field: path, reason: 'Symbols not allowed in input', severity: 'medium' }],
			);
		}

		if (typeof value === 'bigint') {
			throw new ToolValidationError(
				ToolValidationErrorCode.INVALID_DATA_TYPE,
				`Invalid data type at ${path}: bigint not allowed`,
				[{ field: path, reason: 'BigInt not allowed in input', severity: 'medium' }],
			);
		}

		// Check for Date objects (allow only serialized dates)
		if (value instanceof Date) {
			throw new ToolValidationError(
				ToolValidationErrorCode.INVALID_DATA_TYPE,
				`Invalid data type at ${path}: Date objects not allowed`,
				[
					{
						field: path,
						reason: 'Use ISO date strings instead of Date objects',
						severity: 'medium',
					},
				],
			);
		}
	}

	/**
	 * Check for prototype pollution attempts
	 */
	private checkPrototypePollution(value: unknown, _path: string): void {
		if (typeof value === 'object' && value !== null) {
			const obj = value as Record<string, unknown>;

			// Only check for explicit __proto__ property (most common pollution vector)
			if (Object.hasOwn(obj, '__proto__')) {
				throw ToolValidationError.prototypePollution({
					inputHash: this.generateInputHash(value),
				});
			}

			// Check for explicit constructor property with prototype
			if (
				Object.hasOwn(obj, 'constructor') &&
				obj.constructor &&
				typeof obj.constructor === 'object' &&
				Object.hasOwn(obj.constructor, 'prototype')
			) {
				throw ToolValidationError.prototypePollution({
					inputHash: this.generateInputHash(value),
				});
			}
		}
	}

	/**
	 * Check if property is dangerous for prototype pollution
	 */
	private isDangerousPrototypeProperty(key: string): boolean {
		return key === '__proto__';
	}

	/**
	 * Validate special fields (paths, URLs, etc.)
	 */
	private validateSpecialFields(key: string, value: unknown, path: string): void {
		const lowerKey = key.toLowerCase();

		// Path validation
		if (lowerKey.includes('path') || lowerKey.includes('file') || lowerKey.includes('dir')) {
			if (typeof value === 'string') {
				this.validatePath(value, path);
			}
		}

		// URL validation
		if (lowerKey.includes('url') || lowerKey.includes('uri') || lowerKey.includes('link')) {
			if (typeof value === 'string') {
				this.validateUrl(value, path);
			}
		}

		// SQL injection detection
		if (lowerKey.includes('query') || lowerKey.includes('sql') || lowerKey.includes('filter')) {
			if (typeof value === 'string') {
				this.detectSqlInjection(value, path);
			}
		}

		// Command injection detection
		if (lowerKey.includes('command') || lowerKey.includes('cmd') || lowerKey.includes('exec')) {
			if (typeof value === 'string') {
				this.validateCommand(value, path);
			}
		}
	}

	/**
	 * Validate and sanitize string
	 */
	private validateAndSanitizeString(value: string, path: string): string {
		if (value.length > this.config.maxStringLength) {
			throw ToolValidationError.inputValidationFailed(
				path,
				`String length (${value.length}) exceeds maximum (${this.config.maxStringLength})`,
			);
		}

		return this.sanitizeString(value);
	}

	/**
	 * Sanitize string content
	 */
	private sanitizeString(value: string): string {
		// Remove script tags and dangerous HTML
		let sanitized = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
		sanitized = sanitized.replace(/<[^>]*>/g, ''); // Remove all HTML tags
		sanitized = sanitized.replace(/javascript:/gi, ''); // Remove javascript: URLs
		sanitized = sanitized.replace(/on\w+\s*=/gi, ''); // Remove event handlers

		return sanitized.trim();
	}

	/**
	 * Validate file paths for traversal attacks
	 */
	private validatePath(path: string, fieldPath: string): void {
		if (
			path.includes('..') ||
			path.includes('/etc/') ||
			path.includes('/root/') ||
			path.includes('\\..\\') ||
			path.includes('\\windows\\system32\\')
		) {
			throw ToolValidationError.pathTraversal(path, {
				inputHash: this.generateInputHash({ [fieldPath]: path }),
			});
		}
	}

	/**
	 * Validate URLs for dangerous schemes
	 */
	private validateUrl(url: string, fieldPath: string): void {
		try {
			const parsed = new URL(url);
			if (!this.config.allowedUrlSchemes.includes(parsed.protocol.slice(0, -1))) {
				throw ToolValidationError.invalidUrlScheme(url, this.config.allowedUrlSchemes, {
					inputHash: this.generateInputHash({ [fieldPath]: url }),
				});
			}
		} catch (error) {
			if (error instanceof ToolValidationError) {
				throw error;
			}
			throw ToolValidationError.inputValidationFailed(fieldPath, 'Invalid URL format');
		}
	}

	/**
	 * Detect SQL injection patterns
	 */
	private detectSqlInjection(value: string, fieldPath: string): void {
		const sqlPatterns = [
			/(['"])\s*;\s*drop\s+table/i,
			/(['"])\s*;\s*delete\s+from/i,
			/(['"])\s*;\s*insert\s+into/i,
			/(['"])\s*;\s*update\s+\w+\s+set/i,
			/union\s+select/i,
			/['"].*['"].*=/,
			/'\s*or\s*'\s*1\s*=\s*1/i,
		];

		for (const pattern of sqlPatterns) {
			if (pattern.test(value)) {
				throw ToolValidationError.sqlInjection(fieldPath, {
					inputHash: this.generateInputHash({ [fieldPath]: value }),
				});
			}
		}
	}

	/**
	 * Validate commands for dangerous operations
	 */
	private validateCommand(command: string, fieldPath: string): void {
		const dangerousCommands = [
			'rm',
			'del',
			'format',
			'fdisk',
			'mkfs',
			'dd',
			'shutdown',
			'reboot',
			'passwd',
			'su',
			'sudo',
			'chmod',
			'chown',
			'mount',
			'umount',
		];

		const lowerCommand = command.toLowerCase();
		for (const dangerous of dangerousCommands) {
			if (lowerCommand.includes(dangerous)) {
				throw ToolValidationError.securityViolation(
					'dangerous command detected',
					[
						{
							field: fieldPath,
							reason: `Command contains dangerous operation: ${dangerous}`,
							severity: 'critical',
						},
					],
					{ inputHash: this.generateInputHash({ [fieldPath]: command }) },
				);
			}
		}
	}

	/**
	 * Check authorization for operations
	 */
	async checkAuthorization(
		operation: { operation: string; requiresRole?: string; requiresAuth?: boolean },
		context: AuthorizationContext,
	): Promise<boolean> {
		// Check if authentication is required
		if (operation.requiresAuth && !context.apiKey && !context.userId) {
			throw ToolValidationError.authorizationDenied(operation.operation, 'Authentication required');
		}

		// Check API key validity (mock implementation)
		if (operation.requiresAuth && context.apiKey) {
			if (!this.isValidApiKey(context.apiKey)) {
				throw ToolValidationError.authorizationDenied(operation.operation, 'Invalid credentials');
			}
		}

		// Check role-based access
		if (operation.requiresRole && context.roles) {
			if (!context.roles.includes(operation.requiresRole)) {
				throw ToolValidationError.authorizationDenied(
					operation.operation,
					'Insufficient permissions',
				);
			}
		}

		return true;
	}

	/**
	 * Check resource permissions
	 */
	async checkResourcePermission(
		operation: { operation: string; resource: string },
		context: { userId: string; permissions: string[] },
	): Promise<boolean> {
		const hasPermission = context.permissions.some((permission) => {
			if (permission.endsWith('/*')) {
				const prefix = permission.slice(0, -2);
				return operation.resource.startsWith(prefix);
			}
			return operation.resource === permission;
		});

		if (!hasPermission) {
			throw ToolValidationError.authorizationDenied(operation.operation, 'Resource access denied');
		}

		return true;
	}

	/**
	 * Check capabilities
	 */
	async checkCapabilities(
		operation: { operation: string; requiredCapabilities: string[] },
		context: { capabilities: string[] },
	): Promise<boolean> {
		const missingCapabilities = operation.requiredCapabilities.filter(
			(cap) => !context.capabilities.includes(cap),
		);

		if (missingCapabilities.length > 0) {
			throw new ToolValidationError(
				ToolValidationErrorCode.CAPABILITY_MISSING,
				`Missing capabilities: ${missingCapabilities.join(', ')}`,
				missingCapabilities.map((cap) => ({
					reason: `Missing capability: ${cap}`,
					severity: 'high' as const,
				})),
			);
		}

		return true;
	}

	/**
	 * Check rate limits
	 */
	async checkRateLimit(operation: unknown, context: { userId: string }): Promise<boolean> {
		const now = Date.now();
		const userId = context.userId;

		// Get or create user rate limit tracking
		let userLimit = this.rateLimits.get(userId);
		if (!userLimit) {
			userLimit = { requests: [], suspiciousPatterns: [] };
			this.rateLimits.set(userId, userLimit);
		}

		// Clean old requests outside the window
		const windowStart = now - this.config.rateLimitConfig.windowSizeMs;
		userLimit.requests = userLimit.requests.filter((req) => req.timestamp > windowStart);

		// Determine security level of operation
		const securityLevel = this.determineSecurityLevel(operation);

		// Check if rate limit exceeded based on security level
		const maxRequests = this.getMaxRequestsForSecurityLevel(securityLevel);
		if (userLimit.requests.length >= maxRequests) {
			const resetTime = new Date(
				userLimit.requests[0].timestamp + this.config.rateLimitConfig.windowSizeMs,
			);
			throw ToolValidationError.rateLimitExceeded(userId, resetTime);
		}

		// Check for suspicious activity patterns
		this.checkSuspiciousActivity(operation, userLimit, userId);

		// Record the request
		userLimit.requests.push({
			timestamp: now,
			securityLevel,
		});

		return true;
	}

	/**
	 * Get rate limit status
	 */
	async getRateLimitStatus(context: { userId: string }): Promise<RateLimitStatus> {
		const now = Date.now();
		const userId = context.userId;
		const userLimit = this.rateLimits.get(userId);

		if (!userLimit) {
			return {
				userId,
				requestsRemaining: this.config.rateLimitConfig.maxRequests,
				resetTime: new Date(now + this.config.rateLimitConfig.windowSizeMs),
				windowSizeMs: this.config.rateLimitConfig.windowSizeMs,
				currentRequests: 0,
			};
		}

		// Clean old requests
		const windowStart = now - this.config.rateLimitConfig.windowSizeMs;
		userLimit.requests = userLimit.requests.filter((req) => req.timestamp > windowStart);

		const currentRequests = userLimit.requests.length;
		const requestsRemaining = Math.max(
			0,
			this.config.rateLimitConfig.maxRequests - currentRequests,
		);
		const oldestRequest = userLimit.requests[0];
		const resetTime = oldestRequest
			? new Date(oldestRequest.timestamp + this.config.rateLimitConfig.windowSizeMs)
			: new Date(now + this.config.rateLimitConfig.windowSizeMs);

		return {
			userId,
			requestsRemaining,
			resetTime,
			windowSizeMs: this.config.rateLimitConfig.windowSizeMs,
			currentRequests,
		};
	}

	/**
	 * Create security context
	 */
	async createSecurityContext(
		input: unknown,
		context: { userId?: string; sessionId?: string; correlationId?: string } = {},
	): Promise<SecurityContext> {
		const securityLevel = this.determineSecurityLevel(input);
		const auditId = this.generateAuditId();

		return {
			validated: true,
			securityLevel,
			permissions: [], // Would be populated based on user context in real implementation
			auditId,
			timestamp: new Date(),
			userId: context.userId,
			sessionId: context.sessionId,
			correlationId: context.correlationId,
		};
	}

	/**
	 * Determine security level of operation
	 */
	private determineSecurityLevel(operation: unknown): 'low' | 'medium' | 'high' | 'critical' {
		if (typeof operation === 'object' && operation !== null) {
			const obj = operation as Record<string, unknown>;

			if (obj.securityLevel && typeof obj.securityLevel === 'string') {
				return obj.securityLevel as 'low' | 'medium' | 'high' | 'critical';
			}

			// Infer from operation type
			const operationType = obj.operation as string;
			if (operationType) {
				if (operationType.includes('admin') || operationType.includes('system')) {
					return 'critical';
				}
				if (operationType.includes('delete') || operationType.includes('modify')) {
					return 'high';
				}
				if (operationType.includes('write') || operationType.includes('update')) {
					return 'medium';
				}
			}
		}

		return 'low';
	}

	/**
	 * Get max requests for security level
	 */
	private getMaxRequestsForSecurityLevel(securityLevel: string): number {
		switch (securityLevel) {
			case 'critical':
				return this.config.rateLimitConfig.maxRequestsByCritical;
			case 'high':
				return this.config.rateLimitConfig.maxRequestsByHigh;
			case 'medium':
				return this.config.rateLimitConfig.maxRequestsByMedium;
			case 'low':
				return this.config.rateLimitConfig.maxRequestsByLow;
			default:
				return this.config.rateLimitConfig.maxRequestsByLow; // Default to lowest limit
		}
	}

	/**
	 * Check for suspicious activity patterns
	 */
	private checkSuspiciousActivity(
		operation: unknown,
		userLimit: UserRateLimit,
		userId: string,
	): void {
		if (typeof operation === 'object' && operation !== null) {
			const obj = operation as Record<string, unknown>;
			const operationType = obj.operation as string;

			if (operationType && this.suspiciousPatterns.has(operationType)) {
				userLimit.suspiciousPatterns.push(operationType);

				// If user has performed multiple suspicious operations, block them
				if (userLimit.suspiciousPatterns.length >= 3) {
					throw ToolValidationError.suspiciousActivity(
						`Multiple suspicious operations: ${userLimit.suspiciousPatterns.join(', ')}`,
						{ correlationId: `suspicious-${userId}-${Date.now()}` },
					);
				}
			}
		}
	}

	/**
	 * Validate API key (mock implementation)
	 */
	private isValidApiKey(apiKey: string): boolean {
		// Mock validation - in real implementation, this would check against a database
		return apiKey === 'valid-api-key-123' || apiKey.startsWith('sk-');
	}

	/**
	 * Generate input hash for audit purposes
	 */
	private generateInputHash(input: unknown): string {
		const sanitizedInput = this.sanitizeForHash(input);
		return createHash('sha256').update(JSON.stringify(sanitizedInput)).digest('hex').slice(0, 16);
	}

	/**
	 * Sanitize input for hashing (remove sensitive data)
	 */
	private sanitizeForHash(input: unknown): unknown {
		if (typeof input === 'object' && input !== null) {
			const result: Record<string, unknown> = {};
			const obj = input as Record<string, unknown>;

			for (const [key, value] of Object.entries(obj)) {
				if (this.config.sensitiveFields.has(key.toLowerCase())) {
					result[key] = '[REDACTED]';
				} else {
					result[key] = value;
				}
			}

			return result;
		}

		return input;
	}

	/**
	 * Generate audit ID
	 */
	private generateAuditId(): string {
		return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	}

	/**
	 * Emit audit event
	 */
	private emitAuditEvent(event: Record<string, unknown>): void {
		// Redact sensitive information before logging
		const redactedEvent = this.redactSensitiveInfo(event);

		this.auditLog.push(redactedEvent);
		this.emit('security-audit', redactedEvent);
	}

	/**
	 * Redact sensitive information from audit events
	 */
	private redactSensitiveInfo(event: Record<string, unknown>): Record<string, unknown> {
		const redacted = { ...event };
		const redactedFields: string[] = [];

		// Remove sensitive data but track what was redacted
		for (const [key, value] of Object.entries(redacted)) {
			if (this.config.sensitiveFields.has(key.toLowerCase()) && typeof value === 'string') {
				delete redacted[key];
				redactedFields.push(key);
			}
		}

		if (redactedFields.length > 0) {
			redacted.redactedFields = redactedFields;
		}

		return redacted;
	}
}
