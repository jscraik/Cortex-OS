// Redis Cache Service for brAInwav Cortex WebUI
// High-performance distributed caching with Redis

import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { gunzip, gzip } from 'node:zlib';
import { createClient, type RedisClientType } from 'redis';
import type { ZodSchema } from 'zod';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface CacheConfig {
	url?: string;
	host?: string;
	port?: number;
	password?: string;
	db?: number;
	keyPrefix?: string;
	defaultTtl?: number;
	compressionThreshold?: number;
	maxRetries?: number;
	retryDelay?: number;
	cluster?: boolean;
	clusterNodes?: Array<{ host: string; port: number }>;
}

export interface CacheOptions {
	ttl?: number;
	compress?: boolean;
	namespace?: string;
	version?: string;
}

export interface CacheStats {
	hits: number;
	misses: number;
	sets: number;
	deletes: number;
	errors: number;
	hitRate: number;
	memoryUsage: number;
	keyCount: number;
}

export class CacheService {
	private static instance: CacheService;
	private client: RedisClientType;
	private config: Required<CacheConfig>;
	private stats: CacheStats = {
		hits: 0,
		misses: 0,
		sets: 0,
		deletes: 0,
		errors: 0,
		hitRate: 0,
		memoryUsage: 0,
		keyCount: 0,
	};
	private isHealthy = false;
	private connectionPromise?: Promise<void>;

	private constructor(config: CacheConfig) {
		this.config = {
			url: config.url || `redis://${config.host || 'localhost'}:${config.port || 6379}`,
			password: config.password || '',
			db: config.db || 0,
			keyPrefix: config.keyPrefix || 'cortex-webui:',
			defaultTtl: config.defaultTtl || 3600, // 1 hour
			compressionThreshold: config.compressionThreshold || 1024, // 1KB
			maxRetries: config.maxRetries || 3,
			retryDelay: config.retryDelay || 1000,
			cluster: config.cluster || false,
			clusterNodes: config.clusterNodes || [],
		};

		this.client = createClient({
			url: this.config.url,
			password: this.config.password || undefined,
			database: this.config.db,
			socket: {
				reconnectStrategy: (retries) => {
					if (retries > this.config.maxRetries) {
						return new Error('Max reconnection attempts reached');
					}
					return Math.min(retries * this.config.retryDelay, 30000);
				},
			},
		});

		this.setupEventHandlers();
	}

	public static getInstance(config?: CacheConfig): CacheService {
		if (!CacheService.instance) {
			if (!config) {
				throw new Error('Cache config required for first initialization');
			}
			CacheService.instance = new CacheService(config);
		}
		return CacheService.instance;
	}

	public static initializeFromEnv(): CacheService {
		const config: CacheConfig = {
			url: process.env.REDIS_URL,
			host: process.env.REDIS_HOST,
			port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
			password: process.env.REDIS_PASSWORD,
			db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
			keyPrefix: process.env.REDIS_KEY_PREFIX || 'cortex-webui:',
			defaultTtl: process.env.REDIS_DEFAULT_TTL
				? parseInt(process.env.REDIS_DEFAULT_TTL, 10)
				: 3600,
			compressionThreshold: process.env.REDIS_COMPRESSION_THRESHOLD
				? parseInt(process.env.REDIS_COMPRESSION_THRESHOLD, 10)
				: 1024,
			maxRetries: process.env.REDIS_MAX_RETRIES ? parseInt(process.env.REDIS_MAX_RETRIES, 10) : 3,
			retryDelay: process.env.REDIS_RETRY_DELAY
				? parseInt(process.env.REDIS_RETRY_DELAY, 10)
				: 1000,
		};

		return CacheService.getInstance(config);
	}

	private setupEventHandlers(): void {
		this.client.on('error', (error) => {
			console.error('Redis client error:', error);
			this.isHealthy = false;
			this.stats.errors++;
		});

		this.client.on('connect', () => {
			console.log('Redis client connected');
			this.isHealthy = true;
		});

		this.client.on('ready', () => {
			console.log('Redis client ready');
			this.isHealthy = true;
		});

		this.client.on('end', () => {
			console.log('Redis client disconnected');
			this.isHealthy = false;
		});

		this.client.on('reconnecting', () => {
			console.log('Redis client reconnecting');
		});
	}

	public async connect(): Promise<void> {
		if (this.connectionPromise) {
			return this.connectionPromise;
		}

		this.connectionPromise = this.client.connect();
		await this.connectionPromise;
		return;
	}

	public async disconnect(): Promise<void> {
		await this.client.disconnect();
		this.isHealthy = false;
	}

	private buildKey(key: string, namespace?: string): string {
		const parts = [this.config.keyPrefix];
		if (namespace) {
			parts.push(namespace);
		}
		parts.push(key);
		return parts.join(':');
	}

