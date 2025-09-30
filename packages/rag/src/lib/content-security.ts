/**
 * Content Security Policy and XSS/injection protection for RAG stored content.
 *
 * This module provides comprehensive protection against XSS attacks, script injection,
 * and other content-based security vulnerabilities in stored RAG content.
 */

import { z } from 'zod';

// Type definitions
export type SecurityLevel = 'low' | 'medium' | 'high';

// Content Security Policy configuration
export interface ContentSecurityConfig {
	// XSS protection settings
	xss: {
		enabled: boolean;
		stripScripts: boolean;
		stripStyles: boolean;
		stripEventHandlers: boolean;
		allowedTags: string[];
		allowedAttributes: string[];
	};

	// Content filtering settings
	content: {
		maxLength: number;
		blockSuspiciousPatterns: boolean;
		sanitizeUrls: boolean;
		allowDataUrls: boolean;
	};

	// Storage security settings
	storage: {
		encryptSensitive: boolean;
		preventPrototypePollution: boolean;
		validateJsonStructure: boolean;
	};
}

// Default secure configuration
export const DEFAULT_CONTENT_SECURITY_CONFIG: ContentSecurityConfig = {
	xss: {
		enabled: true,
		stripScripts: true,
		stripStyles: true,
		stripEventHandlers: true,
		allowedTags: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'],
		allowedAttributes: ['id', 'class', 'title'],
	},
	content: {
		maxLength: 100000,
		blockSuspiciousPatterns: true,
		sanitizeUrls: true,
		allowDataUrls: false,
	},
	storage: {
		encryptSensitive: true,
		preventPrototypePollution: true,
		validateJsonStructure: true,
	},
};

