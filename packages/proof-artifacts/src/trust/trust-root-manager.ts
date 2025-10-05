import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { type TrustMaterial, toTrustMaterial } from '@sigstore/verify';

export interface TrustRootCache {
	trustedRoot: Record<string, unknown>;
	fetchedAt: string;
	expiresAt: string;
}

export interface TrustRootManagerOptions {
	/** Cache directory for trust bundles. Defaults to ~/.cortex-os/sigstore-trust */
	cacheDir?: string;
	/** Trust bundle URL. Defaults to official Sigstore public good instance */
	trustBundleUrl?: string;
	/** Cache TTL in hours. Defaults to 24 hours */
	cacheTtlHours?: number;
	/** Fetch timeout in milliseconds. Defaults to 30 seconds */
	fetchTimeoutMs?: number;
}

export class TrustRootManager {
	private readonly cacheDir: string;
	private readonly trustBundleUrl: string;
	private readonly cacheTtlMs: number;
	private readonly fetchTimeoutMs: number;

	private static readonly DEFAULT_TRUST_BUNDLE_URL =
		'https://tuf-repo-cdn.sigstore.dev/targets/trusted_root.json';

	constructor(options: TrustRootManagerOptions = {}) {
		this.cacheDir = options.cacheDir ?? join(homedir(), '.cortex-os', 'sigstore-trust');
		this.trustBundleUrl = options.trustBundleUrl ?? TrustRootManager.DEFAULT_TRUST_BUNDLE_URL;
		this.cacheTtlMs = (options.cacheTtlHours ?? 24) * 60 * 60 * 1000;
		this.fetchTimeoutMs = options.fetchTimeoutMs ?? 30000;
	}

	async getTrustMaterial(): Promise<TrustMaterial> {
		const trustedRoot = await this.getTrustedRoot();
		return toTrustMaterial(trustedRoot as never);
	}

	async getTrustedRoot(): Promise<Record<string, unknown>> {
		const cached = await this.getCachedTrustRoot();

		if (cached && this.isCacheValid(cached)) {
			return cached.trustedRoot;
		}

		const freshRoot = await this.fetchTrustedRoot();
		await this.cacheTrustedRoot(freshRoot);
		return freshRoot;
	}

	async refreshTrustRoot(): Promise<Record<string, unknown>> {
		const freshRoot = await this.fetchTrustedRoot();
		await this.cacheTrustedRoot(freshRoot);
		return freshRoot;
	}

	async clearCache(): Promise<void> {
		const cacheFile = this.getCacheFilePath();
		try {
			const { unlink } = await import('node:fs/promises');
			await unlink(cacheFile);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				throw error;
			}
		}
	}

	private async getCachedTrustRoot(): Promise<TrustRootCache | null> {
		const cacheFile = this.getCacheFilePath();

		if (!existsSync(cacheFile)) {
			return null;
		}

		try {
			const cacheContent = await readFile(cacheFile, 'utf-8');
			const cache = JSON.parse(cacheContent) as TrustRootCache;

			if (!cache.trustedRoot || !cache.fetchedAt || !cache.expiresAt) {
				return null;
			}

			return cache;
		} catch {
			return null;
		}
	}

	private isCacheValid(cache: TrustRootCache): boolean {
		const now = new Date();
		const expiresAt = new Date(cache.expiresAt);
		return now < expiresAt;
	}

	private async fetchTrustedRoot(): Promise<Record<string, unknown>> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.fetchTimeoutMs);

		try {
			const response = await fetch(this.trustBundleUrl, {
				signal: controller.signal,
				headers: {
					'User-Agent': 'cortex-os-proof-artifacts/0.1.0 (brAInwav)',
					Accept: 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch trust root: ${response.status} ${response.statusText}`);
			}

			const trustedRoot = (await response.json()) as Record<string, unknown>;

			if (!trustedRoot || typeof trustedRoot !== 'object') {
				throw new Error('Invalid trusted root: not a valid JSON object');
			}

			if (
				!('mediaType' in trustedRoot) ||
				!('tlogs' in trustedRoot) ||
				!('certificateAuthorities' in trustedRoot)
			) {
				throw new Error(
					'Invalid trusted root: missing required fields (mediaType, tlogs, certificateAuthorities)',
				);
			}

			return trustedRoot;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private async cacheTrustedRoot(trustedRoot: Record<string, unknown>): Promise<void> {
		await mkdir(this.cacheDir, { recursive: true });

		const now = new Date();
		const expiresAt = new Date(now.getTime() + this.cacheTtlMs);

		const cache: TrustRootCache = {
			trustedRoot,
			fetchedAt: now.toISOString(),
			expiresAt: expiresAt.toISOString(),
		};

		const cacheFile = this.getCacheFilePath();
		await writeFile(cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
	}

	private getCacheFilePath(): string {
		return join(this.cacheDir, 'trusted_root_cache.json');
	}
}

export const defaultTrustRootManager = new TrustRootManager();

export async function getDefaultTrustMaterial(): Promise<TrustMaterial> {
	return defaultTrustRootManager.getTrustMaterial();
}
