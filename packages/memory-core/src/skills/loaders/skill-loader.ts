/**
 * brAInwav Skill Loader
 * Loads, validates, and caches skills from file system
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/loaders/skill-loader
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { Skill } from '../types.js';
import { parseSkillFile } from './skill-parser.js';
import { validateSkill } from '../validators/skill-validator.js';
import { validateSecurityRules } from '../validators/security-validator.js';
import { validateEthicalCompliance } from '../validators/ethical-validator.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Skill loader options
 */
export interface SkillLoaderOptions {
	/** Enable skill caching */
	useCache?: boolean;
	/** Maximum cache size (number of skills) */
	cacheMaxSize?: number;
	/** Validate security rules */
	validateSecurity?: boolean;
	/** Validate ethical compliance */
	validateEthics?: boolean;
	/** Maximum file size in bytes */
	maxFileSize?: number;
}

/**
 * Single skill load result
 */
export interface LoaderResult {
	/** Whether load was successful */
	success: boolean;
	/** Loaded skill (if successful) */
	skill?: Skill;
	/** Error messages (if failed) */
	errors?: string[];
	/** File path */
	filePath: string;
	/** Loaded from cache */
	fromCache?: boolean;
}

/**
 * Batch load results
 */
export interface BatchLoaderResult {
	/** Successfully loaded skills */
	loaded: Skill[];
	/** Failed loads with errors */
	failed: Array<{ filePath: string; errors: string[] }>;
	/** Total files processed */
	total: number;
	/** Success rate (0-1) */
	successRate: number;
	/** Cache statistics */
	cacheStats?: CacheStats;
}

/**
 * Cache statistics
 */
export interface CacheStats {
	/** Cache hits */
	hits: number;
	/** Cache misses */
	misses: number;
	/** Current cache size */
	size: number;
	/** Hit rate (0-1) */
	hitRate: number;
}

/**
 * Cache entry
 */
interface CacheEntry {
	skill: Skill;
	mtime: number;
	accessCount: number;
	lastAccess: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_FILE_SIZE = 1024 * 1024; // 1MB
const DEFAULT_CACHE_SIZE = 1000;

// ============================================================================
// Cache Implementation (LRU)
// ============================================================================

class SkillCache {
	private cache = new Map<string, CacheEntry>();
	private maxSize: number;
	private hits = 0;
	private misses = 0;

	constructor(maxSize = DEFAULT_CACHE_SIZE) {
		this.maxSize = maxSize;
	}

	get(filePath: string, mtime: number): Skill | null {
		const entry = this.cache.get(filePath);

		if (!entry) {
			this.misses++;
			return null;
		}

		// Invalidate if file modified
		if (entry.mtime !== mtime) {
			this.cache.delete(filePath);
			this.misses++;
			return null;
		}

		// Update access stats
		entry.accessCount++;
		entry.lastAccess = Date.now();
		this.hits++;

		return entry.skill;
	}

	set(filePath: string, skill: Skill, mtime: number): void {
		// Evict LRU entry if cache full
		if (this.cache.size >= this.maxSize) {
			this.evictLRU();
		}

		this.cache.set(filePath, {
			skill,
			mtime,
			accessCount: 0,
			lastAccess: Date.now(),
		});
	}

