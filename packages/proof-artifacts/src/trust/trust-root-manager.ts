import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { access } from 'node:fs/promises';
import os from 'node:os';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { toTrustMaterial, type TrustMaterial } from '@sigstore/verify';

const BRAND = '[brAInwav]';
const DEFAULT_TRUST_BUNDLE_URL = 'https://tuf-repo-cdn.sigstore.dev/targets/trusted_root.json';
const DEFAULT_CACHE_SUBDIR = join('.cortex-os', 'sigstore-trust');
const DEFAULT_CACHE_FILENAME = 'trusted_root_cache.json';
const DEFAULT_CACHE_TTL_HOURS = 24;

type Fetcher = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

interface StoredTrustRootCache {
	bundle: Record<string, unknown>;
	fetchedAt: string;
	expiresAt: string;
}

export interface TrustRootCache {
	fetchedAt: Date;
	expiresAt: Date;
	bundle: Record<string, unknown>;
}

export interface TrustRootManagerOptions {
	cacheDir?: string;
	cacheFile?: string;
	cacheTtlHours?: number;
	trustBundleUrl?: string;
	fetcher?: Fetcher;
	clock?: () => Date;
}

export interface GetTrustMaterialOptions {
	forceRefresh?: boolean;
	signal?: AbortSignal;
}

export class TrustRootManager {
	private readonly cacheDir: string;
	private readonly cacheFile: string;
	private readonly cacheTtlHours: number;
	private readonly trustBundleUrl: string;
	private readonly fetcher: Fetcher;
	private readonly clock: () => Date;

	constructor(options: TrustRootManagerOptions = {}) {
		const homeDir = os.homedir();
		const resolvedDir = options.cacheDir
			? resolvePath(options.cacheDir)
			: resolvePath(homeDir, DEFAULT_CACHE_SUBDIR);

		this.cacheDir = resolvedDir;
		this.cacheFile = resolvePath(
			resolvedDir,
			options.cacheFile ?? DEFAULT_CACHE_FILENAME,
		);
		this.cacheTtlHours = options.cacheTtlHours ?? DEFAULT_CACHE_TTL_HOURS;
		this.trustBundleUrl = options.trustBundleUrl ?? DEFAULT_TRUST_BUNDLE_URL;
		this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
		this.clock = options.clock ?? (() => new Date());
	}

	async getTrustMaterial(options: GetTrustMaterialOptions = {}): Promise<TrustMaterial> {
		if (!options.forceRefresh) {
			const cached = await this.readCache();
			if (cached && !this.isExpired(cached)) {
				return toTrustMaterial(cached.bundle as never);
			}
		}

		const bundle = await this.fetchTrustBundle(options.signal);
		await this.persistCache(bundle);
		return toTrustMaterial(bundle as never);
	}

	async refreshTrustRoot(options?: GetTrustMaterialOptions): Promise<TrustMaterial> {
		return this.getTrustMaterial({ ...(options ?? {}), forceRefresh: true });
	}

	async clearCache(): Promise<void> {
		try {
			await rm(this.cacheFile, { force: true });
		} catch (error) {
			throw new Error(
				`${BRAND} failed to clear trust root cache at ${this.cacheFile}: ${(error as Error).message}`,
				{ cause: error },
			);
		}
	}

	async getCachedTrustRoot(): Promise<TrustRootCache | undefined> {
		const stored = await this.readCache();
		if (!stored) {
			return undefined;
		}
		return {
			bundle: stored.bundle,
			fetchedAt: new Date(stored.fetchedAt),
			expiresAt: new Date(stored.expiresAt),
		};
	}

	private async readCache(): Promise<StoredTrustRootCache | undefined> {
		try {
			await access(this.cacheFile, fsConstants.F_OK | fsConstants.R_OK);
		} catch {
			return undefined;
		}

		try {
			const contents = await readFile(this.cacheFile, 'utf8');
			const parsed = JSON.parse(contents) as StoredTrustRootCache;
			if (
				typeof parsed !== 'object' ||
				parsed === null ||
				typeof parsed.fetchedAt !== 'string' ||
				typeof parsed.expiresAt !== 'string' ||
				typeof parsed.bundle !== 'object'
			) {
				return undefined;
			}
			return parsed;
		} catch (error) {
			throw new Error(
				`${BRAND} failed to read trust root cache at ${this.cacheFile}: ${(error as Error).message}`,
				{ cause: error },
			);
		}
	}

	private isExpired(cache: StoredTrustRootCache): boolean {
		const now = this.clock().getTime();
		const expiryTime = Date.parse(cache.expiresAt);
		if (Number.isNaN(expiryTime)) {
			return true;
		}
		return now >= expiryTime;
	}

	private async fetchTrustBundle(signal?: AbortSignal): Promise<Record<string, unknown>> {
		let response: Response;
		try {
			response = await this.fetcher(this.trustBundleUrl, { signal });
		} catch (error) {
			throw new Error(
				`${BRAND} failed to fetch Sigstore trust root from ${this.trustBundleUrl}: ${(error as Error).message}`,
				{ cause: error },
			);
		}

		if (!response.ok) {
			throw new Error(
				`${BRAND} trust root fetch failed with status ${response.status} (${response.statusText}) from ${this.trustBundleUrl}`,
			);
		}

		try {
			const data = (await response.json()) as Record<string, unknown>;
			return data;
		} catch (error) {
			throw new Error(
				`${BRAND} trust root response could not be parsed as JSON from ${this.trustBundleUrl}: ${(error as Error).message}`,
				{ cause: error },
			);
		}
	}

	private async persistCache(bundle: Record<string, unknown>): Promise<void> {
		const fetchedAt = this.clock();
		const expiresAt = new Date(fetchedAt.getTime() + this.cacheTtlHours * 60 * 60 * 1000);
		const payload: StoredTrustRootCache = {
			bundle,
			fetchedAt: fetchedAt.toISOString(),
			expiresAt: expiresAt.toISOString(),
		};

		try {
			await mkdir(dirname(this.cacheFile), { recursive: true });
			await writeFile(this.cacheFile, JSON.stringify(payload, null, 2), 'utf8');
		} catch (error) {
			throw new Error(
				`${BRAND} failed to persist trust root cache at ${this.cacheFile}: ${(error as Error).message}`,
				{ cause: error },
			);
		}
	}
}

const DEFAULT_MANAGER = new TrustRootManager();

export const defaultTrustRootManager = DEFAULT_MANAGER;

export async function getDefaultTrustMaterial(options?: GetTrustMaterialOptions): Promise<TrustMaterial> {
	return DEFAULT_MANAGER.getTrustMaterial(options);
}
