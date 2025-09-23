/**
 * Security Module Tests
 * Following TDD plan requirements for input sanitization and log redaction
 */

import { describe, expect, it } from 'vitest';
import {
	createSecurityMiddleware,
	DEFAULT_SANITIZATION_CONFIG,
	InputSanitizer,
	LogRedactor,
	SecuritySchemas,
} from '../../src/lib/security.js';

describe('Input Sanitization', () => {
	let sanitizer: InputSanitizer;

	beforeEach(() => {
		sanitizer = new InputSanitizer();
	});

	describe('XSS Protection', () => {
		it('should sanitize script tags', () => {
			const maliciousInput = '<script>alert("XSS")</script>Hello World';
			const result = sanitizer.sanitizeString(maliciousInput);

			expect(result.sanitized).not.toContain('<script>');
			expect(result.sanitized).toContain('[REMOVED_XSS]');
			expect(result.violations).toContain('XSS attempt detected: SCRIPT_TAG');
			expect(result.blocked).toBe(true);
		});

		it('should sanitize javascript protocol', () => {
			const maliciousInput = 'javascript:alert("XSS")';
			const result = sanitizer.sanitizeString(maliciousInput);

			expect(result.sanitized).not.toContain('javascript:');
			expect(result.violations).toContain('XSS attempt detected: JAVASCRIPT_PROTOCOL');
			expect(result.blocked).toBe(true);
		});

		it('should sanitize on event handlers', () => {
			const maliciousInput = '<div onclick="alert(\\"XSS\\")">Click me</div>';
			const result = sanitizer.sanitizeString(maliciousInput);

			expect(result.violations).toContain('XSS attempt detected: ON_EVENT');
			expect(result.blocked).toBe(true);
		});

		it('should encode HTML entities', () => {
			const input = '<div>Hello & "World"</div>';
			const result = sanitizer.sanitizeString(input);

			expect(result.sanitized).toContain('&lt;div&gt;');
			expect(result.sanitized).toContain('&amp;');
			expect(result.sanitized).toContain('&quot;');
		});

		it('should allow safe input', () => {
			const safeInput = 'Hello World! This is safe content.';
			const result = sanitizer.sanitizeString(safeInput);

			expect(result.sanitized).toBe(safeInput);
			expect(result.violations).toHaveLength(0);
			expect(result.blocked).toBe(false);
		});
	});

	describe('SQL Injection Protection', () => {
		it('should detect UNION SELECT attacks', () => {
			const sqlInjection = "'; UNION SELECT * FROM users; --";
			const result = sanitizer.sanitizeString(sqlInjection);

			expect(result.violations).toContain('SQL injection attempt detected: UNION_SELECT');
			expect(result.blocked).toBe(true);
		});

		it('should detect OR 1=1 attacks', () => {
			const sqlInjection = "admin' OR 1=1 --";
			const result = sanitizer.sanitizeString(sqlInjection);

			expect(result.violations).toContain('SQL injection attempt detected: OR_1_EQUALS_1');
			expect(result.blocked).toBe(true);
		});

		it('should detect DROP TABLE attacks', () => {
			const sqlInjection = "'; DROP TABLE users; --";
			const result = sanitizer.sanitizeString(sqlInjection);

			expect(result.violations).toContain('SQL injection attempt detected: DROP_TABLE');
			expect(result.blocked).toBe(true);
		});

		it('should detect comment-based injection', () => {
			const sqlInjection = "admin'--";
			const result = sanitizer.sanitizeString(sqlInjection);

			expect(result.violations).toContain('SQL injection attempt detected: SINGLE_QUOTE_COMMENT');
			expect(result.blocked).toBe(true);
		});
	});

	describe('Command Injection Protection', () => {
		it('should detect pipe operations', () => {
			const cmdInjection = 'file.txt | cat /etc/passwd';
			const result = sanitizer.sanitizeString(cmdInjection);

			expect(result.violations).toContain('Command injection attempt detected: PIPE');
			expect(result.blocked).toBe(true);
		});

		it('should detect backtick execution', () => {
			const cmdInjection = 'file.txt `whoami`';
			const result = sanitizer.sanitizeString(cmdInjection);

			expect(result.violations).toContain('Command injection attempt detected: BACKTICK');
			expect(result.blocked).toBe(true);
		});

		it('should detect command substitution', () => {
			const cmdInjection = 'file.txt $(whoami)';
			const result = sanitizer.sanitizeString(cmdInjection);

			expect(result.violations).toContain('Command injection attempt detected: DOLLAR_PAREN');
			expect(result.blocked).toBe(true);
		});

		it('should detect redirect operations', () => {
			const cmdInjection = 'file.txt > /dev/null';
			const result = sanitizer.sanitizeString(cmdInjection);

			expect(result.violations).toContain('Command injection attempt detected: REDIRECT');
			expect(result.blocked).toBe(true);
		});
	});

	describe('Length Validation', () => {
		it('should truncate overly long input', () => {
			const longInput = 'a'.repeat(20000);
			const result = sanitizer.sanitizeString(longInput);

			expect(result.sanitized.length).toBe(DEFAULT_SANITIZATION_CONFIG.maxInputLength);
			expect(result.violations).toContain(
				`Input exceeds maximum length: ${DEFAULT_SANITIZATION_CONFIG.maxInputLength}`,
			);
		});

		it('should accept input within limits', () => {
			const normalInput = 'a'.repeat(1000);
			const result = sanitizer.sanitizeString(normalInput);

			expect(result.sanitized).toBe(normalInput);
			expect(result.violations).toHaveLength(0);
		});
	});

	describe('Object Sanitization', () => {
		it('should sanitize object properties', () => {
			const maliciousObject = {
				name: 'John',
				comment: '<script>alert("XSS")</script>',
				description: 'Normal text',
			};

			const result = sanitizer.sanitizeObject(maliciousObject);

			expect(result.sanitized.name).toBe('John');
			expect(result.sanitized.comment).toContain('[REMOVED_XSS]');
			expect(result.sanitized.description).toBe('Normal text');
			expect(result.violations).toContain('comment: XSS attempt detected: SCRIPT_TAG');
		});

		it('should handle nested objects', () => {
			const nestedObject = {
				user: {
					profile: {
						bio: '<script>alert("XSS")</script>',
					},
				},
			};

			const result = sanitizer.sanitizeObject(nestedObject);
			const profile = (result.sanitized.user as { profile: { bio: string } }).profile;

			expect(profile.bio).toContain('[REMOVED_XSS]');
			expect(result.violations).toContain('user.profile.bio: XSS attempt detected: SCRIPT_TAG');
		});
	});

	describe('Custom Patterns', () => {
		it('should detect custom violation patterns', () => {
			const customSanitizer = new InputSanitizer({
				customPatterns: [/forbidden_word/gi],
			});

			const input = 'This contains forbidden_word in it';
			const result = customSanitizer.sanitizeString(input);

			expect(result.violations).toContain('Custom pattern violation: /forbidden_word/gi');
		});
	});

	describe('Configuration', () => {
		it('should respect disabled XSS protection', () => {
			const permissiveSanitizer = new InputSanitizer({
				enableXSSProtection: false,
			});

			const xssInput = '<script>alert("XSS")</script>';
			const result = permissiveSanitizer.sanitizeString(xssInput);

			expect(result.violations).toHaveLength(0);
			expect(result.blocked).toBe(false);
		});

		it('should respect disabled SQL injection protection', () => {
			const permissiveSanitizer = new InputSanitizer({
				enableSQLInjectionProtection: false,
			});

			const sqlInput = "'; DROP TABLE users; --";
			const result = permissiveSanitizer.sanitizeString(sqlInput);

			expect(result.violations).toHaveLength(0);
			expect(result.blocked).toBe(false);
		});
	});
});

