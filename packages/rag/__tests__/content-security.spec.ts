import { describe, expect, it } from 'vitest';
import {
	ContentSecurityError,
	ContentSecurityPolicy,
	createContentSecurityPolicy,
	DEFAULT_CONTENT_SECURITY_CONFIG,
	defaultContentSecurity,
} from '../src/lib/content-security';

describe('Content Security Policy', () => {
	describe('ContentSecurityPolicy', () => {
		it('should sanitize clean text without modification', () => {
			const csp = new ContentSecurityPolicy();
			const cleanText = 'This is a clean text with no dangerous content.';

			const result = csp.sanitizeText(cleanText);

			expect(result).toBe(cleanText);
		});

		it('should strip script tags', () => {
			const csp = new ContentSecurityPolicy();
			const maliciousText = 'Hello <script>alert("XSS")</script> world';

			const result = csp.sanitizeText(maliciousText);

			expect(result).toBe('Hello  world');
			expect(result).not.toContain('<script>');
		});

		it('should strip style tags', () => {
			const csp = new ContentSecurityPolicy();
			const maliciousText = 'Content with <style>body { display: none; }</style> style';

			const result = csp.sanitizeText(maliciousText);

			expect(result).toBe('Content with  style');
			expect(result).not.toContain('<style>');
		});

		it('should strip event handlers', () => {
			const csp = new ContentSecurityPolicy();
			const maliciousText = '<div onclick="alert(1)">Click me</div>';

			const result = csp.sanitizeText(maliciousText);

			expect(result).toBe('<div>Click me</div>');
			expect(result).not.toContain('onclick');
		});

		it('should remove javascript: protocols', () => {
			const csp = new ContentSecurityPolicy({
				content: {
					maxLength: 10000,
					blockSuspiciousPatterns: false,
					sanitizeUrls: true,
					allowDataUrls: false,
				},
			});
			const maliciousText = 'Link: <a href="javascript:alert(1)">Click</a>';

			const result = csp.sanitizeText(maliciousText);

			expect(result).not.toContain('javascript:');
		});

		it('should block suspicious SQL injection patterns', () => {
			const csp = new ContentSecurityPolicy();
			const sqlInjection = "'; DROP TABLE users; --";

			expect(() => csp.sanitizeText(sqlInjection)).toThrow(ContentSecurityError);
		});

		it('should block command injection patterns', () => {
			const csp = new ContentSecurityPolicy();
			const commandInjection = 'test; cat /etc/passwd';

			expect(() => csp.sanitizeText(commandInjection)).toThrow(ContentSecurityError);
		});

		it('should block path traversal patterns', () => {
			const csp = new ContentSecurityPolicy();
			const pathTraversal = '../../../etc/passwd';

			expect(() => csp.sanitizeText(pathTraversal)).toThrow(ContentSecurityError);
		});

		it('should enforce content length limits', () => {
			const csp = new ContentSecurityPolicy({
				content: {
					maxLength: 10,
					blockSuspiciousPatterns: false,
					sanitizeUrls: false,
					allowDataUrls: false,
				},
			});
			const longContent = 'This is a very long content that exceeds the limit';

			expect(() => csp.sanitizeText(longContent)).toThrow(ContentSecurityError);
		});

		it('should sanitize URLs in content', () => {
			const csp = new ContentSecurityPolicy({
				content: {
					maxLength: 10000,
					blockSuspiciousPatterns: false,
					sanitizeUrls: true,
					allowDataUrls: false,
				},
			});
			const contentWithUrls = 'Check this link: javascript:alert(1)';

			const result = csp.sanitizeText(contentWithUrls);

			expect(result).not.toContain('javascript:');
		});

		it('should handle data URLs based on configuration', () => {
			const allowDataUrls = new ContentSecurityPolicy({
				content: {
					maxLength: 1000,
					blockSuspiciousPatterns: false,
					sanitizeUrls: true,
					allowDataUrls: true,
				},
			});
			const blockDataUrls = new ContentSecurityPolicy({
				content: {
					maxLength: 1000,
					blockSuspiciousPatterns: false,
					sanitizeUrls: true,
					allowDataUrls: false,
				},
			});

			const contentWithDataUrl = 'Image: data:image/png;base64,abc123';

			const allowedResult = allowDataUrls.sanitizeText(contentWithDataUrl);
			const blockedResult = blockDataUrls.sanitizeText(contentWithDataUrl);

			expect(allowedResult).toContain('data:');
			expect(blockedResult).not.toContain('data:');
		});
	});

	describe('Metadata Sanitization', () => {
		it('should sanitize clean metadata without modification', () => {
			const csp = new ContentSecurityPolicy();
			const cleanMetadata = { title: 'Test', category: 'example', count: 42 };

			const result = csp.sanitizeMetadata(cleanMetadata);

			expect(result).toEqual(cleanMetadata);
		});

		it('should block prototype pollution attempts', () => {
			const csp = new ContentSecurityPolicy();
			const maliciousMetadata = {
				title: 'Test',
				__proto__: { polluted: true },
			};

			expect(() => csp.sanitizeMetadata(maliciousMetadata)).toThrow(ContentSecurityError);
		});

		it('should remove dangerous keys', () => {
			const csp = new ContentSecurityPolicy({
				storage: {
					encryptSensitive: false,
					preventPrototypePollution: false,
					validateJsonStructure: false,
				},
			});
			const metadata = {
				title: 'Test',
				__proto__: 'dangerous',
				constructor: 'also dangerous',
				prototype: 'very dangerous',
				safe: 'value',
			};

			const result = csp.sanitizeMetadata(metadata);

			expect(result).toEqual({ title: 'Test', safe: 'value' });
			expect(result).not.toHaveProperty('__proto__');
			expect(result).not.toHaveProperty('constructor');
			expect(result).not.toHaveProperty('prototype');
		});

		it('should sanitize nested objects', () => {
			const csp = new ContentSecurityPolicy();
			const metadata = {
				user: {
					name: 'John',
					profile: '<script>alert("xss")</script>',
				},
			};

			const result = csp.sanitizeMetadata(metadata);

			expect(result.user).toBeDefined();
			const userResult = result.user as Record<string, unknown>;
			expect(userResult.profile as string).not.toContain('<script>');
		});

		it('should sanitize array values', () => {
			const csp = new ContentSecurityPolicy();
			const metadata = {
				tags: ['clean', '<script>alert(1)</script>', 'also clean'],
			};

			const result = csp.sanitizeMetadata(metadata);

			expect(Array.isArray(result.tags)).toBe(true);
			expect((result.tags as string[])[1]).not.toContain('<script>');
		});

		it('should limit array length', () => {
			const csp = new ContentSecurityPolicy();
			const metadata = {
				items: Array(150).fill('item'), // More than 100 items
			};

			const result = csp.sanitizeMetadata(metadata);

			expect((result.items as unknown[]).length).toBe(100);
		});
	});

	describe('Content Validation', () => {
		it('should validate clean content as safe', () => {
			const csp = new ContentSecurityPolicy();
			const cleanContent = 'This is perfectly safe content.';

			const result = csp.validateContent(cleanContent);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should identify dangerous content as unsafe', () => {
			const csp = new ContentSecurityPolicy();
			const dangerousContent = "'; DROP TABLE users; --";

			const result = csp.validateContent(dangerousContent);

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should provide detailed error information', () => {
			const csp = new ContentSecurityPolicy();
			const sqlInjection = "'; DROP TABLE users; --";

			const result = csp.validateContent(sqlInjection);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Suspicious pattern detected in content');
		});
	});

	describe('Security Reporting', () => {
		it('should create security report for clean content', () => {
			const csp = new ContentSecurityPolicy();
			const cleanContent = 'This is clean content with no risks.';

			const report = csp.createSecurityReport(cleanContent);

			expect(report.riskLevel).toBe('low');
			expect(report.suspiciousPatterns).toHaveLength(0);
			expect(report.xssVectors).toHaveLength(0);
			expect(report.contentLength).toBe(cleanContent.length);
		});

		it('should identify XSS vectors in security report', () => {
			const csp = new ContentSecurityPolicy();
			const xssContent = '<script>alert(1)</script> <div onclick="evil()">Click</div>';

			const report = csp.createSecurityReport(xssContent);

			expect(report.riskLevel).toBe('high');
			expect(report.xssVectors).toContain('script tags');
			expect(report.xssVectors).toContain('event handlers');
		});

		it('should count URLs in content', () => {
			const csp = new ContentSecurityPolicy();
			const contentWithUrls = 'Visit https://example.com and https://test.org for more info.';

			const report = csp.createSecurityReport(contentWithUrls);

			expect(report.urlCount).toBe(2);
		});

		it('should escalate risk level based on threat count', () => {
			const csp = new ContentSecurityPolicy();
			const highRiskContent =
				'<script>alert(1)</script><script>alert(2)</script><script>alert(3)</script>';

			const report = csp.createSecurityReport(highRiskContent);

			expect(report.riskLevel).toBe('high');
		});
	});

	describe('Configuration', () => {
		it('should use default configuration when none provided', () => {
			const csp = new ContentSecurityPolicy();

			// Test that default config is applied
			expect(() => csp.sanitizeText('<script>alert(1)</script>')).not.toThrow();
		});

		it('should merge custom configuration with defaults', () => {
			const customConfig = {
				content: {
					maxLength: 50,
					blockSuspiciousPatterns: true,
					sanitizeUrls: true,
					allowDataUrls: false,
				},
			};
			const csp = new ContentSecurityPolicy(customConfig);

			const longContent =
				'This is content that is longer than fifty characters and should be rejected.';

			expect(() => csp.sanitizeText(longContent)).toThrow(ContentSecurityError);
		});

		it('should disable XSS protection when configured', () => {
			const csp = new ContentSecurityPolicy({
				xss: {
					enabled: false,
					stripScripts: false,
					stripStyles: false,
					stripEventHandlers: false,
					allowedTags: [],
					allowedAttributes: [],
				},
				content: {
					maxLength: 10000,
					blockSuspiciousPatterns: false,
					sanitizeUrls: true,
					allowDataUrls: false,
				},
			});
			const scriptContent = '<script>alert(1)</script>';

			const result = csp.sanitizeText(scriptContent);

			// Should not strip script tags when XSS protection is disabled
			expect(result).toContain('<script>');
		});
	});

	describe('Factory Functions', () => {
		it('should create content security policy with validation', () => {
			const validConfig = {
				content: {
					maxLength: 1000,
					blockSuspiciousPatterns: true,
					sanitizeUrls: true,
					allowDataUrls: false,
				},
			};

			const csp = createContentSecurityPolicy(validConfig);

			expect(csp).toBeInstanceOf(ContentSecurityPolicy);
		});

		it('should throw error for invalid configuration', () => {
			const invalidConfig = {
				content: {
					maxLength: -100, // Invalid negative number
					blockSuspiciousPatterns: true,
					sanitizeUrls: true,
					allowDataUrls: false,
				},
			};

			expect(() => createContentSecurityPolicy(invalidConfig)).toThrow();
		});

		it('should provide default content security policy', () => {
			expect(defaultContentSecurity).toBeInstanceOf(ContentSecurityPolicy);

			const result = defaultContentSecurity.sanitizeText('Test content');
			expect(result).toBe('Test content');
		});
	});

	describe('Error Handling', () => {
		it('should throw ContentSecurityError with proper details', () => {
			const csp = new ContentSecurityPolicy();
			const maliciousContent = "'; DROP TABLE users; --";

			try {
				csp.sanitizeText(maliciousContent);
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ContentSecurityError);
				const secError = error as ContentSecurityError;
				expect(secError.reason).toContain('Suspicious pattern detected');
				expect(secError.securityLevel).toBe('high');
			}
		});

		it('should handle empty and null content gracefully', () => {
			const csp = new ContentSecurityPolicy();

			expect(csp.sanitizeText('')).toBe('');
			expect(csp.sanitizeText(null as unknown as string)).toBe('');
			expect(csp.sanitizeText(undefined as unknown as string)).toBe('');
		});

		it('should handle non-string input gracefully', () => {
			const csp = new ContentSecurityPolicy();

			expect(csp.sanitizeText(123 as unknown as string)).toBe('');
			expect(csp.sanitizeText({} as unknown as string)).toBe('');
			expect(csp.sanitizeText([] as unknown as string)).toBe('');
		});
	});

	describe('Integration with DEFAULT_CONTENT_SECURITY_CONFIG', () => {
		it('should have sensible default configuration', () => {
			expect(DEFAULT_CONTENT_SECURITY_CONFIG.xss.enabled).toBe(true);
			expect(DEFAULT_CONTENT_SECURITY_CONFIG.xss.stripScripts).toBe(true);
			expect(DEFAULT_CONTENT_SECURITY_CONFIG.content.blockSuspiciousPatterns).toBe(true);
			expect(DEFAULT_CONTENT_SECURITY_CONFIG.storage.preventPrototypePollution).toBe(true);
		});

		it('should include reasonable allowed tags', () => {
			const allowedTags = DEFAULT_CONTENT_SECURITY_CONFIG.xss.allowedTags;

			expect(allowedTags).toContain('p');
			expect(allowedTags).toContain('strong');
			expect(allowedTags).toContain('em');
			expect(allowedTags).not.toContain('script');
			expect(allowedTags).not.toContain('iframe');
		});
	});
});
