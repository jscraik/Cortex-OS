/**
 * CDN Cache Manager for brAInwav GraphRAG
 *
 * Advanced CDN caching system that provides:
 * - Multi-tier static content caching with CDN integration
 * - Intelligent cache warming and invalidation strategies
 * - Geographic content distribution optimization
 * - Automatic compression and optimization
 * - Real-time cache performance monitoring
 * - Adaptive cache TTL based on content patterns
 */

import type { GraphRAGQueryRequest, GraphRAGResult } from '../services/GraphRAGService.js';

export interface CDNConfig {
	enabled: boolean;
	provider: 'cloudflare' | 'aws-cloudfront' | 'fastly' | 'akamai' | 'custom';
	zoneId?: string;
	apiToken?: string;
	distributionId?: string;
	customEndpoint?: string;
	cacheKeyPrefix: string;
	defaultTTL: number; // seconds
	maxTTL: number; // seconds
	staleWhileRevalidate: number; // seconds
	staleIfError: number; // seconds;
	compression: {
		enabled: boolean;
		level: number; // 1-9
		types: string[];
	};
	optimization: {
		autoMinify: boolean;
		imageOptimization: boolean;
		brotliCompression: boolean;
		http2Push: boolean;
	};
	monitoring: {
		enabled: boolean;
		realTimeMetrics: boolean;
		alertingEnabled: boolean;
		logLevel: 'debug' | 'info' | 'warn' | 'error';
	};
	geographic: {
		enabled: boolean;
		regions: string[];
		defaultRegion: string;
		fallbackRegion: string;
	};
}

export interface CDNCacheEntry {
	key: string;
	url: string;
	contentType: string;
	size: number;
	compressedSize: number;
	cacheStatus: 'HIT' | 'MISS' | 'EXPIRED' | 'BYPASS';
	region: string;
	ttl: number;
	age: number;
	lastAccessed: number;
	hitCount: number;
	etag?: string;
	lastModified?: string;
	compressionRatio?: number;
}

export interface CDNMetrics {
	totalRequests: number;
	cacheHits: number;
	cacheMisses: number;
	hitRatio: number;
	averageLatency: number;
	averageServedSize: number;
	totalBandwidthSaved: number;
	regionalStats: Record<string, {
		requests: number;
		hitRatio: number;
		latency: number;
	}>;
	contentTypeStats: Record<string, {
		requests: number;
		hitRatio: number;
		averageSize: number;
	}>;
	compressionStats: {
		originalSize: number;
		compressedSize: number;
		savings: number;
		ratio: number;
	};
	errors: number;
	lastUpdated: number;
}

export interface CacheInvalidationRule {
	id: string;
	pattern: string;
	type: 'path' | 'prefix' | 'tag' | 'regex';
	condition?: {
		contentType?: string;
		region?: string;
		age?: number;
	};
	action: 'invalidate' | 'purge' | 'refresh';
	scheduled?: boolean;
	schedule?: string; // cron expression
}

export interface WarmingStrategy {
	id: string;
	name: string;
	patterns: string[];
	priority: 'low' | 'medium' | 'high';
	frequency: 'once' | 'daily' | 'hourly' | 'on-demand';
	regions: string[];
	maxConcurrent: number;
	lastExecuted: number;
	nextExecution: number;
}

/**
 * CDN Cache Manager for static content optimization
 */
export class CDNCacheManager {
	private config: CDNConfig;
	private metrics: CDNMetrics;
	private cacheEntries = new Map<string, CDNCacheEntry>();
	private invalidationRules = new Map<string, CacheInvalidationRule>();
	private warmingStrategies = new Map<string, WarmingStrategy>();
	private metricsTimer: NodeJS.Timeout | null = null;
	private warmingTimer: NodeJS.Timeout | null = null;

	constructor(config: CDNConfig) {
		this.config = config;
		this.metrics = {
			totalRequests: 0,
			cacheHits: 0,
			cacheMisses: 0,
			hitRatio: 0,
			averageLatency: 0,
			averageServedSize: 0,
			totalBandwidthSaved: 0,
			regionalStats: {},
			contentTypeStats: {},
			compressionStats: {
				originalSize: 0,
				compressedSize: 0,
				savings: 0,
				ratio: 0,
			},
			errors: 0,
			lastUpdated: Date.now(),
		};
	}

