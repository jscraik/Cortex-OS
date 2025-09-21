/**
 * @file Registry Service
 * @description Handles registry management and caching
 */

import { constants as fsConstants } from 'node:fs';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RegistryIndex } from '@cortex-os/mcp-registry';

export interface RegistryConfig {
	registries: Record<string, string>;
	cacheDir: string;
	cacheTtl: number;
	fetchTimeout?: number;
}

export interface RegistryInfo {
	name: string;
	url: string;
	healthy: boolean;
	lastUpdated?: string;
	serverCount?: number;
}

/**
 * Registry Service
 * Manages registry data fetching and caching
 */
export class RegistryService {
	private config: RegistryConfig;
	private cache = new Map<string, { data: RegistryIndex; timestamp: number }>();

	constructor(config: RegistryConfig) {
		this.config = config;
		void this.ensureCacheDir();
	}

	/**
	 * List available registries
	 */
	async listRegistries(): Promise<RegistryInfo[]> {
		const registries: RegistryInfo[] = [];

		for (const [name, url] of Object.entries(this.config.registries)) {
			const info: RegistryInfo = {
				name,
				url,
				healthy: false,
			};

			try {
				// Try to get cached data first
				const data = await this.getRegistry(name);
				if (data) {
					info.healthy = true;
					info.lastUpdated = data.updatedAt;
					info.serverCount = data.servers.length;
				}
			} catch (error) {
				console.warn('Registry health check failed', { name, error });
			}

			registries.push(info);
		}

		return registries;
	}

	/**
	 * Get registry data with caching
	 */
	async getRegistry(name: string): Promise<RegistryIndex | null> {
		const url = this.config.registries[name];
		if (!url) {
			throw new Error(`Registry '${name}' not found`);
		}

		// Check memory cache first
		const cached = this.cache.get(name);
		if (cached && Date.now() - cached.timestamp < this.config.cacheTtl) {
			return cached.data;
		}

		// Check disk cache
		const diskCached = await this.loadFromDisk(name);
		if (diskCached && Date.now() - diskCached.timestamp < this.config.cacheTtl) {
			this.cache.set(name, diskCached);
			return diskCached.data;
		}

		// Fetch from remote
		try {
			const data = await this.fetchRegistry(url);
			const cacheEntry = { data, timestamp: Date.now() };

			// Update caches
			this.cache.set(name, cacheEntry);
			await this.saveToDisk(name, cacheEntry);

			return data;
		} catch (error) {
			// If fetch fails, return stale cache if available
			if (diskCached) {
				console.warn('Using stale cache for registry due to fetch error', {
					name,
					error,
				});
				return diskCached.data;
			}
			throw error;
		}
	}

	/**
	 * Get registry health status
	 */
	async getRegistryStatus(
		name: string,
	): Promise<{ healthy: boolean; lastUpdated?: string; error?: string }> {
		try {
			const data = await this.getRegistry(name);
			return {
				healthy: true,
				lastUpdated: data?.updatedAt,
			};
		} catch (error) {
			return {
				healthy: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Refresh registry cache
	 */
	async refreshRegistry(name: string): Promise<void> {
		// Clear caches
		this.cache.delete(name);
		await this.removeFromDisk(name);

		// Force refetch
		await this.getRegistry(name);
	}

	/**
	 * Refresh all registries
	 */
	async refreshAll(): Promise<void> {
		const registries = Object.keys(this.config.registries);
		await Promise.all(registries.map((name) => this.refreshRegistry(name)));
	}

	/**
	 * Fetch registry data from URL
	 */
	private async fetchRegistry(url: string): Promise<RegistryIndex> {
		if (url.startsWith('file://')) {
			const fileUrl = new URL(url);
			const content = await readFile(fileUrl, 'utf-8');
			return JSON.parse(content) as RegistryIndex;
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.config.fetchTimeout ?? 10000);

		try {
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'Cortex-OS-Marketplace/1.0',
					Accept: 'application/json',
				},
				signal: controller.signal,
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch registry: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			if (!data || typeof data !== 'object') {
				throw new Error('Invalid registry data: not an object');
			}

			if (!Array.isArray(data.servers)) {
				throw new Error('Invalid registry data: servers must be an array');
			}

			return data as RegistryIndex;
		} finally {
			clearTimeout(timeout);
		}
	}

	/**
	 * Load registry data from disk cache
	 */
	private async loadFromDisk(
		name: string,
	): Promise<{ data: RegistryIndex; timestamp: number } | null> {
		const cachePath = this.getCachePath(name);

		try {
			await access(cachePath, fsConstants.F_OK);
		} catch {
			return null;
		}

		try {
			const content = await readFile(cachePath, 'utf-8');
			const cached = JSON.parse(content);

			if (!cached.data || !cached.timestamp) {
				return null;
			}

			return cached;
		} catch (error) {
			console.warn(`Failed to load disk cache for ${name}:`, error);
			return null;
		}
	}

	/**
	 * Save registry data to disk cache
	 */
	private async saveToDisk(
		name: string,
		cacheEntry: { data: RegistryIndex; timestamp: number },
	): Promise<void> {
		const cachePath = this.getCachePath(name);

		try {
			await writeFile(cachePath, JSON.stringify(cacheEntry, null, 2));
		} catch (error) {
			console.warn('Failed to save disk cache', { name, error });
		}
	}

	/**
	 * Remove registry data from disk cache
	 */
	private async removeFromDisk(name: string): Promise<void> {
		const cachePath = this.getCachePath(name);

		try {
			await unlink(cachePath);
		} catch {
			// Ignore errors (file might not exist)
		}
	}

	/**
	 * Get cache file path for registry
	 */
	private getCachePath(name: string): string {
		return path.join(this.config.cacheDir, `registry-${name}.json`);
	}

	/**
	 * Ensure cache directory exists
	 */
	private async ensureCacheDir(): Promise<void> {
		try {
			await mkdir(this.config.cacheDir, { recursive: true });
		} catch (error) {
			console.warn('Failed to create cache directory:', error);
		}
	}
}