describe('Log Redaction', () => {
	describe('String Redaction', () => {
		it('should redact API keys', () => {
			const sensitiveLog = 'API Key: sk-1234567890abcdef';
			const redacted = LogRedactor.redactSensitiveData(sensitiveLog) as string;

			expect(redacted).not.toContain('sk-1234567890abcdef');
			expect(redacted).toContain('[REDACTED]');
		});

		it('should redact passwords', () => {
			const sensitiveLog = 'password=secret123';
			const redacted = LogRedactor.redactSensitiveData(sensitiveLog) as string;

			expect(redacted).not.toContain('secret123');
			expect(redacted).toContain('[REDACTED]');
		});

		it('should redact tokens', () => {
			const sensitiveLog = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
			const redacted = LogRedactor.redactSensitiveData(sensitiveLog) as string;

			expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
			expect(redacted).toContain('[REDACTED]');
		});

		it('should redact email addresses', () => {
			const sensitiveLog = 'User email: user@example.com';
			const redacted = LogRedactor.redactSensitiveData(sensitiveLog) as string;

			expect(redacted).not.toContain('user@example.com');
			expect(redacted).toContain('[REDACTED]');
		});

		it('should redact phone numbers', () => {
			const sensitiveLog = 'Phone: +1-555-123-4567';
			const redacted = LogRedactor.redactSensitiveData(sensitiveLog) as string;

			expect(redacted).not.toContain('+1-555-123-4567');
			expect(redacted).toContain('[REDACTED]');
		});

		it('should redact SSN', () => {
			const sensitiveLog = 'SSN: 123-45-6789';
			const redacted = LogRedactor.redactSensitiveData(sensitiveLog) as string;

			expect(redacted).not.toContain('123-45-6789');
			expect(redacted).toContain('[REDACTED]');
		});

		it('should preserve non-sensitive content', () => {
			const normalLog = 'This is a normal log message with no sensitive data';
			const redacted = LogRedactor.redactSensitiveData(normalLog) as string;

			expect(redacted).toBe(normalLog);
		});
	});

	describe('Object Redaction', () => {
		it('should redact sensitive field names', () => {
			const sensitiveData = {
				username: 'john_doe',
				password: 'secret123',
				apiKey: 'sk-1234567890abcdef',
				data: 'public information',
			};

			const redacted = LogRedactor.redactSensitiveData(sensitiveData) as Record<string, unknown>;

			expect(redacted.username).toBe('john_doe');
			expect(redacted.password).toBe('[REDACTED]');
			expect(redacted.apiKey).toBe('[REDACTED]');
			expect(redacted.data).toBe('public information');
		});

		it('should redact nested sensitive fields', () => {
			const nestedData = {
				user: {
					profile: {
						name: 'John Doe',
						password: 'secret123',
					},
					credentials: {
						token: 'abc123xyz789',
					},
				},
			};

			const redacted = LogRedactor.redactSensitiveData(nestedData) as Record<string, unknown>;
			const user = redacted.user as Record<string, unknown>;
			const profile = user.profile as Record<string, unknown>;
			const credentials = user.credentials as Record<string, unknown>;

			expect(profile.name).toBe('John Doe');
			expect(profile.password).toBe('[REDACTED]');
			expect(credentials.token).toBe('[REDACTED]');
		});

		it('should redact sensitive patterns in string values', () => {
			const data = {
				message: 'User logged in with API key: sk-1234567890abcdef',
				timestamp: '2023-01-01T00:00:00Z',
			};

			const redacted = LogRedactor.redactSensitiveData(data) as Record<string, unknown>;

			expect(redacted.message).not.toContain('sk-1234567890abcdef');
			expect(redacted.message).toContain('[REDACTED]');
			expect(redacted.timestamp).toBe('2023-01-01T00:00:00Z');
		});
	});

	describe('Edge Cases', () => {
		it('should handle null and undefined values', () => {
			expect(LogRedactor.redactSensitiveData(null)).toBeNull();
			expect(LogRedactor.redactSensitiveData(undefined)).toBeUndefined();
		});

		it('should handle primitive values', () => {
			expect(LogRedactor.redactSensitiveData(123)).toBe(123);
			expect(LogRedactor.redactSensitiveData(true)).toBe(true);
		});

		it('should handle arrays', () => {
			const arrayData = ['public', 'password=secret123', 'more public'];
			const redacted = LogRedactor.redactSensitiveData(arrayData);

			expect(Array.isArray(redacted)).toBe(true);
			const arr = redacted as string[];
			expect(arr[0]).toBe('public');
			expect(arr[1]).toContain('[REDACTED]');
			expect(arr[2]).toBe('more public');
		});
	});
});

