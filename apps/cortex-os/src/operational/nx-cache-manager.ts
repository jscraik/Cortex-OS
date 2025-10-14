import { execSync, spawn } from 'node:child_process';
import { existsSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/**
 * brAInwav Nx Cache Manager for optimal build performance
 * Implements intelligent cache cleanup and monitoring
 */
export class NxCacheManager {
	private readonly nxCacheDir: string;
	private readonly maxCacheSize: number; // bytes
	private readonly maxCacheAge: number; // milliseconds
	private cleanupTimer: NodeJS.Timer | null = null;

	constructor(options: CacheManagerOptions = {}) {
		this.nxCacheDir = options.cacheDir || join(process.cwd(), '.nx', 'cache');
		this.maxCacheSize = options.maxSizeBytes || 5 * 1024 * 1024 * 1024; // 5GB default
		this.maxCacheAge = options.maxAgeMs || 7 * 24 * 60 * 60 * 1000; // 7 days default
		
		if (options.autoCleanup !== false) {
			this.startAutoCleanup(options.cleanupInterval || 60 * 60 * 1000); // 1 hour default
		}
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): CacheStats {
		if (!existsSync(this.nxCacheDir)) {
			return {
				exists: false,
				sizeBytes: 0,
				fileCount: 0,
				oldestFile: null,
				newestFile: null,
				utilizationPercent: 0,
			};
		}

		const files = this.getAllCacheFiles();
		const totalSize = files.reduce((sum, file) => sum + file.size, 0);
		const fileTimes = files.map(f => f.mtime).sort((a, b) => a - b);

		return {
			exists: true,
			sizeBytes: totalSize,
			fileCount: files.length,
			oldestFile: fileTimes.length > 0 ? new Date(fileTimes[0]) : null,
			newestFile: fileTimes.length > 0 ? new Date(fileTimes[fileTimes.length - 1]) : null,
			utilizationPercent: (totalSize / this.maxCacheSize) * 100,
		};
	}

	/**
	 * Clean cache based on age and size limits
	 */
	async cleanCache(options: CleanOptions = {}): Promise<CleanResult> {
		const stats = this.getCacheStats();
		if (!stats.exists) {
			return {
				initialSize: 0,
				finalSize: 0,
				filesRemoved: 0,
				spaceSaved: 0,
				strategy: 'none',
			};
		}

		const initialSize = stats.sizeBytes;
		let filesRemoved = 0;
		let strategy: CleanStrategy = 'none';

		try {
			if (options.force || this.shouldCleanByAge()) {
				strategy = 'age-based';
				filesRemoved += await this.cleanByAge();
			}

			if (options.force || this.shouldCleanBySize()) {
				strategy = strategy === 'age-based' ? 'age-and-size' : 'size-based';
				filesRemoved += await this.cleanBySize();
			}

			if (options.reset) {
				strategy = 'full-reset';
				await this.resetCache();
				filesRemoved = stats.fileCount;
			}

			const finalStats = this.getCacheStats();
			return {
				initialSize,
				finalSize: finalStats.sizeBytes,
				filesRemoved,
				spaceSaved: initialSize - finalStats.sizeBytes,
				strategy,
			};
		} catch (error) {
			console.error('[brAInwav] Cache cleanup failed:', error);
			throw error;
		}
	}

	/**
	 * Reset the entire Nx cache
	 */
	async resetCache(): Promise<void> {
		try {
			// Use nx reset command first
			execSync('npx nx reset', { 
				stdio: 'pipe',
				timeout: 30000,
				env: { ...process.env, NX_INTERACTIVE: 'false' }
			});
			console.log('[brAInwav] Nx cache reset completed');
		} catch (error) {
			console.warn('[brAInwav] nx reset failed, falling back to manual cleanup:', error);
			
			// Fallback to manual cleanup
			if (existsSync(this.nxCacheDir)) {
				rmSync(this.nxCacheDir, { recursive: true, force: true });
			}
		}
	}

	/**
	 * Start automatic cache cleanup
	 */
	private startAutoCleanup(interval: number): void {
		this.cleanupTimer = setInterval(async () => {
			try {
				const result = await this.cleanCache();
				if (result.filesRemoved > 0) {
					console.log(`[brAInwav] Auto cache cleanup: ${result.filesRemoved} files, ${this.formatBytes(result.spaceSaved)} saved`);
				}
			} catch (error) {
				console.error('[brAInwav] Auto cache cleanup failed:', error);
			}
		}, interval);
	}

	/**
	 * Stop automatic cleanup
	 */
	stopAutoCleanup(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}
	}

	/**
	 * Check if cache should be cleaned by age
	 */
	private shouldCleanByAge(): boolean {
		const stats = this.getCacheStats();
		if (!stats.exists || !stats.oldestFile) return false;
		
		const oldestAge = Date.now() - stats.oldestFile.getTime();
		return oldestAge > this.maxCacheAge;
	}

	/**
	 * Check if cache should be cleaned by size
	 */
	private shouldCleanBySize(): boolean {
		const stats = this.getCacheStats();
		return stats.exists && stats.sizeBytes > this.maxCacheSize;
	}

	/**
	 * Clean cache files by age
	 */
	private async cleanByAge(): Promise<number> {
		const files = this.getAllCacheFiles();
		const cutoffTime = Date.now() - this.maxCacheAge;
		let removed = 0;

		for (const file of files) {
			if (file.mtime < cutoffTime) {
				try {
					rmSync(file.path, { force: true });
					removed++;
				} catch (error) {
					console.warn(`[brAInwav] Failed to remove old cache file ${file.path}:`, error);
				}
			}
		}

		return removed;
	}

	/**
	 * Clean cache files by size (LRU strategy)
	 */
	private async cleanBySize(): Promise<number> {
		const files = this.getAllCacheFiles();
		
		// Sort by last access time (oldest first)
		files.sort((a, b) => a.atime - b.atime);
		
		let currentSize = files.reduce((sum, file) => sum + file.size, 0);
		let removed = 0;

		// Remove oldest files until under size limit
		for (const file of files) {
			if (currentSize <= this.maxCacheSize) break;
			
			try {
				rmSync(file.path, { force: true });
				currentSize -= file.size;
				removed++;
			} catch (error) {
				console.warn(`[brAInwav] Failed to remove cache file ${file.path}:`, error);
			}
		}

		return removed;
	}

	/**
	 * Get all cache files with metadata
	 */
	private getAllCacheFiles(): CacheFile[] {
		if (!existsSync(this.nxCacheDir)) return [];

		const files: CacheFile[] = [];
		
		const scanDirectory = (dir: string): void => {
			try {
				const entries = require('fs').readdirSync(dir, { withFileTypes: true });
				
				for (const entry of entries) {
					const fullPath = join(dir, entry.name);
					
					if (entry.isDirectory()) {
						scanDirectory(fullPath);
					} else {
						const stats = statSync(fullPath);
						files.push({
							path: fullPath,
							size: stats.size,
							mtime: stats.mtime.getTime(),
							atime: stats.atime.getTime(),
						});
					}
				}
			} catch (error) {
				console.warn(`[brAInwav] Failed to scan cache directory ${dir}:`, error);
			}
		};

		scanDirectory(this.nxCacheDir);
		return files;
	}

	/**
	 * Format bytes for human readable output
	 */
	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
	}
}

export interface CacheManagerOptions {
	cacheDir?: string;
	maxSizeBytes?: number;
	maxAgeMs?: number;
	autoCleanup?: boolean;
	cleanupInterval?: number;
}

export interface CacheStats {
	exists: boolean;
	sizeBytes: number;
	fileCount: number;
	oldestFile: Date | null;
	newestFile: Date | null;
	utilizationPercent: number;
}

export interface CleanOptions {
	force?: boolean;
	reset?: boolean;
}

export interface CleanResult {
	initialSize: number;
	finalSize: number;
	filesRemoved: number;
	spaceSaved: number;
	strategy: CleanStrategy;
}

type CleanStrategy = 'none' | 'age-based' | 'size-based' | 'age-and-size' | 'full-reset';

interface CacheFile {
	path: string;
	size: number;
	mtime: number;
	atime: number;
}