	private async compress(data: string): Promise<Buffer> {
		return await gzipAsync(data);
	}

	private async decompress(data: Buffer): Promise<string> {
		return await gunzipAsync(data);
	}

	private shouldCompress(data: string, options: CacheOptions): boolean {
		return options.compress !== false && data.length > this.config.compressionThreshold;
	}

	public async get<T = unknown>(
		key: string,
		schema?: ZodSchema<T>,
		options: CacheOptions = {},
	): Promise<T | null> {
		try {
			if (!this.isHealthy) {
				await this.connect();
			}

			const fullKey = this.buildKey(key, options.namespace);
			const value = await this.client.get(fullKey);

			if (!value) {
				this.stats.misses++;
				return null;
			}

			let parsedData: unknown;

			// Check if data is compressed (starts with magic prefix)
			if (value.startsWith('COMPRESSED:')) {
				const compressedData = Buffer.from(value.slice(11), 'base64');
				const decompressed = await this.decompress(compressedData);
				parsedData = JSON.parse(decompressed);
			} else {
				parsedData = JSON.parse(value);
			}

			this.stats.hits++;

			// Validate with schema if provided
			if (schema) {
				return schema.parse(parsedData) as T;
			}

			return parsedData as T;
		} catch (error) {
			console.error('Cache get error:', error);
			this.stats.errors++;
			return null;
		}
	}

	public async set(key: string, value: unknown, options: CacheOptions = {}): Promise<void> {
		try {
			if (!this.isHealthy) {
				await this.connect();
			}

			const fullKey = this.buildKey(key, options.namespace);
			const serialized = JSON.stringify(value);
			let finalValue = serialized;
			const ttl = options.ttl || this.config.defaultTtl; // Compress if beneficial
			if (this.shouldCompress(serialized, options)) {
				const compressed = await this.compress(serialized);
				finalValue = `COMPRESSED:${compressed.toString('base64')}`;
			}

			await this.client.setEx(fullKey, ttl, finalValue);
			this.stats.sets++;
		} catch (error) {
			console.error('Cache set error:', error);
			this.stats.errors++;
			throw error;
		}
	}

	public async del(key: string, namespace?: string): Promise<void> {
		try {
			if (!this.isHealthy) {
				await this.connect();
			}

			const fullKey = this.buildKey(key, namespace);
			await this.client.del(fullKey);
			this.stats.deletes++;
		} catch (error) {
			console.error('Cache delete error:', error);
			this.stats.errors++;
		}
	}

	public async exists(key: string, namespace?: string): Promise<boolean> {
		try {
			if (!this.isHealthy) {
				await this.connect();
			}

			const fullKey = this.buildKey(key, namespace);
			const result = await this.client.exists(fullKey);
			return result === 1;
		} catch (error) {
			console.error('Cache exists error:', error);
			this.stats.errors++;
			return false;
		}
	}

	public async clear(namespace?: string): Promise<void> {
		try {
			if (!this.isHealthy) {
				await this.connect();
			}

			const pattern = namespace ? this.buildKey('*', namespace) : `${this.config.keyPrefix}*`;
			const keys = await this.client.keys(pattern);
			if (keys.length > 0) {
				await this.client.del(keys);
			}
		} catch (error) {
			console.error('Cache clear error:', error);
			this.stats.errors++;
		}
	}

	public async getMany<T = unknown>(
		keys: string[],
		schema?: ZodSchema<T>,
		options: CacheOptions = {},
	): Promise<Map<string, T | null>> {
		const results = new Map<string, T | null>();

		try {
			if (!this.isHealthy) {
				await this.connect();
			}

			const fullKeys = keys.map((key) => this.buildKey(key, options.namespace));
			const values = await this.client.mGet(fullKeys);

			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				const value = values[i];

				if (!value) {
					this.stats.misses++;
					results.set(key, null);
					continue;
				}

				try {
					let parsedData: unknown;

					if (value.startsWith('COMPRESSED:')) {
						const compressedData = Buffer.from(value.slice(11), 'base64');
						const decompressed = await this.decompress(compressedData);
						parsedData = JSON.parse(decompressed);
					} else {
						parsedData = JSON.parse(value);
					}

					this.stats.hits++;

					if (schema) {
						results.set(key, schema.parse(parsedData) as T);
					} else {
						results.set(key, parsedData as T);
					}
				} catch (parseError) {
					console.error(`Cache parse error for key ${key}:`, parseError);
					this.stats.errors++;
					results.set(key, null);
				}
			}
		} catch (error) {
			console.error('Cache getMany error:', error);
			this.stats.errors++;

			// Return all keys as null on error
			for (const key of keys) {
				results.set(key, null);
			}
		}