describe('Security Middleware', () => {
	const middleware = createSecurityMiddleware();

	describe('Body Sanitization', () => {
		it('should sanitize string body', () => {
			const body = '<script>alert("XSS")</script>';
			const result = middleware.sanitizeBody(body);

			expect(result.sanitized).toContain('[REMOVED_XSS]');
			expect(result.violations).toContain('XSS attempt detected: SCRIPT_TAG');
		});

		it('should sanitize object body', () => {
			const body = {
				comment: '<script>alert("XSS")</script>',
				name: 'John',
			};
			const result = middleware.sanitizeBody(body);

			const sanitized = result.sanitized as Record<string, unknown>;
			expect(sanitized.comment).toContain('[REMOVED_XSS]');
			expect(sanitized.name).toBe('John');
		});
	});

	describe('Query Sanitization', () => {
		it('should sanitize query parameters', () => {
			const query = {
				search: '<script>alert("XSS")</script>',
				page: '1',
			};
			const result = middleware.sanitizeQuery(query);

			expect(result.sanitized.search).toContain('[REMOVED_XSS]');
			expect(result.sanitized.page).toBe('1');
		});
	});

	describe('Logging Redaction', () => {
		it('should redact sensitive data for logging', () => {
			const data = {
				user: 'john',
				password: 'secret123',
				response: 'success',
			};
			const redacted = middleware.redactForLogging(data) as Record<string, unknown>;

			expect(redacted.user).toBe('john');
			expect(redacted.password).toBe('[REDACTED]');
			expect(redacted.response).toBe('success');
		});
	});
});

describe('Security Schemas', () => {
	describe('SafeString Schema', () => {
		it('should accept safe strings', () => {
			const safeString = 'This is a safe string';
			const result = SecuritySchemas.SafeString.safeParse(safeString);

			expect(result.success).toBe(true);
		});

		it('should reject unsafe strings', () => {
			const unsafeString = '<script>alert("XSS")</script>';
			const result = SecuritySchemas.SafeString.safeParse(unsafeString);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('String contains unsafe content');
			}
		});

		it('should reject overly long strings', () => {
			const longString = 'a'.repeat(20000);
			const result = SecuritySchemas.SafeString.safeParse(longString);

			expect(result.success).toBe(false);
		});
	});

	describe('SafeObject Schema', () => {
		it('should accept safe objects', () => {
			const safeObject = {
				name: 'John',
				message: 'Hello world',
			};
			const result = SecuritySchemas.SafeObject.safeParse(safeObject);

			expect(result.success).toBe(true);
		});

		it('should reject unsafe objects', () => {
			const unsafeObject = {
				name: 'John',
				comment: '<script>alert("XSS")</script>',
			};
			const result = SecuritySchemas.SafeObject.safeParse(unsafeObject);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Object contains unsafe content');
			}
		});
	});
});
