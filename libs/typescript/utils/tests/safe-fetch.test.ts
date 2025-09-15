import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSafeFetch, safeFetch, validateUrl } from '../src/safe-fetch.js';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('validateUrl', () => {
	it('should allow valid HTTPS URLs', () => {
		const result = validateUrl('https://example.com');
		expect(result.valid).toBe(true);
		expect(result.reason).toBeUndefined();
	});

	it('should reject HTTP URLs by default', () => {
		const result = validateUrl('http://example.com');
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('Protocol');
	});

	it('should allow HTTP when explicitly permitted', () => {
		const result = validateUrl('http://example.com', {
			allowedProtocols: ['http:', 'https:'],
		});
		expect(result.valid).toBe(true);
	});

	it('should reject localhost by default', () => {
		const result = validateUrl('https://localhost:3000');
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('Localhost');
	});

	it('should allow localhost when explicitly permitted', () => {
		const result = validateUrl('https://localhost:3000', {
			allowLocalhost: true,
		});
		expect(result.valid).toBe(true);
	});

	it('should enforce host allowlist', () => {
		const allowedHosts = ['api.example.com', 'trusted.example.org'];

		// Should allow listed host
		const validResult = validateUrl('https://api.example.com/data', {
			allowedHosts,
		});
		expect(validResult.valid).toBe(true);

		// Should reject unlisted host
		const invalidResult = validateUrl('https://malicious.com', {
			allowedHosts,
		});
		expect(invalidResult.valid).toBe(false);
		expect(invalidResult.reason).toContain('not in allowlist');
	});

	it('should handle malformed URLs', () => {
		const result = validateUrl('not-a-url');
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('Invalid URL');
	});
});

describe('safeFetch', () => {
	beforeEach(() => {
		mockFetch.mockReset();
		mockFetch.mockResolvedValue(new Response('test', { status: 200 }));
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	it('should make successful requests to valid URLs', async () => {
		const url = 'https://api.example.com/data';
		const options = {
			allowedHosts: ['api.example.com'],
		};

		await safeFetch(url, options);

		expect(mockFetch).toHaveBeenCalledWith(
			url,
			expect.objectContaining({
				redirect: 'manual',
				referrerPolicy: 'no-referrer',
				signal: expect.any(AbortSignal),
			}),
		);
	});

	it('should reject invalid URLs', async () => {
		const url = 'http://malicious.com';

		await expect(safeFetch(url)).rejects.toThrow('Safe fetch blocked');
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('should reject localhost IPs for security', async () => {
		await expect(safeFetch('http://127.0.0.1:8080/api')).rejects.toThrow(
			'Safe fetch blocked',
		);
		await expect(safeFetch('http://192.168.1.1/api')).rejects.toThrow(
			'Safe fetch blocked',
		);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('should merge fetch options correctly', async () => {
		const url = 'https://api.example.com/data';
		const options = {
			allowedHosts: ['api.example.com'],
			fetchOptions: {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			},
		};

		await safeFetch(url, options);

		expect(mockFetch).toHaveBeenCalledWith(
			url,
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				redirect: 'manual',
				referrerPolicy: 'no-referrer',
			}),
		);
	});
});

describe('createSafeFetch', () => {
	beforeEach(() => {
		mockFetch.mockReset();
		mockFetch.mockResolvedValue(new Response('test', { status: 200 }));
	});

	it('should create a configured fetch function', async () => {
		const allowedHosts = ['api.example.com'];
		const configuredFetch = createSafeFetch({ allowedHosts });

		await configuredFetch('https://api.example.com/data');

		expect(mockFetch).toHaveBeenCalledWith(
			'https://api.example.com/data',
			expect.objectContaining({
				redirect: 'manual',
				referrerPolicy: 'no-referrer',
			}),
		);
	});

	it('should allow overriding default options', async () => {
		const defaultOptions = { allowedHosts: ['api.example.com'] };
		const configuredFetch = createSafeFetch(defaultOptions);

		// Should allow overriding timeout
		await configuredFetch('https://api.example.com/data', { timeout: 5000 });

		expect(mockFetch).toHaveBeenCalled();
	});

	it('should merge allowedHosts correctly', async () => {
		const defaultOptions = { allowedHosts: ['api.example.com'] };
		const configuredFetch = createSafeFetch(defaultOptions);

		// Should use the override allowedHosts, not merge
		await expect(
			configuredFetch('https://other.com', {
				allowedHosts: ['other.com'],
			}),
		).resolves.toBeDefined();

		expect(mockFetch).toHaveBeenCalled();
	});
});

// Security regression tests
describe('security regression tests', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('should block SSRF attempts', async () => {
		const maliciousUrls = [
			'http://169.254.169.254/metadata',
			'https://localhost:22/ssh',
			'ftp://internal.server/file',
			'file:///etc/passwd',
			'data:text/html,<script>alert(1)</script>',
		];

		for (const url of maliciousUrls) {
			await expect(safeFetch(url)).rejects.toThrow();
		}

		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('should validate URLs case-insensitively', async () => {
		const result = validateUrl('HTTPS://LOCALHOST');
		expect(result.valid).toBe(false);
	});

	it('should handle URL with ports correctly', async () => {
		const result = validateUrl('https://api.example.com:443/data', {
			allowedHosts: ['api.example.com'],
		});
		expect(result.valid).toBe(true);
	});
});