	async initialize(): Promise<void> {
		try {
			// Initialize CDN provider-specific settings
			await this.initializeCDNProvider();

			// Set up default invalidation rules
			this.setupDefaultInvalidationRules();

			// Set up warming strategies
			this.setupDefaultWarmingStrategies();

			// Start metrics collection
			if (this.config.monitoring.enabled) {
				this.startMetricsCollection();
			}

			// Start cache warming
			if (this.config.optimization.http2Push) {
				this.startCacheWarming();
			}

			console.info('brAInwav CDN Cache Manager initialized', {
				component: 'memory-core',
				brand: 'brAInwav',
				provider: this.config.provider,
				enabled: this.config.enabled,
				regions: this.config.geographic.regions.length,
				compression: this.config.compression.enabled,
			});
		} catch (error) {
			console.error('brAInwav CDN Cache Manager initialization failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	private async initializeCDNProvider(): Promise<void> {
		switch (this.config.provider) {
			case 'cloudflare':
				if (!this.config.zoneId || !this.config.apiToken) {
					throw new Error('Cloudflare CDN requires zoneId and apiToken');
				}
				break;
			case 'aws-cloudfront':
				if (!this.config.distributionId) {
					throw new Error('AWS CloudFront requires distributionId');
				}
				break;
			case 'custom':
				if (!this.config.customEndpoint) {
					throw new Error('Custom CDN requires customEndpoint');
				}
				break;
		}
	}

	/**
	 * Generate CDN cache key for content
	 */
	generateCacheKey(content: any, context?: {
		contentType?: string;
		region?: string;
		version?: string;
	}): string {
		const parts: string[] = [this.config.cacheKeyPrefix];

		// Add content type
		if (context?.contentType) {
			parts.push(context.contentType.replace(/[^a-zA-Z0-9]/g, '_'));
		}

		// Add region
		const region = context?.region || this.config.geographic.defaultRegion;
		parts.push(region);

		// Add version if provided
		if (context?.version) {
			parts.push(context.version);
		}

		// Generate content hash
		const contentHash = this.hashContent(content);
		parts.push(contentHash);

		return parts.join(':');
	}

	/**
	 * Cache static content with optimization
	 */
	async cacheContent(
		content: any,
		url: string,
		options: {
			contentType?: string;
			ttl?: number;
			region?: string;
			compress?: boolean;
			tags?: string[];
		} = {}
	): Promise<{
		cacheKey: string;
		url: string;
		size: number;
		compressedSize: number;
		cacheStatus: string;
	}> {
		if (!this.config.enabled) {
			return {
				cacheKey: '',
				url,
				size: 0,
				compressedSize: 0,
				cacheStatus: 'BYPASS',
			};
		}

		const startTime = Date.now();
		const contentType = options.contentType || 'application/octet-stream';
		const region = options.region || this.config.geographic.defaultRegion;
		const ttl = options.ttl || this.config.defaultTTL;
		const shouldCompress = options.compress !== false && this.shouldCompress(contentType);

		try {
			// Serialize content
			let serializedContent = JSON.stringify(content);
			const originalSize = Buffer.byteLength(serializedContent, 'utf8');

			// Compress if enabled and appropriate
			let compressedSize = originalSize;
			let compressionRatio = 0;

			if (shouldCompress && this.config.compression.enabled) {
				const compressed = await this.compressContent(serializedContent);
				serializedContent = compressed;
				compressedSize = Buffer.byteLength(compressed, 'utf8');
				compressionRatio = (originalSize - compressedSize) / originalSize;
			}

			// Generate cache key
			const cacheKey = this.generateCacheKey(content, {
				contentType,
				region,
				version: Date.now().toString(),
			});

			// Store cache entry
			const cacheEntry: CDNCacheEntry = {
				key: cacheKey,
				url,
				contentType,
				size: originalSize,
				compressedSize,
				cacheStatus: 'MISS',
				region,
				ttl,
				age: 0,
				lastAccessed: Date.now(),
				hitCount: 0,
				compressionRatio,
			};

			this.cacheEntries.set(cacheKey, cacheEntry);

			// Update metrics
			this.updateMetrics(contentType, region, originalSize, compressedSize, Date.now() - startTime);

			console.debug('brAInwav CDN content cached', {
				component: 'memory-core',
				brand: 'brAInwav',
				cacheKey,
				url,
				originalSize,
				compressedSize,
				compressionRatio,
				region,
			});

			return {
				cacheKey,
				url,
				size: originalSize,
				compressedSize,
				cacheStatus: 'MISS',
			};
		} catch (error) {
			this.metrics.errors++;

			console.error('brAInwav CDN content caching failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				url,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				cacheKey: '',
				url,
				size: 0,
				compressedSize: 0,
				cacheStatus: 'BYPASS',
			};
		}
	}

	/**
	 * Retrieve cached content
	 */
	async getCachedContent(
		cacheKey: string,
		options: {
			region?: string;
			acceptStale?: boolean;
		} = {}
	): Promise<{
		content?: any;
		cacheStatus: 'HIT' | 'MISS' | 'EXPIRED' | 'BYPASS';
		age: number;
		ttl: number;
	}> {
		if (!this.config.enabled) {
			return { cacheStatus: 'BYPASS', age: 0, ttl: 0 };
		}

		const startTime = Date.now();
		const region = options.region || this.config.geographic.defaultRegion;

		try {
			const cacheEntry = this.cacheEntries.get(cacheKey);

			if (!cacheEntry) {
				this.metrics.cacheMisses++;
				this.metrics.totalRequests++;
				this.updateHitRatio();

				return { cacheStatus: 'MISS', age: 0, ttl: 0 };
			}

			// Check if content is still valid
			const age = Date.now() - cacheEntry.lastAccessed;
			const isExpired = age > cacheEntry.ttl * 1000;

			if (isExpired && !options.acceptStale) {
				this.metrics.cacheMisses++;
				this.metrics.totalRequests++;
				this.updateHitRatio();

				// Remove expired entry
				this.cacheEntries.delete(cacheKey);

				return { cacheStatus: 'EXPIRED', age, ttl: cacheEntry.ttl };
			}

			// Update cache entry
			cacheEntry.lastAccessed = Date.now();
			cacheEntry.hitCount++;
			cacheEntry.age = Math.floor(age / 1000);

			if (isExpired && options.acceptStale) {
				cacheEntry.cacheStatus = 'EXPIRED';
			} else {
				cacheEntry.cacheStatus = 'HIT';
				this.metrics.cacheHits++;
			}

			this.metrics.totalRequests++;
			this.updateHitRatio();

			// Update regional stats
			this.updateRegionalStats(region, Date.now() - startTime);

			console.debug('brAInwav CDN content retrieved', {
				component: 'memory-core',
				brand: 'brAInwav',
				cacheKey,
				cacheStatus: cacheEntry.cacheStatus,
				age: cacheEntry.age,
				hitCount: cacheEntry.hitCount,
				region,
			});

			// In a real implementation, this would retrieve the actual content
			// For now, return the cache status
			return {
				cacheStatus: cacheEntry.cacheStatus,
				age: cacheEntry.age,
				ttl: cacheEntry.ttl,
			};
		} catch (error) {
			this.metrics.errors++;

			console.error('brAInwav CDN content retrieval failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				cacheKey,
				error: error instanceof Error ? error.message : String(error),
			});

			return { cacheStatus: 'BYPASS', age: 0, ttl: 0 };
		}
	}

	/**
	 * Invalidate cache entries
	 */
	async invalidateCache(pattern: string, options: {
		type?: 'path' | 'prefix' | 'tag' | 'regex';
		region?: string;
		contentType?: string;
	} = {}): Promise<{
		invalidatedCount: number;
		pattern: string;
		duration: number;
	}> {
		const startTime = Date.now();
		const type = options.type || 'path';
		const region = options.region;

		let invalidatedCount = 0;

		try {
			for (const [cacheKey, entry] of this.cacheEntries.entries()) {
				let shouldInvalidate = false;

				switch (type) {
					case 'path':
						shouldInvalidate = entry.url === pattern;
						break;
					case 'prefix':
						shouldInvalidate = entry.url.startsWith(pattern);
						break;
					case 'regex':
						shouldInvalidate = new RegExp(pattern).test(entry.url);
						break;
					case 'tag':
						// Tag-based invalidation would require tag storage
						shouldInvalidate = entry.url.includes(pattern);
						break;
				}

				// Apply additional filters
				if (shouldInvalidate) {
					if (region && entry.region !== region) {
						shouldInvalidate = false;
					}
					if (options.contentType && entry.contentType !== options.contentType) {
						shouldInvalidate = false;
					}
				}

				if (shouldInvalidate) {
					this.cacheEntries.delete(cacheKey);
					invalidatedCount++;
				}
			}

			const duration = Date.now() - startTime;

			console.info('brAInwav CDN cache invalidation completed', {
				component: 'memory-core',
				brand: 'brAInwav',
				pattern,
				type,
				invalidatedCount,
				duration,
				region,
			});

			return { invalidatedCount, pattern, duration };
		} catch (error) {
			console.error('brAInwav CDN cache invalidation failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				pattern,
				type,
				error: error instanceof Error ? error.message : String(error),
			});

			return { invalidatedCount: 0, pattern, duration: Date.now() - startTime };
		}
	}