		return results;
	}

	public async setMany(
		entries: Array<{ key: string; value: unknown }>,
		options: CacheOptions = {},
	): Promise<void> {
		try {
			if (!this.isHealthy) {
				await this.connect();
			}

			const ttl = options.ttl || this.config.defaultTtl;
			const pipeline = this.client.multi();

			for (const entry of entries) {
				const fullKey = this.buildKey(entry.key, options.namespace);
				const serialized = JSON.stringify(entry.value);
				let finalValue = serialized;

				if (this.shouldCompress(serialized, options)) {
					const compressed = await this.compress(serialized);
					finalValue = `COMPRESSED:${compressed.toString('base64')}`;
				}

				pipeline.setEx(fullKey, ttl, finalValue);
			}

			await pipeline.exec();
			this.stats.sets += entries.length;
		} catch (error) {
			console.error('Cache setMany error:', error);
			this.stats.errors++;
			throw error;
		}
	}

	public getStats(): CacheStats {
		const total = this.stats.hits + this.stats.misses;
		this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
		return { ...this.stats };
	}

	public async getRedisInfo(): Promise<Record<string, string>> {
		try {
			if (!this.isHealthy) {
				await this.connect();
			}

			const info = await this.client.info();
			const lines = info.split('\r\n');
			const result: Record<string, string> = {};

			for (const line of lines) {
				if (line && !line.startsWith('#')) {
					const [key, ...valueParts] = line.split(':');
					if (key && valueParts.length > 0) {
						result[key] = valueParts.join(':');
					}
				}
			}

			// Update memory usage and key count
			if (result.used_memory) {
				this.stats.memoryUsage = parseInt(result.used_memory, 10);
			}
			if (result.db0) {
				// Parse db0 keyspace info: "keys=123,expires=45,avg_ttl=6000"
				const match = result.db0.match(/keys=(\d+)/);
				if (match) {
					this.stats.keyCount = parseInt(match[1], 10);
				}
			}

			return result;
		} catch (error) {
			console.error('Redis info error:', error);
			return {};
		}
	}

	public isRedisHealthy(): boolean {
		return this.isHealthy;
	}

	public async ping(): Promise<string> {
		try {
			if (!this.isHealthy) {
				await this.connect();
			}
			return await this.client.ping();
		} catch (error) {
			console.error('Redis ping error:', error);
			throw error;
		}
	}

	public resetStats(): void {
		this.stats = {
			hits: 0,
			misses: 0,
			sets: 0,
			deletes: 0,
			errors: 0,
			hitRate: 0,
			memoryUsage: 0,
			keyCount: 0,
		};
	}

	// Advanced caching patterns
	public async getOrSet<T = unknown>(
		key: string,
		factory: () => Promise<T>,
		schema?: ZodSchema<T>,
		options: CacheOptions = {},
	): Promise<T> {
		const cached = await this.get<T>(key, schema, options);
		if (cached !== null) {
			return cached;
		}

		const value = await factory();
		await this.set(key, value, options);
		return value;
	}

	public async invalidatePattern(pattern: string, namespace?: string): Promise<void> {
		try {
			if (!this.isHealthy) {
				await this.connect();
			}

			const fullPattern = this.buildKey(pattern, namespace);
			const keys = await this.client.keys(fullPattern);

			if (keys.length > 0) {
				await this.client.del(keys);
				this.stats.deletes += keys.length;
			}
		} catch (error) {
			console.error('Cache invalidate pattern error:', error);
			this.stats.errors++;
		}
	}

	// Atomic operations for distributed locking
	public async acquireLock(key: string, ttl = 30, retryDelay = 100): Promise<string | null> {
		const lockKey = this.buildKey(`lock:${key}`);
		const token = crypto.randomUUID();
		const deadline = Date.now() + 5000; // 5 second timeout

		while (Date.now() < deadline) {
			const result = await this.client.setNX(lockKey, token, { EX: ttl });
			if (result) {
				return token;
			}

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, retryDelay));
		}

		return null;
	}

	public async releaseLock(key: string, token: string): Promise<boolean> {
		const lockKey = this.buildKey(`lock:${key}`);

		// Lua script for atomic lock release
		const luaScript = `
			if redis.call("GET", KEYS[1]) == ARGV[1] then
				return redis.call("DEL", KEYS[1])
			else
				return 0
			end
		`;

		const result = await this.client.evalScript(luaScript, {
			keys: [lockKey],
			arguments: [token],
		});

		return result === 1;
	}
}

// Export singleton instance accessor
export const cacheService = CacheService.initializeFromEnv();

// Export types and utilities
export type { CacheConfig, CacheOptions, CacheStats };
export const createCacheKey = (...parts: string[]): string => parts.join(':');
export const hashCacheKey = (key: string): string =>
	crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
