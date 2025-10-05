import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDefaultTrustMaterial, TrustRootManager } from '../src/trust/trust-root-manager.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the toTrustMaterial function
vi.mock('@sigstore/verify', () => ({
	toTrustMaterial: vi.fn().mockReturnValue({
		certificateAuthorities: [],
		timestampAuthorities: [],
		tlogs: [],
		ctlogs: [],
	}),
}));

describe('TrustRootManager', () => {
	let tempCacheDir: string;
	let manager: TrustRootManager;

	const mockTrustedRoot = {
		mediaType: 'application/vnd.dev.sigstore.trustedroot+json;version=0.1',
		tlogs: [
			{
				baseUrl: 'https://rekor.sigstore.dev',
				hashAlgorithm: 'SHA2_256',
				publicKey: {
					rawBytes: 'LS0tLS1CRUdJTi...',
					keyDetails: 'PKCS1_RSA_PKCS1V15',
					validFor: { start: '2021-01-01T00:00:00Z' },
				},
				logId: {
					keyId: 'wNI9atQGlz+VWfO...',
				},
			},
		],
		certificateAuthorities: [
			{
				subject: { organization: 'sigstore.dev', commonName: 'sigstore' },
				uri: 'https://fulcio.sigstore.dev',
				certChain: {
					certificates: [],
				},
				validFor: { start: '2021-01-01T00:00:00Z' },
			},
		],
		timestampAuthorities: [],
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		tempCacheDir = await mkdtemp(join(tmpdir(), 'sigstore-test-'));
		manager = new TrustRootManager({
			cacheDir: tempCacheDir,
			cacheTtlHours: 1,
			fetchTimeoutMs: 5000,
		});

		// Mock successful fetch by default
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			statusText: 'OK',
			json: () => Promise.resolve(mockTrustedRoot),
		} as Response);
	});

	afterEach(async () => {
		// Clean up temp directory
		try {
			await rm(tempCacheDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe('getTrustedRoot', () => {
		it('fetches and caches trust root on first call', async () => {
			const result = await manager.getTrustedRoot();

			expect(mockFetch).toHaveBeenCalledWith(
				'https://tuf-repo-cdn.sigstore.dev/targets/trusted_root.json',
				expect.objectContaining({
					headers: expect.objectContaining({
						'User-Agent': 'cortex-os-proof-artifacts/0.1.0 (brAInwav)',
						Accept: 'application/json',
					}),
				}),
			);
			expect(result).toEqual(mockTrustedRoot);
		});

		it('uses cached trust root on subsequent calls', async () => {
			// First call fetches
			await manager.getTrustedRoot();
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Second call uses cache
			const result = await manager.getTrustedRoot();
			expect(mockFetch).toHaveBeenCalledTimes(1); // No additional fetch
			expect(result).toEqual(mockTrustedRoot);
		});

		it('refetches when cache is expired', async () => {
			// Create manager with very short TTL
			const shortTtlManager = new TrustRootManager({
				cacheDir: tempCacheDir,
				cacheTtlHours: 0.001, // ~3.6 seconds
			});

			// First fetch
			await shortTtlManager.getTrustedRoot();
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Wait for cache to expire
			await new Promise((resolve) => setTimeout(resolve, 4000));

			// Second call should fetch again
			await shortTtlManager.getTrustedRoot();
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('handles fetch errors gracefully', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'));

			await expect(manager.getTrustedRoot()).rejects.toThrow('Network error');
		});

		it('handles HTTP errors', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
				statusText: 'Not Found',
			} as Response);

			await expect(manager.getTrustedRoot()).rejects.toThrow(
				'Failed to fetch trust root: 404 Not Found',
			);
		});

		it('validates trust root structure', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ invalid: 'structure' }),
			} as Response);

			await expect(manager.getTrustedRoot()).rejects.toThrow(
				'Invalid trusted root: missing required fields',
			);
		});

		it('handles fetch timeout', async () => {
			const timeoutManager = new TrustRootManager({
				cacheDir: tempCacheDir,
				fetchTimeoutMs: 100,
			});

			// Mock fetch that never resolves (simulates timeout)
			mockFetch.mockImplementation(() => new Promise(() => {}));

			await expect(timeoutManager.getTrustedRoot()).rejects.toThrow(
				'Trust root fetch timeout after 100ms',
			);
		});
	});

	describe('getTrustMaterial', () => {
		it('returns TrustMaterial instance', async () => {
			const result = await manager.getTrustMaterial();

			expect(result).toHaveProperty('certificateAuthorities');
			expect(result).toHaveProperty('timestampAuthorities');
			expect(result).toHaveProperty('tlogs');
			expect(result).toHaveProperty('ctlogs');
		});
	});

	describe('refreshTrustRoot', () => {
		it('forces fresh fetch ignoring cache', async () => {
			// First call fetches and caches
			await manager.getTrustedRoot();
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Refresh forces new fetch
			await manager.refreshTrustRoot();
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe('clearCache', () => {
		it('removes cache file', async () => {
			// Create cache
			await manager.getTrustedRoot();

			// Clear cache
			await manager.clearCache();

			// Next call should fetch again
			mockFetch.mockClear();
			await manager.getTrustedRoot();
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('handles missing cache file gracefully', async () => {
			// Clear cache when no cache exists
			await expect(manager.clearCache()).resolves.not.toThrow();
		});
	});

	describe('default instance', () => {
		it('getDefaultTrustMaterial works', async () => {
			const result = await getDefaultTrustMaterial();

			expect(result).toHaveProperty('certificateAuthorities');
			expect(mockFetch).toHaveBeenCalledWith(
				'https://tuf-repo-cdn.sigstore.dev/targets/trusted_root.json',
				expect.any(Object),
			);
		});
	});

	describe('configuration options', () => {
		it('uses custom trust bundle URL', async () => {
			const customManager = new TrustRootManager({
				cacheDir: tempCacheDir,
				trustBundleUrl: 'https://custom.example.com/trusted_root.json',
			});

			await customManager.getTrustedRoot();

			expect(mockFetch).toHaveBeenCalledWith(
				'https://custom.example.com/trusted_root.json',
				expect.any(Object),
			);
		});

		it('respects custom cache TTL', async () => {
			const longTtlManager = new TrustRootManager({
				cacheDir: tempCacheDir,
				cacheTtlHours: 168, // 1 week
			});

			await longTtlManager.getTrustedRoot();

			// Cache should still be valid
			await longTtlManager.getTrustedRoot();
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});
});
