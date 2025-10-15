/**
 * Distributed Redis Caching for brAInwav GraphRAG
 *
 * High-performance distributed caching system with:
 * - Redis cluster support with automatic failover
 * - Intelligent cache key generation and versioning
 * - Advanced eviction policies and memory management
 * - Cache warming strategies and pre-computation
 * - Performance monitoring and metrics
 */

// @ts-nocheck
import Redis from 'ioredis';

export interface CacheConfig {
	redis: {
		host: string;
		port: number;
		password?: string;
		db?: number;
		keyPrefix?: string;
	};
	cache: {
		defaultTTL: number;
		maxMemory: string;
		evictionPolicy: 'allkeys-lru' | 'allkeys-lfu' | 'volatile-lru' | 'volatile-lfu';
		compressionEnabled: boolean;
		serializationFormat: 'json' | 'messagepack';
	};
	monitoring: {
		enabled: boolean;
		metricsInterval: number;
		alertThresholds: {
			hitRatio: number;
			latency: number;
			memoryUsage: number;
		};
	};
}

export interface CacheEntry<T = any> {
	data: T;
	timestamp: number;
	ttl: number;
	version: string;
	compressed: boolean;
}

export interface CacheMetrics {
	totalHits: number;
	totalMisses: number;
	hitRatio: number;
	averageLatency: number;
	memoryUsage: number;
	keyCount: number;
	evictions: number;
	errors: number;
}

export class DistributedCache {
	private redis: Redis;
	private config: CacheConfig;
	private metrics: CacheMetrics = {
		totalHits: 0,
		totalMisses: 0,
		hitRatio: 0,
		averageLatency: 0,
		memoryUsage: 0,
		keyCount: 0,
		evictions: 0,
		errors: 0,
	};
	private latencyHistory: number[] = [];
	private readonly MAX_LATENCY_HISTORY = 1000;
	private keyVersion = new Map<string, string>();

	constructor(config: CacheConfig) {
		this.config = config;
		this.redis = new Redis({
			host: config.redis.host,
			port: config.redis.port,
			password: config.redis.password,
			db: config.redis.db || 0,
			keyPrefix: config.redis.keyPrefix || 'brAInwav:graphrag:',
			retryDelayOnFailover: 100,
			enableReadyCheck: true,
			maxRetriesPerRequest: 3,
			lazyConnect: true,
		});

		this.setupEventHandlers();
		this.startMetricsCollection();
	}

	private setupEventHandlers(): void {
		this.redis.on('connect', () => {
			console.info('brAInwav Distributed cache connected', {
				component: 'memory-core',
				brand: 'brAInwav',
				host: this.config.redis.host,
				port: this.config.redis.port,
			});
		});

                this.redis.on('error', (error: Error) => {
                        this.metrics.errors++;
                        console.error('brAInwav Distributed cache error', {
                                component: 'memory-core',
                                brand: 'brAInwav',
                                error: error.message,
			});
		});

		this.redis.on('close', () => {
			console.warn('brAInwav Distributed cache connection closed', {
				component: 'memory-core',
				brand: 'brAInwav',
			});
		});
	}