// Suspicious patterns that indicate potential attacks - fixed for ReDoS safety
const SUSPICIOUS_PATTERNS = [
	// Remaining dangerous patterns after sanitization
	/(?:eval|exec|system|shell_exec|passthru)\s*\(/gi,

	// Command injection patterns - made more specific to avoid ReDoS
	/[|&;](?=\s*[a-zA-Z_])/g, // Only match when followed by potential command
	/\$\([^)]{0,100}\)/g, // Limit length to prevent backtracking
	/`[^`]{0,100}`/g, // Limit length to prevent backtracking

	// Path traversal patterns
	/\.\.[\\/]/g,

	// Template injection patterns - length limited to prevent ReDoS
	/\{\{[^}]{0,50}\}\}/g,
	/\$\{[^}]{0,50}\}/g,

	// SQL injection (more conservative, post-sanitization)
	/\bunion\b[\s\w]{0,20}\bselect\b/gi,
	/\bselect\b[\s\w]{0,20}\bunion\b/gi,
	/'[^']{0,30}'[^']{0,30}OR[^']{0,30}'[^']{0,30}'/gi,
	/';[^;]{0,50}drop[^;]{0,50}table/gi,

	// Protocol handlers that might have escaped sanitization
	/(?:file|ftp):\/\//gi,

	// Specific JavaScript function calls that indicate XSS
	/alert\s*\(/gi,
];

// HTML event handlers to strip
const EVENT_HANDLERS = [
	'onabort',
	'onblur',
	'onchange',
	'onclick',
	'ondblclick',
	'onerror',
	'onfocus',
	'onkeydown',
	'onkeypress',
	'onkeyup',
	'onload',
	'onmousedown',
	'onmousemove',
	'onmouseout',
	'onmouseover',
	'onmouseup',
	'onreset',
	'onresize',
	'onselect',
	'onsubmit',
	'onunload',
];

export class ContentSecurityError extends Error {
	constructor(
		public readonly reason: string,
		public readonly details: string[] = [],
		public readonly securityLevel: SecurityLevel = 'medium',
	) {
		super(`Content security violation: ${reason}`);
		this.name = 'ContentSecurityError';
	}
}

export class ContentSecurityPolicy {
	private readonly config: ContentSecurityConfig;

	constructor(config: Partial<ContentSecurityConfig> = {}) {
		this.config = this.mergeConfig(DEFAULT_CONTENT_SECURITY_CONFIG, config);
	}

	private mergeConfig(
		defaults: ContentSecurityConfig,
		override: Partial<ContentSecurityConfig>,
	): ContentSecurityConfig {
		return {
			xss: { ...defaults.xss, ...override.xss },
			content: { ...defaults.content, ...override.content },
			storage: { ...defaults.storage, ...override.storage },
		};
	}

	/**
	 * Sanitize text content for safe storage and retrieval
	 */
	sanitizeText(content: string): string {
		if (!content || typeof content !== 'string') {
			return '';
		}

		let sanitized = content;

		// Length check
		if (sanitized.length > this.config.content.maxLength) {
			throw new ContentSecurityError(
				'Content exceeds maximum length',
				[`Length: ${sanitized.length}, Max: ${this.config.content.maxLength}`],
				'low',
			);
		}

		// XSS protection - sanitize first
		if (this.config.xss.enabled) {
			sanitized = this.stripXssVectors(sanitized);
		}

		// URL sanitization
		if (this.config.content.sanitizeUrls) {
			sanitized = this.sanitizeUrls(sanitized);
		}

		// Check for suspicious patterns after sanitization
		if (this.config.content.blockSuspiciousPatterns) {
			for (const pattern of SUSPICIOUS_PATTERNS) {
				if (pattern.test(sanitized)) {
					throw new ContentSecurityError(
						'Suspicious pattern detected in content',
						[`Pattern: ${pattern.source}`],
						'high',
					);
				}
			}
		}

		return sanitized.trim();
	}

	/**
	 * Strip XSS vectors from content
	 */
	private stripXssVectors(content: string): string {
		let sanitized = content;

		// Strip script tags
		if (this.config.xss.stripScripts) {
			sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
		}

		// Strip style tags
		if (this.config.xss.stripStyles) {
			sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
		}

		// Strip event handlers - comprehensive approach
		if (this.config.xss.stripEventHandlers) {
			// Remove all on* attributes in various formats - ReDoS safe
			sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']{0,100}["']/gi, '');
			sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^>\s]{1,50}/gi, '');
			// Also handle specific cases
			for (const handler of EVENT_HANDLERS) {
				const regex = new RegExp(`\\s*${handler}\\s*=\\s*["'][^"']{0,100}["']`, 'gi');
				sanitized = sanitized.replace(regex, '');
			}
		}

		// Remove dangerous protocols
		sanitized = sanitized.replace(/javascript:\s*/gi, '');
		sanitized = sanitized.replace(/vbscript:\s*/gi, '');

		// Handle data URLs based on config
		if (!this.config.content.allowDataUrls) {
			sanitized = sanitized.replace(/data:\s*[^;]{1,50};base64[^"'>\s]{0,200}/gi, '');
		}

		// Remove eval and related functions
		sanitized = sanitized.replace(/\b(eval|Function|setTimeout|setInterval)\s*\(/gi, '');

		// Remove potentially dangerous HTML tags
		const dangerousTags = [
			'iframe',
			'object',
			'embed',
			'form',
			'input',
			'textarea',
			'button',
			'select',
		];
		for (const tag of dangerousTags) {
			const regex = new RegExp(`<${tag}\\b[^>]*>.*?<\\/${tag}>`, 'gi');
			sanitized = sanitized.replace(regex, '');
			// Also remove self-closing tags
			const selfClosing = new RegExp(`<${tag}\\b[^>]*\\/>`, 'gi');
			sanitized = sanitized.replace(selfClosing, '');
		}

		// Remove HTML comments that could hide malicious content
		sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');

		return sanitized;
	}

	/**
	 * Sanitize URLs in content
	 */
	private sanitizeUrls(content: string): string {
		// Replace suspicious URL patterns
		return content.replace(/(https?:\/\/[^\s<>"']+)/gi, (match) => {
			// Basic URL validation
			try {
				const url = new URL(match);
				// Block suspicious protocols - safely check without eval risk
				const protocol = url.protocol.toLowerCase();
				if (protocol === 'javascript:' || protocol === 'vbscript:' ||
					protocol === 'data:' || protocol === 'file:') {
					return '[BLOCKED_URL]';
				}
				return match;
			} catch {
				return '[INVALID_URL]';
			}
		});
	}

	/**
	 * Sanitize metadata objects for safe storage
	 */
	sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
		if (!metadata || typeof metadata !== 'object') {
			return {};
		}

		if (this.config.storage.preventPrototypePollution) {
			this.checkPrototypePollution(metadata);
		}

		const sanitized: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(metadata)) {
			// Skip dangerous keys
			if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
				continue;
			}

			sanitized[this.sanitizeKey(key)] = this.sanitizeValue(value);
		}

		return sanitized;
	}

	private checkPrototypePollution(obj: unknown): void {
		if (typeof obj !== 'object' || obj === null) {
			return;
		}

		const proto = Object.getPrototypeOf(obj);
		if (proto !== Object.prototype && proto !== Array.prototype) {
			throw new ContentSecurityError(
				'Prototype pollution detected',
				['Object has non-standard prototype'],
				'high',
			);
		}

		// Check for pollution attempts
		if ('__proto__' in obj || 'constructor' in obj || 'prototype' in obj) {
			const keys = Object.keys(obj as Record<string, unknown>);
			for (const key of ['__proto__', 'constructor', 'prototype']) {
				if (keys.includes(key)) {
					throw new ContentSecurityError(
						'Prototype pollution attempt detected',
						[`Dangerous key found: ${key}`],
						'high',
					);
				}
			}
		}
	}

	private sanitizeKey(key: string): string {
		// Remove any non-alphanumeric characters except underscore and dash
		return key.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
	}

	private sanitizeValue(value: unknown): unknown {
		if (value === null || value === undefined) {
			return value;
		}

		if (typeof value === 'string') {
			return this.sanitizeText(value);
		}

		if (typeof value === 'number' || typeof value === 'boolean') {
			return value;
		}

		if (Array.isArray(value)) {
			return value.slice(0, 100).map((item) => this.sanitizeValue(item));
		}

		if (typeof value === 'object') {
			return this.sanitizeMetadata(value as Record<string, unknown>);
		}

		// Remove unsupported types
		return null;
	}

	/**
	 * Validate that content is safe for storage
	 */
	validateContent(content: string): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		try {
			this.sanitizeText(content);
			return { isValid: true, errors: [] };
		} catch (error) {
			if (error instanceof ContentSecurityError) {
				errors.push(error.reason);
				errors.push(...error.details);
			} else {
				errors.push('Unknown validation error');
			}
			return { isValid: false, errors };
		}
	}

	/**
	 * Create a security report for content
	 */
	createSecurityReport(content: string): {
		contentLength: number;
		suspiciousPatterns: string[];
		xssVectors: string[];
		urlCount: number;
		riskLevel: 'low' | 'medium' | 'high';
	} {
		const suspiciousPatterns: string[] = [];
		const xssVectors: string[] = [];

		// Check for suspicious patterns
		for (const pattern of SUSPICIOUS_PATTERNS) {
			if (pattern.test(content)) {
				suspiciousPatterns.push(pattern.source);
			}
		}

		// Check for XSS vectors - more comprehensive
		if (/<script\b/gi.test(content)) xssVectors.push('script tags');
		if (/<\/script>/gi.test(content)) xssVectors.push('script tags');
		if (/javascript:\s*/gi.test(content)) xssVectors.push('javascript protocol');
		if (/vbscript:\s*/gi.test(content)) xssVectors.push('vbscript protocol');
		if (/on\w+\s*=/gi.test(content)) xssVectors.push('event handlers');
		if (/<style\b/gi.test(content)) xssVectors.push('style tags');
		if (/<iframe\b/gi.test(content)) xssVectors.push('iframe tags');
		if (/<object\b/gi.test(content)) xssVectors.push('object tags');
		if (/eval\s*\(/gi.test(content)) xssVectors.push('eval calls');

		// Count URLs
		const urlMatches = content.match(/https?:\/\/[^\s<>"']+/gi) || [];

		// Determine risk level - more sensitive
		let riskLevel: 'low' | 'medium' | 'high' = 'low';
		if (suspiciousPatterns.length > 0 || xssVectors.length >= 2) {
			riskLevel = 'high';
		} else if (xssVectors.length > 0 || urlMatches.length > 10) {
			riskLevel = 'medium';
		}

		return {
			contentLength: content.length,
			suspiciousPatterns,
			xssVectors,
			urlCount: urlMatches.length,
			riskLevel,
		};
	}
}

// Content security policy schema for validation
export const contentSecurityConfigSchema = z.object({
	xss: z.object({
		enabled: z.boolean(),
		stripScripts: z.boolean(),
		stripStyles: z.boolean(),
		stripEventHandlers: z.boolean(),
		allowedTags: z.array(z.string().max(50)).max(100),
		allowedAttributes: z.array(z.string().max(50)).max(100),
	}),
	content: z.object({
		maxLength: z.number().int().positive().max(1000000),
		blockSuspiciousPatterns: z.boolean(),
		sanitizeUrls: z.boolean(),
		allowDataUrls: z.boolean(),
	}),
	storage: z.object({
		encryptSensitive: z.boolean(),
		preventPrototypePollution: z.boolean(),
		validateJsonStructure: z.boolean(),
	}),
});

/**
 * Create a content security policy with validation
 */
export function createContentSecurityPolicy(
	config?: Partial<ContentSecurityConfig>,
): ContentSecurityPolicy {
	if (config) {
		// Validate partial config
		const result = contentSecurityConfigSchema.partial().safeParse(config);
		if (!result.success) {
			throw new Error(
				`Invalid content security configuration: ${result.error.issues.map((i) => i.message).join(', ')}`,
			);
		}
	}

	return new ContentSecurityPolicy(config);
}

/**
 * Default content security policy instance
 */
export const defaultContentSecurity = new ContentSecurityPolicy();