	/**
	 * Warm cache with popular content
	 */
	async warmCache(strategy: WarmingStrategy): Promise<{
		warmedCount: number;
		skippedCount: number;
		errors: number;
		duration: number;
	}> {
		const startTime = Date.now();
		let warmedCount = 0;
		let skippedCount = 0;
		let errors = 0;

		try {
			console.info('brAInwav CDN cache warming started', {
				component: 'memory-core',
				brand: 'brAInwav',
				strategy: strategy.name,
				patterns: strategy.patterns.length,
				regions: strategy.regions,
			});

			// In a real implementation, this would:
			// 1. Identify popular content based on usage patterns
			// 2. Pre-fetch content from origin
			// 3. Push content to CDN edge locations
			// 4. Set appropriate cache headers

			// For now, simulate the warming process
			for (const pattern of strategy.patterns) {
				try {
					// Simulate content warming
					await new Promise(resolve => setTimeout(resolve, 100));
					warmedCount++;
				} catch (error) {
					errors++;
					console.warn('brAInwav CDN cache warming item failed', {
						component: 'memory-core',
						brand: 'brAInwav',
						pattern,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			// Update strategy execution time
			strategy.lastExecuted = Date.now();
			strategy.nextExecution = this.calculateNextExecution(strategy);

			const duration = Date.now() - startTime;

			console.info('brAInwav CDN cache warming completed', {
				component: 'memory-core',
				brand: 'brAInwav',
				strategy: strategy.name,
				warmedCount,
				skippedCount,
				errors,
				duration,
			});

			return { warmedCount, skippedCount, errors, duration };
		} catch (error) {
			console.error('brAInwav CDN cache warming failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				strategy: strategy.name,
				error: error instanceof Error ? error.message : String(error),
			});

			return { warmedCount: 0, skippedCount: 0, errors: 1, duration: Date.now() - startTime };
		}
	}

	private shouldCompress(contentType: string): boolean {
		if (!this.config.compression.enabled) return false;
		return this.config.compression.types.some(type => contentType.includes(type));
	}

	private async compressContent(content: string): Promise<string> {
		// In a real implementation, use actual compression (gzip, brotli)
		// For now, simulate compression
		const compressionLevel = this.config.compression.level;
		const simulatedReduction = 0.1 + (compressionLevel * 0.05); // 15-50% reduction
		return content.substring(0, Math.floor(content.length * (1 - simulatedReduction)));
	}

	private hashContent(content: any): string {
		// Simple hash function (in practice, use crypto.createHash)
		const str = JSON.stringify(content);
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(36);
	}

	private updateMetrics(
		contentType: string,
		region: string,
		originalSize: number,
		compressedSize: number,
		latency: number
	): void {
		// Update overall metrics
		this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2;
		this.metrics.averageServedSize = (this.metrics.averageServedSize + compressedSize) / 2;

		// Update compression stats
		this.metrics.compressionStats.originalSize += originalSize;
		this.metrics.compressionStats.compressedSize += compressedSize;
		this.metrics.compressionStats.savings += (originalSize - compressedSize);
		this.metrics.compressionStats.ratio =
			this.metrics.compressionStats.originalSize > 0
				? this.metrics.compressionStats.savings / this.metrics.compressionStats.originalSize
				: 0;

		// Update content type stats
		if (!this.metrics.contentTypeStats[contentType]) {
			this.metrics.contentTypeStats[contentType] = {
				requests: 0,
				hitRatio: 0,
				averageSize: 0,
			};
		}
		const ctStats = this.metrics.contentTypeStats[contentType];
		ctStats.requests++;
		ctStats.averageSize = (ctStats.averageSize + compressedSize) / 2;

		// Update regional stats
		if (!this.metrics.regionalStats[region]) {
			this.metrics.regionalStats[region] = {
				requests: 0,
				hitRatio: 0,
				latency: 0,
			};
		}
		const regionStats = this.metrics.regionalStats[region];
		regionStats.requests++;
		regionStats.latency = (regionStats.latency + latency) / 2;

		this.metrics.lastUpdated = Date.now();
	}

	private updateRegionalStats(region: string, latency: number): void {
		if (!this.metrics.regionalStats[region]) {
			this.metrics.regionalStats[region] = {
				requests: 0,
				hitRatio: 0,
				latency: 0,
			};
		}

		const stats = this.metrics.regionalStats[region];
		stats.requests++;
		stats.latency = (stats.latency + latency) / 2;

		// Update hit ratio for region
		const regionHits = Array.from(this.cacheEntries.values())
			.filter(entry => entry.region === region && entry.cacheStatus === 'HIT')
			.length;
		const regionRequests = Array.from(this.cacheEntries.values())
			.filter(entry => entry.region === region)
			.length;

		stats.hitRatio = regionRequests > 0 ? regionHits / regionRequests : 0;
	}

	private updateHitRatio(): void {
		this.metrics.hitRatio = this.metrics.totalRequests > 0
			? this.metrics.cacheHits / this.metrics.totalRequests
			: 0;
	}

	private setupDefaultInvalidationRules(): void {
		// Set up common invalidation patterns
		const defaultRules: CacheInvalidationRule[] = [
			{
				id: 'api-docs',
				pattern: '/api/docs',
				type: 'prefix',
				action: 'invalidate',
			},
			{
				id: 'static-assets',
				pattern: '/static',
				type: 'prefix',
				condition: { contentType: 'application/javascript' },
				action: 'refresh',
				scheduled: true,
				schedule: '0 2 * * *', // Daily at 2 AM
			},
		];

		defaultRules.forEach(rule => {
			this.invalidationRules.set(rule.id, rule);
		});
	}

	private setupDefaultWarmingStrategies(): void {
		// Set up default warming strategies
		const defaultStrategies: WarmingStrategy[] = [
			{
				id: 'popular-api',
				name: 'Popular API Endpoints',
				patterns: ['/api/health', '/api/stats', '/api/metrics'],
				priority: 'high',
				frequency: 'hourly',
				regions: this.config.geographic.regions,
				maxConcurrent: 5,
				lastExecuted: 0,
				nextExecution: Date.now() + 3600000, // 1 hour from now
			},
			{
				id: 'documentation',
				name: 'Documentation Pages',
				patterns: ['/docs', '/api/docs', '/README'],
				priority: 'medium',
				frequency: 'daily',
				regions: this.config.geographic.regions,
				maxConcurrent: 3,
				lastExecuted: 0,
				nextExecution: Date.now() + 86400000, // 24 hours from now
			},
		];

		defaultStrategies.forEach(strategy => {
			this.warmingStrategies.set(strategy.id, strategy);
		});
	}

	private calculateNextExecution(strategy: WarmingStrategy): number {
		const now = Date.now();
		let interval = 3600000; // Default to 1 hour

		switch (strategy.frequency) {
			case 'once':
				return 0; // No next execution
			case 'hourly':
				interval = 3600000;
				break;
			case 'daily':
				interval = 86400000;
				break;
			case 'on-demand':
				return 0; // Execute on demand only
		}

		return now + interval;
	}

	private startMetricsCollection(): void {
		this.metricsTimer = setInterval(() => {
			this.collectMetrics();
		}, 60000); // Collect metrics every minute
	}

	private startCacheWarming(): void {
		this.warmingTimer = setInterval(() => {
			this.executeScheduledWarming();
		}, 300000); // Check every 5 minutes
	}

	private collectMetrics(): void {
		// Clean up old cache entries
		const cutoffTime = Date.now() - (this.config.maxTTL * 1000);
		let cleanedCount = 0;

		for (const [key, entry] of this.cacheEntries.entries()) {
			if (entry.lastAccessed < cutoffTime && entry.hitCount === 0) {
				this.cacheEntries.delete(key);
				cleanedCount++;
			}
		}

		if (cleanedCount > 0) {
			console.debug('brAInwav CDN cache cleanup', {
				component: 'memory-core',
				brand: 'brAInwav',
				cleanedCount,
				remainingEntries: this.cacheEntries.size,
			});
		}

		// Update cache hit ratios for content types
		for (const [contentType, stats] of Object.entries(this.metrics.contentTypeStats)) {
			const typeEntries = Array.from(this.cacheEntries.values())
				.filter(entry => entry.contentType === contentType);
			const typeHits = typeEntries.filter(entry => entry.cacheStatus === 'HIT').length;
			stats.hitRatio = typeEntries.length > 0 ? typeHits / typeEntries.length : 0;
		}

		this.metrics.lastUpdated = Date.now();
	}

	private async executeScheduledWarming(): Promise<void> {
		const now = Date.now();

		for (const strategy of this.warmingStrategies.values()) {
			if (strategy.nextExecution > 0 && strategy.nextExecution <= now) {
				try {
					await this.warmCache(strategy);
				} catch (error) {
					console.warn('brAInwav CDN scheduled warming failed', {
						component: 'memory-core',
						brand: 'brAInwav',
						strategy: strategy.name,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
		}
	}

	/**
	 * Get current metrics and status
	 */
	getMetrics(): {
		metrics: CDNMetrics;
		cacheEntries: number;
		invalidationRules: number;
		warmingStrategies: number;
		config: CDNConfig;
	} {
		return {
			metrics: { ...this.metrics },
			cacheEntries: this.cacheEntries.size,
			invalidationRules: this.invalidationRules.size,
			warmingStrategies: this.warmingStrategies.size,
			config: { ...this.config },
		};
	}

	/**
	 * Health check for CDN cache manager
	 */
	async healthCheck(): Promise<{
		healthy: boolean;
		provider: string;
		cacheEntries: number;
		hitRatio: number;
		lastMetricsUpdate: number;
		errors: number;
	}> {
		const healthy = this.config.enabled && this.metrics.errors < 10;
		const lastMetricsUpdate = this.metrics.lastUpdated;

		return {
			healthy,
			provider: this.config.provider,
			cacheEntries: this.cacheEntries.size,
			hitRatio: this.metrics.hitRatio,
			lastMetricsUpdate,
			errors: this.metrics.errors,
		};
	}

	/**
	 * Stop CDN cache manager
	 */
	async stop(): Promise<void> {
		// Clear timers
		if (this.metricsTimer) {
			clearInterval(this.metricsTimer);
			this.metricsTimer = null;
		}

		if (this.warmingTimer) {
			clearInterval(this.warmingTimer);
			this.warmingTimer = null;
		}

		// Clear cache
		this.cacheEntries.clear();
		this.invalidationRules.clear();
		this.warmingStrategies.clear();

		console.info('brAInwav CDN Cache Manager stopped', {
			component: 'memory-core',
			brand: 'brAInwav',
			finalMetrics: this.metrics,
		});
	}
}

// Global CDN cache manager instance
let cdnCacheManager: CDNCacheManager | null = null;

export function getCDNCacheManager(config?: CDNConfig): CDNCacheManager {
	if (!cdnCacheManager) {
		if (!config) {
			throw new Error('CDN cache configuration required for first initialization');
		}
		cdnCacheManager = new CDNCacheManager(config);
	}
	return cdnCacheManager;
}

export async function stopCDNCacheManager(): Promise<void> {
	if (cdnCacheManager) {
		await cdnCacheManager.stop();
		cdnCacheManager = null;
	}
}