// Input Sanitization Tests for Cortex WebUI backend
// TDD implementation for XSS protection and input validation

import type { Request, Response, NextFunction } from 'express';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { sanitizeInput } from '../src/middleware/security.js';
import { getSecurityConfig } from '../src/config/security.js';

describe('Input Sanitization Tests', () => {
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		mockReq = {
			headers: {},
			body: {},
			query: {},
			params: {},
			ip: '127.0.0.1'
		};

		mockRes = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn()
		};

		mockNext = vi.fn();
	});

	describe('XSS Protection', () => {
		it('should remove script tags from request body', async () => {
			const maliciousBody = {
				name: '<script>alert("xss")</script>Test Name',
				description: 'Normal description',
				content: '<div>Some <script>malicious()</script> content</div>'
			};

			mockReq.body = maliciousBody;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.body.name).toBe('Test Name');
			expect(mockReq.body.description).toBe('Normal description');
			expect(mockReq.body.content).toBe('<div>Some  content</div>');
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle various XSS attack vectors', async () => {
			const xssAttacks = [
				'<script>alert("xss")</script>',
				'<img src="x" onerror="alert(\'xss\')">',
				'<svg onload="alert(\'xss\')">',
				'<iframe src="javascript:alert(\'xss\')"></iframe>',
				'<body onload="alert(\'xss\')">',
				'<input onfocus="alert(\'xss\')" autofocus>',
				'<select onfocus="alert(\'xss\')" autofocus>',
				'<textarea onfocus="alert(\'xss\')" autofocus>',
				'<keygen onfocus="alert(\'xss\')" autofocus>',
				'<video><source onerror="alert(\'xss\')">',
				'<audio src="x" onerror="alert(\'xss\')">',
				'<details open ontoggle="alert(\'xss\')">',
				'<marquee onstart="alert(\'xss\')">test</marquee>'
			];

			for (const attack of xssAttacks) {
				mockReq.body = { content: attack };
				mockNext.mockClear();

				await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

				expect(mockNext).toHaveBeenCalled();
				expect(mockReq.body.content).not.toContain('<script');
				expect(mockReq.body.content).not.toContain('onerror=');
				expect(mockReq.body.content).not.toContain('onload=');
				expect(mockReq.body.content).not.toContain('javascript:');
			}
		});

		it('should sanitize query parameters', async () => {
			const maliciousQuery = {
				search: '<script>alert("xss")</script>search term',
				filter: 'category<script>alert("xss")</script>',
				page: '1'
			};

			mockReq.query = maliciousQuery;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.query.search).toBe('search term');
			expect(mockReq.query.filter).toBe('category');
			expect(mockReq.query.page).toBe('1');
			expect(mockNext).toHaveBeenCalled();
		});

		it('should sanitize URL parameters', async () => {
			const maliciousParams = {
				id: '<script>alert("xss")</script>123',
				category: 'test<script>alert("xss")</script>category'
			};

			mockReq.params = maliciousParams;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.params.id).toBe('123');
			expect(mockReq.params.category).toBe('testcategory');
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('HTML Tag and Attribute Filtering', () => {
		it('should remove all HTML tags by default', async () => {
			const htmlContent = {
				title: '<h1>Big Title</h1>',
				content: '<p>This is <strong>important</strong> and <em>emphasized</em></p>',
				nested: '<div><ul><li>Item 1</li><li>Item 2</li></ul></div>'
			};

			mockReq.body = htmlContent;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.body.title).toBe('Big Title');
			expect(mockReq.body.content).toBe('This is important and emphasized');
			expect(mockReq.body.nested).toBe('Item 1Item 2');
			expect(mockNext).toHaveBeenCalled();
		});

		it('should preserve text content while removing tags', async () => {
			const contentWithTags = {
				message: '<p>Hello <span style="color: red">World</span>!</p>',
				code: '<code>console.log("test")</code>',
				link: '<a href="https://example.com">Click here</a>'
			};

			mockReq.body = contentWithTags;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.body.message).toBe('Hello World!');
			expect(mockReq.body.code).toBe('console.log("test")');
			expect(mockReq.body.link).toBe('Click here');
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Field Length Validation', () => {
		it('should truncate fields that exceed maximum length', async () => {
			const config = getSecurityConfig();
			const longString = 'a'.repeat(config.validation.maxFieldLength + 100);

			const longContent = {
				short: 'normal content',
				long: longString,
				nested: {
					short: 'normal',
					long: longString
				}
			};

			mockReq.body = longContent;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.body.short).toBe('normal content');
			expect(mockReq.body.long.length).toBe(config.validation.maxFieldLength);
			expect(mockReq.body.nested.short).toBe('normal');
			expect(mockReq.body.nested.long.length).toBe(config.validation.maxFieldLength);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle exact maximum length boundaries', async () => {
			const config = getSecurityConfig();
			const maxLength = config.validation.maxFieldLength;
			const exactLength = 'a'.repeat(maxLength);

			mockReq.body = { content: exactLength };

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.body.content.length).toBe(maxLength);
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Data Type Preservation', () => {
		it('should preserve non-string data types', async () => {
			const mixedData = {
				string: '<script>alert("xss")</script>test',
				number: 42,
				boolean: true,
				nullValue: null,
				undefinedValue: undefined,
				array: [1, 2, '<script>alert("xss")</script>3'],
				nested: {
					string: '<script>alert("xss")</script>nested',
					number: 3.14
				}
			};

			mockReq.body = mixedData;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.body.string).toBe('test');
			expect(mockReq.body.number).toBe(42);
			expect(mockReq.body.boolean).toBe(true);
			expect(mockReq.body.nullValue).toBeNull();
			expect(mockReq.body.undefinedValue).toBeUndefined();
			expect(mockReq.body.array).toEqual([1, 2, '3']);
			expect(mockReq.body.nested.string).toBe('nested');
			expect(mockReq.body.nested.number).toBe(3.14);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle date objects', async () => {
			const now = new Date();
			const dataWithDates = {
				createdAt: now,
				stringDate: '<script>alert("xss")</script>2023-01-01'
			};

			mockReq.body = dataWithDates;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.body.createdAt).toBe(now);
			expect(mockReq.body.stringDate).toBe('2023-01-01');
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Array Processing', () => {
		it('should sanitize array elements', async () => {
			const maliciousArray = {
				items: [
					'normal item',
					'<script>alert("xss")</script>malicious item',
					'<div>html content</div>',
					42
				],
				nestedArrays: [
					['<script>alert("xss")</script>nested 1', 'normal'],
					['<div>nested 2</div>']
				]
			};

			mockReq.body = maliciousArray;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.body.items).toEqual([
				'normal item',
				'malicious item',
				'html content',
				42
			]);
			expect(mockReq.body.nestedArrays).toEqual([
				['nested 1', 'normal'],
				['nested 2']
			]);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle empty arrays', async () => {
			mockReq.body = { items: [], nested: { empty: [] } };

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.body.items).toEqual([]);
			expect(mockReq.body.nested.empty).toEqual([]);
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Error Handling', () => {
		it('should handle circular references gracefully', async () => {
			const circular: any = { name: '<script>alert("xss")</script>test' };
			circular.self = circular;

			mockReq.body = circular;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			// Should not throw an error and should handle it gracefully
			expect(mockNext).toHaveBeenCalled();
		});

		it('should return error when sanitization fails', async () => {
			// Mock DOMPurify to throw an error
			const { DOMPurify } = await import('dompurify');
			const originalSanitize = DOMPurify.sanitize;
			DOMPurify.sanitize = vi.fn(() => {
				throw new Error('Sanitization failed');
			});

			mockReq.body = { content: 'test content' };

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(400);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: Input sanitization failed',
				brand: 'brAInwav'
			});
			expect(mockNext).not.toHaveBeenCalled();

			// Restore original function
			DOMPurify.sanitize = originalSanitize;
		});
	});

	describe('Configuration', () => {
		it('should skip sanitization when disabled', async () => {
			// Temporarily disable sanitization
			process.env.ENABLE_INPUT_SANITIZATION = 'false';

			const maliciousContent = {
				content: '<script>alert("xss")</script>malicious'
			};

			mockReq.body = maliciousContent;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			// Content should remain unchanged
			expect(mockReq.body.content).toBe('<script>alert("xss")</script>malicious');
			expect(mockNext).toHaveBeenCalled();

			// Re-enable
			process.env.ENABLE_INPUT_SANITIZATION = 'true';
		});
	});

	describe('Security Context Integration', () => {
		it('should set inputSanitized flag in security context', async () => {
			mockReq.body = { content: 'test content' };

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.securityContext?.inputSanitized).toBe(true);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should preserve existing security context', async () => {
			mockReq.securityContext = {
				apiKeyValid: true,
				csrfToken: 'existing-token'
			};

			mockReq.body = { content: 'test content' };

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.securityContext?.apiKeyValid).toBe(true);
			expect(mockReq.securityContext?.csrfToken).toBe('existing-token');
			expect(mockReq.securityContext?.inputSanitized).toBe(true);
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Performance and Edge Cases', () => {
		it('should handle large nested objects efficiently', async () => {
			const largeObject = {
				level1: {
					level2: {
						level3: {
							data: '<script>alert("xss")</script>'.repeat(100)
						}
					}
				}
			};

			mockReq.body = largeObject;

			const startTime = Date.now();
			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);
			const endTime = Date.now();

			expect(mockNext).toHaveBeenCalled();
			expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
			expect(mockReq.body.level1.level2.level3.data).not.toContain('<script>');
		});

		it('should handle special characters and encoding', async () => {
			const specialChars = {
				unicode: 'Hello 世界 <script>alert("xss")</script>',
				htmlEntities: '&lt;script&gt;alert("xss")&lt;/script&gt;',
				urlEncoded: '%3Cscript%3Ealert%28%22xss%22%29%3C%2Fscript%3E',
				mixed: 'Test <b>bold</b> &amp; <script>alert("xss")</script> end'
			};

			mockReq.body = specialChars;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockReq.body.unicode).not.toContain('<script>');
			expect(mockReq.body.htmlEntities).not.toContain('script');
			expect(mockReq.body.urlEncoded).not.toContain('script');
			expect(mockReq.body.mixed).not.toContain('script');
		});
	});

	describe('BrAInwav Branding', () => {
		it('should include brAInwav branding in error messages', async () => {
			// Mock DOMPurify to throw an error
			const { DOMPurify } = await import('dompurify');
			const originalSanitize = DOMPurify.sanitize;
			DOMPurify.sanitize = vi.fn(() => {
				throw new Error('Test error');
			});

			mockReq.body = { content: 'test' };

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: Input sanitization failed',
				brand: 'brAInwav'
			});

			DOMPurify.sanitize = originalSanitize;
		});
	});
});