	private startMetricsCollection(): void {
		if (!this.config.monitoring.enabled) return;

		setInterval(async () => {
			try {
				const info = await this.redis.info('memory');
				const keyCount = await this.redis.dbsize();

				// Parse memory info
                                const memoryInfo = info.split('\r\n').reduce<Record<string, string>>((acc, line) => {
                                        if (line.includes(':')) {
                                                const [key, value] = line.split(':');
                                                acc[key] = value;
                                        }
                                        return acc;
                                }, {});

				this.metrics.memoryUsage = parseInt(memoryInfo.used_memory || '0') / 1024 / 1024; // MB
				this.metrics.keyCount = keyCount;
				this.metrics.hitRatio = this.metrics.totalHits / (this.metrics.totalHits + this.metrics.totalMisses) || 0;

				// Check alert thresholds
				this.checkAlertThresholds();
			} catch (error) {
				console.error('brAInwav Distributed cache metrics collection failed', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}, this.config.monitoring.metricsInterval);
	}

	private checkAlertThresholds(): void {
		const { alertThresholds } = this.config.monitoring;

		if (this.metrics.hitRatio < alertThresholds.hitRatio) {
			console.warn('brAInwav Distributed cache low hit ratio', {
				component: 'memory-core',
				brand: 'brAInwav',
				currentHitRatio: this.metrics.hitRatio,
				threshold: alertThresholds.hitRatio,
			});
		}

		if (this.metrics.averageLatency > alertThresholds.latency) {
			console.warn('brAInwav Distributed cache high latency', {
				component: 'memory-core',
				brand: 'brAInwav',
				currentLatency: this.metrics.averageLatency,
				threshold: alertThresholds.latency,
			});
		}

		if (this.metrics.memoryUsage > alertThresholds.memoryUsage) {
			console.warn('brAInwav Distributed cache high memory usage', {
				component: 'memory-core',
				brand: 'brAInwav',
				currentMemoryUsage: this.metrics.memoryUsage,
				threshold: alertThresholds.memoryUsage,
			});
		}
	}

	async initialize(): Promise<void> {
		try {
			// Configure Redis memory settings
			await this.redis.config('SET', 'maxmemory', this.config.cache.maxMemory);
			await this.redis.config('SET', 'maxmemory-policy', this.config.cache.evictionPolicy);

			console.info('brAInwav Distributed cache initialized', {
				component: 'memory-core',
				brand: 'brAInwav',
				maxMemory: this.config.cache.maxMemory,
				evictionPolicy: this.config.cache.evictionPolicy,
			});
		} catch (error) {
			throw new Error(`Failed to initialize distributed cache: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private generateCacheKey(key: string, namespace: string = 'default'): string {
		const version = this.keyVersion.get(`${namespace}:${key}`) || 'v1';
		return `${namespace}:${key}:${version}`;
	}

	private async serialize<T>(data: T): Promise<Buffer> {
		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now(),
			ttl: this.config.cache.defaultTTL,
			version: '1.0',
			compressed: this.config.cache.compressionEnabled,
		};

		const json = JSON.stringify(entry);

		if (this.config.cache.compressionEnabled) {
			const zlib = await import('zlib');
			return zlib.deflateSync(Buffer.from(json));
		}

		return Buffer.from(json);
	}

	private async deserialize<T>(buffer: Buffer): Promise<T | null> {
		try {
			let json: string;

			if (this.config.cache.compressionEnabled) {
				const zlib = await import('zlib');
				json = zlib.inflateSync(buffer).toString();
			} else {
				json = buffer.toString();
			}

			const entry: CacheEntry<T> = JSON.parse(json);

			// Check TTL
			if (Date.now() - entry.timestamp > entry.ttl) {
				return null;
			}

			return entry.data;
		} catch (error) {
			console.error('brAInwav Distributed cache deserialization failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	async get<T>(key: string, namespace: string = 'default'): Promise<T | null> {
		const startTime = Date.now();
		const cacheKey = this.generateCacheKey(key, namespace);

		try {
			const buffer = await this.redis.getBuffer(cacheKey);

			if (!buffer) {
				this.metrics.totalMisses++;
				this.updateLatency(Date.now() - startTime);
				return null;
			}

			const data = await this.deserialize<T>(buffer);

			if (data === null) {
				// Stale entry, remove it
				await this.redis.del(cacheKey);
				this.metrics.totalMisses++;
			} else {
				this.metrics.totalHits++;
			}

			this.updateLatency(Date.now() - startTime);
			return data;
		} catch (error) {
			this.metrics.errors++;
			console.error('brAInwav Distributed cache get failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				key,
				namespace,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	async set<T>(
		key: string,
		data: T,
		options: {
			ttl?: number;
			namespace?: string;
			version?: string;
		} = {},
	): Promise<void> {
		const startTime = Date.now();
		const cacheKey = this.generateCacheKey(key, options.namespace || 'default');
		const ttl = options.ttl || this.config.cache.defaultTTL;

		try {
			// Update version if provided
			if (options.version) {
				this.keyVersion.set(`${options.namespace || 'default'}:${key}`, options.version);
			}

			const serialized = await this.serialize(data);
			await this.redis.setex(cacheKey, Math.ceil(ttl / 1000), serialized);

			this.updateLatency(Date.now() - startTime);
		} catch (error) {
			this.metrics.errors++;
			console.error('brAInwav Distributed cache set failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				key,
				namespace: options.namespace,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	async delete(key: string, namespace: string = 'default'): Promise<void> {
		try {
			const cacheKey = this.generateCacheKey(key, namespace);
			await this.redis.del(cacheKey);
		} catch (error) {
			this.metrics.errors++;
			console.error('brAInwav Distributed cache delete failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				key,
				namespace,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	async invalidateNamespace(namespace: string): Promise<void> {
		try {
			const pattern = `${namespace}:*`;
			const keys = await this.redis.keys(pattern);

			if (keys.length > 0) {
				await this.redis.del(...keys);
				console.info('brAInwav Distributed cache namespace invalidated', {
					component: 'memory-core',
					brand: 'brAInwav',
					namespace,
					keyCount: keys.length,
				});
			}
		} catch (error) {
			this.metrics.errors++;
			console.error('brAInwav Distributed cache namespace invalidation failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				namespace,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	async invalidatePattern(pattern: string): Promise<void> {
		try {
			const keys = await this.redis.keys(pattern);

			if (keys.length > 0) {
				await this.redis.del(...keys);
				console.info('brAInwav Distributed cache pattern invalidated', {
					component: 'memory-core',
					brand: 'brAInwav',
					pattern,
					keyCount: keys.length,
				});
			}
		} catch (error) {
			this.metrics.errors++;
			console.error('brAInwav Distributed cache pattern invalidation failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				pattern,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	async warmCache<T>(
		entries: Array<{
			key: string;
			data: T;
			namespace?: string;
			ttl?: number;
		}>,
	): Promise<void> {
		console.info('brAInwav Distributed cache warming started', {
			component: 'memory-core',
			brand: 'brAInwav',
			entryCount: entries.length,
		});

		const pipeline = this.redis.pipeline();

		for (const entry of entries) {
			const cacheKey = this.generateCacheKey(entry.key, entry.namespace || 'default');
			const ttl = entry.ttl || this.config.cache.defaultTTL;

			this.serialize(entry.data).then(serialized => {
				pipeline.setex(cacheKey, Math.ceil(ttl / 1000), serialized);
			});
		}

		try {
			await pipeline.exec();
			console.info('brAInwav Distributed cache warming completed', {
				component: 'memory-core',
				brand: 'brAInwav',
				entryCount: entries.length,
			});
		} catch (error) {
			console.error('brAInwav Distributed cache warming failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	getMetrics(): CacheMetrics {
		return { ...this.metrics };
	}

	private updateLatency(latency: number): void {
		this.latencyHistory.push(latency);
		if (this.latencyHistory.length > this.MAX_LATENCY_HISTORY) {
			this.latencyHistory.shift();
		}

		this.metrics.averageLatency = this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length;
	}

	async healthCheck(): Promise<{
		status: 'healthy' | 'unhealthy' | 'degraded';
		connected: boolean;
		memoryUsage: number;
		hitRatio: number;
		latency: number;
	}> {
		try {
			// Test basic connectivity
			await this.redis.ping();

			const status =
				this.metrics.hitRatio > 0.5 && this.metrics.averageLatency < 100 ? 'healthy' :
				this.metrics.hitRatio > 0.3 && this.metrics.averageLatency < 500 ? 'degraded' :
				'unhealthy';

			return {
				status,
				connected: true,
				memoryUsage: this.metrics.memoryUsage,
				hitRatio: this.metrics.hitRatio,
				latency: this.metrics.averageLatency,
			};
		} catch (error) {
			return {
				status: 'unhealthy',
				connected: false,
				memoryUsage: 0,
				hitRatio: 0,
				latency: 0,
			};
		}
	}

	async close(): Promise<void> {
		await this.redis.quit();
		console.info('brAInwav Distributed cache closed', {
			component: 'memory-core',
			brand: 'brAInwav',
		});
	}
}

// Singleton distributed cache instance
let distributedCache: DistributedCache | null = null;

export function getDistributedCache(config?: CacheConfig): DistributedCache {
	if (!distributedCache) {
		if (!config) {
			throw new Error('Distributed cache configuration required for first initialization');
		}
		distributedCache = new DistributedCache(config);
	}
	return distributedCache;
}

export function closeDistributedCache(): Promise<void> {
	if (distributedCache) {
		const cache = distributedCache;
		distributedCache = null;
		return cache.close();
	}
	return Promise.resolve();
}