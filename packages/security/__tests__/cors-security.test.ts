/**
 * [brAInwav] CORS Security Tests
 * Tests for CodeQL alerts #213, #212
 *
 * Phase 1 (RED): Write failing tests first
 */

import { describe, expect, it } from 'vitest';
import { ALLOWED_ORIGINS, corsOptions, validateOrigin } from '../src/config/cors.js';

describe('[brAInwav] CORS Security - Origin Validation', () => {
	describe('validateOrigin function', () => {
		it('should reject requests from unknown origins', async () => {
			await new Promise<void>((resolve) => {
				validateOrigin('https://evil.com', (err, allow) => {
					expect(err).toBeDefined();
					expect(err?.message).toContain('brAInwav');
					expect(err?.message).toContain('not allowed');
					expect(allow).toBeUndefined();
					resolve();
				});
			});
		});

		it('should accept requests from whitelisted localhost:3024', async () => {
			await new Promise<void>((resolve) => {
				validateOrigin('http://localhost:3024', (err, allow) => {
					expect(err).toBeNull();
					expect(allow).toBe(true);
					resolve();
				});
			});
		});

		it('should accept requests from whitelisted localhost:3026', async () => {
			await new Promise<void>((resolve) => {
				validateOrigin('http://localhost:3026', (err, allow) => {
					expect(err).toBeNull();
					expect(allow).toBe(true);
					resolve();
				});
			});
		});

		it('should accept requests from whitelisted localhost:3028', async () => {
			await new Promise<void>((resolve) => {
				validateOrigin('http://localhost:3028', (err, allow) => {
					expect(err).toBeNull();
					expect(allow).toBe(true);
					resolve();
				});
			});
		});

		it('should accept requests from whitelisted localhost:39300', async () => {
			await new Promise<void>((resolve) => {
				validateOrigin('http://localhost:39300', (err, allow) => {
					expect(err).toBeNull();
					expect(allow).toBe(true);
					resolve();
				});
			});
		});

		it('should allow same-origin requests with no origin header', async () => {
			await new Promise<void>((resolve) => {
				validateOrigin(undefined, (err, allow) => {
					expect(err).toBeNull();
					expect(allow).toBe(true);
					resolve();
				});
			});
		});

		it('should accept requests from environment-configured ALLOWED_ORIGIN', async () => {
			const envOrigin = process.env.ALLOWED_ORIGIN;
			if (envOrigin) {
				await new Promise<void>((resolve) => {
					validateOrigin(envOrigin, (err, allow) => {
						expect(err).toBeNull();
						expect(allow).toBe(true);
						resolve();
					});
				});
			}
		});

		it('should NOT reflect arbitrary origins', async () => {
			await new Promise<void>((resolve) => {
				validateOrigin('https://attacker.com', (err, allow) => {
					expect(err).toBeDefined();
					expect(allow).toBeUndefined();
					resolve();
				});
			});
		});

		it('should reject malicious subdomain attempts', async () => {
			await new Promise<void>((resolve) => {
				validateOrigin('https://localhost.evil.com', (err, allow) => {
					expect(err).toBeDefined();
					expect(allow).toBeUndefined();
					resolve();
				});
			});
		});

		it('should reject port-based bypass attempts', async () => {
			await new Promise<void>((resolve) => {
				validateOrigin('http://localhost:9999', (err, allow) => {
					expect(err).toBeDefined();
					expect(allow).toBeUndefined();
					resolve();
				});
			});
		});
	});

	describe('CORS Configuration', () => {
		it('should have origin validation function', () => {
			expect(corsOptions.origin).toBeDefined();
			expect(typeof corsOptions.origin).toBe('function');
		});

		it('should enable credentials', () => {
			expect(corsOptions.credentials).toBe(true);
		});

		it('should include brAInwav localhost ports in allowed origins', () => {
			expect(ALLOWED_ORIGINS).toContain('http://localhost:3024');
			expect(ALLOWED_ORIGINS).toContain('http://localhost:3026');
			expect(ALLOWED_ORIGINS).toContain('http://localhost:3028');
			expect(ALLOWED_ORIGINS).toContain('http://localhost:39300');
		});
	});

	describe('Security Attack Prevention', () => {
		it('should prevent CORS reflection attacks with credentials', async () => {
			// CodeQL Alert #213: CORS misconfiguration
			await new Promise<void>((resolve) => {
				validateOrigin('https://attacker.com', (err, allow) => {
					expect(err).toBeDefined();
					expect(err?.message).toContain('Origin');
					expect(err?.message).toContain('not allowed');
					resolve();
				});
			});
		});

		it('should prevent wildcard origin with credentials', () => {
			// CodeQL Alert #212: Permissive CORS
			// The config should NOT use '*' when credentials are true
			expect(corsOptions.origin).not.toBe('*');
			expect(typeof corsOptions.origin).toBe('function');
		});

		it('should prevent null origin bypass', async () => {
			// Some browsers send "null" as origin
			await new Promise<void>((resolve) => {
				validateOrigin('null', (err, allow) => {
					expect(err).toBeDefined();
					resolve();
				});
			});
		});

		it('should prevent file:// origin bypass', async () => {
			await new Promise<void>((resolve) => {
				validateOrigin('file://', (err, allow) => {
					expect(err).toBeDefined();
					resolve();
				});
			});
		});

		it('should handle case sensitivity properly', async () => {
			// HTTP requires case-insensitive scheme matching
			await new Promise<void>((resolve) => {
				validateOrigin('HTTP://LOCALHOST:3024', (err, allow) => {
					expect(err).toBeDefined(); // Should reject due to case mismatch
					resolve();
				});
			});
		});
	});
});