	private evictLRU(): void {
		let oldestKey: string | null = null;
		let oldestAccess = Number.POSITIVE_INFINITY;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.lastAccess < oldestAccess) {
				oldestAccess = entry.lastAccess;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	getStats(): CacheStats {
		const total = this.hits + this.misses;
		return {
			hits: this.hits,
			misses: this.misses,
			size: this.cache.size,
			hitRate: total > 0 ? this.hits / total : 0,
		};
	}

	clear(): void {
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
	}
}

// Global cache instance
const globalCache = new SkillCache();

// ============================================================================
// Directory Scanning (TASK-018)
// ============================================================================

/**
 * Recursively scan directory for .md skill files
 *
 * @param dirPath - Directory path to scan
 * @returns Array of .md file paths
 *
 * @example
 * ```typescript
 * const files = await scanDirectory('./skills');
 * console.log(`Found ${files.length} skill files`);
 * ```
 */
export async function scanDirectory(dirPath: string): Promise<string[]> {
	const results: string[] = [];

	async function scan(currentPath: string): Promise<void> {
		const entries = await readdir(currentPath, { withFileTypes: true });

		for (const entry of entries) {
			// Skip hidden files/directories
			if (entry.name.startsWith('.')) {
				continue;
			}

			const fullPath = join(currentPath, entry.name);

			if (entry.isDirectory()) {
				// Recurse into subdirectories
				await scan(fullPath);
			} else if (entry.isFile() && entry.name.endsWith('.md')) {
				// Add .md files
				results.push(fullPath);
			}
		}
	}

	await scan(dirPath);
	return results;
}

// ============================================================================
// File Loading & Validation (TASK-019)
// ============================================================================

/**
 * Load and validate single skill file
 *
 * @param filePath - Path to skill file
 * @param options - Loader options
 * @returns Load result with skill or errors
 *
 * @example
 * ```typescript
 * const result = await loadSkill('./skills/tdd.md');
 * if (result.success) {
 *   console.log('Loaded:', result.skill.name);
 * } else {
 *   console.error('Errors:', result.errors);
 * }
 * ```
 */
export async function loadSkill(
	filePath: string,
	options: SkillLoaderOptions = {},
): Promise<LoaderResult> {
	const {
		useCache = false,
		validateSecurity = true,
		validateEthics = true,
		maxFileSize = DEFAULT_MAX_FILE_SIZE,
		cacheMaxSize = DEFAULT_CACHE_SIZE,
	} = options;

	try {
		// Check file size
		const stats = await stat(filePath);

		if (stats.size > maxFileSize) {
			return {
				success: false,
				errors: [
					`File size ${stats.size} exceeds maximum ${maxFileSize} bytes`,
				],
				filePath,
			};
		}

		// Check cache
		if (useCache) {
			const cached = globalCache.get(filePath, stats.mtimeMs);
			if (cached) {
				return {
					success: true,
					skill: cached,
					filePath,
					fromCache: true,
				};
			}
		}

		// Read file content
		const rawContent = await readFile(filePath, 'utf-8');

		// Parse skill file
		const parseResult = await parseSkillFile({
			filePath,
			fileName: basename(filePath),
			rawContent,
			fileSize: stats.size,
			lastModified: stats.mtime,
		});

		if (!parseResult.skill) {
			return {
				success: false,
				errors: parseResult.errors || ['Failed to parse skill file'],
				filePath,
			};
		}

		const skill = parseResult.skill;
		const errors: string[] = [];

		// Validate schema
		const schemaResult = validateSkill(skill);
		if (!schemaResult.valid) {
			errors.push(
				...schemaResult.errors.map(
					(e) => `Schema: ${e.path.join('.')}: ${e.message}`,
				),
			);
		}

		// Validate security
		if (validateSecurity) {
			const securityViolations = validateSecurityRules(skill);
			if (securityViolations.length > 0) {
				errors.push(
					...securityViolations.map(
						(v) => `Security (${v.severity}): ${v.message}`,
					),
				);
			}
		}

		// Validate ethics
		if (validateEthics) {
			const ethicalViolations = validateEthicalCompliance(skill);
			const highSeverity = ethicalViolations.filter(
				(v) => v.severity === 'high' || v.severity === 'critical',
			);
			if (highSeverity.length > 0) {
				errors.push(
					...highSeverity.map((v) => `Ethics (${v.severity}): ${v.message}`),
				);
			}
		}

		// Return errors if validation failed
		if (errors.length > 0) {
			return {
				success: false,
				errors,
				filePath,
			};
		}

		// Cache successful load
		if (useCache) {
			globalCache.set(filePath, skill, stats.mtimeMs);
		}

		return {
			success: true,
			skill,
			filePath,
			fromCache: false,
		};
	} catch (error) {
		return {
			success: false,
			errors: [
				error instanceof Error
					? error.message
					: 'Unknown error loading skill',
			],
			filePath,
		};
	}
}

/**
 * Load all skills from directory
 *
 * @param dirPath - Directory path
 * @param options - Loader options
 * @returns Batch load results
 *
 * @example
 * ```typescript
 * const results = await loadSkillsFromDirectory('./skills', {
 *   useCache: true,
 *   validateSecurity: true
 * });
 * console.log(`Loaded: ${results.loaded.length}/${results.total}`);
 * ```
 */
export async function loadSkillsFromDirectory(
	dirPath: string,
	options: SkillLoaderOptions = {},
): Promise<BatchLoaderResult> {
	const files = await scanDirectory(dirPath);
	const loaded: Skill[] = [];
	const failed: Array<{ filePath: string; errors: string[] }> = [];

	// Load all files
	const results = await Promise.all(
		files.map((filePath) => loadSkill(filePath, options)),
	);

	// Separate successful and failed
	for (const result of results) {
		if (result.success && result.skill) {
			loaded.push(result.skill);
		} else if (result.errors) {
			failed.push({
				filePath: result.filePath,
				errors: result.errors,
			});
		}
	}

	const total = files.length;
	const successRate = total > 0 ? loaded.length / total : 0;

	return {
		loaded,
		failed,
		total,
		successRate,
		cacheStats: options.useCache ? globalCache.getStats() : undefined,
	};
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear skill cache
 */
export function clearCache(): void {
	globalCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
	return globalCache.getStats();
}
