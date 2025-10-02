// Response Caching Middleware for brAInwav Cortex WebUI
// High-performance HTTP response caching with Redis

import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import { cacheService } from '../services/cacheService.js';

export interface CacheMiddlewareOptions {
	ttl?: number;
	keyGenerator?: (req: Request) => string;
	skipCache?: (req: Request) => boolean;
	cacheableStatusCodes?: number[];
	varyHeaders?: string[];
	namespace?: string;
	compress?: boolean;
	cacheControl?: string;
	etag?: boolean;
}

interface CachedResponse {
	statusCode: number;
	headers: Record<string, string>;
	body: string;
	etag?: string;
	lastModified?: string;
}

const defaultOptions: Required<Omit<CacheMiddlewareOptions, 'keyGenerator' | 'skipCache'>> = {
	ttl: 300, // 5 minutes
	cacheableStatusCodes: [200, 201, 204],
	varyHeaders: ['Accept', 'Accept-Encoding', 'Accept-Language'],
	namespace: 'http-cache',
	compress: true,
	cacheControl: 'public, max-age=300',
	etag: true,
};

export const createCacheMiddleware = (options: CacheMiddlewareOptions = {}) => {
	const opts = { ...defaultOptions, ...options };

	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		// Skip cache for non-GET requests
		if (req.method !== 'GET') {
			return next();
		}

		// Check if cache should be skipped
		if (opts.skipCache?.(req)) {
			return next();
		}

		// Generate cache key
		const cacheKey = opts.keyGenerator
			? opts.keyGenerator(req)
			: generateCacheKey(req, opts.varyHeaders);

		try {
			// Try to get cached response
			const cached = await cacheService.get<CachedResponse>(cacheKey, undefined, {
				namespace: opts.namespace,
				compress: opts.compress,
			});

			if (cached) {
				// Check ETag if present
				if (cached.etag && req.headers['if-none-match'] === cached.etag) {
					res.status(304).end();
					return;
				}

				// Check Last-Modified if present
				if (cached.lastModified && req.headers['if-modified-since'] === cached.lastModified) {
					res.status(304).end();
					return;
				}

				// Return cached response
				res.status(cached.statusCode);

				// Set cached headers
				Object.entries(cached.headers).forEach(([key, value]) => {
					res.set(key, value);
				});

				// Add cache control headers
				if (opts.cacheControl) {
					res.set('Cache-Control', opts.cacheControl);
				}

				if (cached.etag) {
					res.set('ETag', cached.etag);
				}

				if (cached.lastModified) {
					res.set('Last-Modified', cached.lastModified);
				}

				// Add cache hit header for debugging
				res.set('X-Cache', 'HIT');

				// Send cached body
				res.send(cached.body);
				return;
			}

			// Cache miss - intercept response
			const originalSend = res.send;
			const originalJson = res.json;
			let responseData: string | object = '';
			let statusCode = res.statusCode;
			const headers: Record<string, string> = {};

			// Capture headers
			const originalSet = res.set;
			res.set = function (
				this: Response,
				field: string | Record<string, string>,
				val?: string,
			): Response {
				if (typeof field === 'string' && val !== undefined) {
					headers[field.toLowerCase()] = val;
				} else if (typeof field === 'object') {
					Object.entries(field).forEach(([key, value]) => {
						headers[key.toLowerCase()] = String(value);
					});
				}
				return originalSet.call(this, field, val);
			};

			// Intercept send
			res.send = function (this: Response, data?: string | object): Response {
				responseData = data || '';
				statusCode = this.statusCode;

				// Cache response if it's cacheable
				if (opts.cacheableStatusCodes.includes(statusCode)) {
					cacheResponse(
						cacheKey,
						{
							statusCode,
							headers,
							body: typeof responseData === 'string' ? responseData : JSON.stringify(responseData),
							etag: opts.etag ? generateETag(responseData) : undefined,
							lastModified: new Date().toUTCString(),
						},
						opts,
					);
				}

				// Add cache miss header for debugging
				res.set('X-Cache', 'MISS');

				return originalSend.call(this, responseData);
			};

			// Intercept json
			res.json = function (this: Response, data?: object): Response {
				responseData = data || {};
				statusCode = this.statusCode;

				// Set content type if not already set
				if (!headers['content-type']) {
					res.set('Content-Type', 'application/json');
				}

				// Cache response if it's cacheable
				if (opts.cacheableStatusCodes.includes(statusCode)) {
					cacheResponse(
						cacheKey,
						{
							statusCode,
							headers,
							body: JSON.stringify(responseData),
							etag: opts.etag ? generateETag(responseData) : undefined,
							lastModified: new Date().toUTCString(),
						},
						opts,
					);
				}

				// Add cache miss header for debugging
				res.set('X-Cache', 'MISS');

				return originalJson.call(this, responseData);
			};

			next();
		} catch (error) {
			console.error('Cache middleware error:', error);
			next();
		}
	};
};

function generateCacheKey(req: Request, varyHeaders: string[]): string {
	const parts = [req.method.toLowerCase(), req.path];

	// Add vary header values
	for (const header of varyHeaders) {
		const value = req.headers[header.toLowerCase()];
		if (value) {
			parts.push(`${header}:${value}`);
		}
	}

	// Add query parameters (sorted)
	if (req.query && Object.keys(req.query).length > 0) {
		const sortedParams = Object.keys(req.query)
			.sort()
			.map((key) => `${key}=${req.query[key]}`)
			.join('&');
		parts.push(`query:${sortedParams}`);
	}

	const keyString = parts.join('|');
	return crypto.createHash('sha256').update(keyString).digest('hex').substring(0, 16);
}

function generateETag(data: string | object): string {
	const dataString = typeof data === 'string' ? data : JSON.stringify(data);
	const hash = crypto.createHash('md5').update(dataString).digest('hex');
	return `"${hash}"`;
}

async function cacheResponse(
	key: string,
	response: CachedResponse,
	options: Required<Omit<CacheMiddlewareOptions, 'keyGenerator' | 'skipCache'>>,
): Promise<void> {
	try {
		await cacheService.set(key, response, {
			ttl: options.ttl,
			namespace: options.namespace,
			compress: options.compress,
		});
	} catch (error) {
		console.error('Failed to cache response:', error);
	}
}

// Convenience middleware for common caching patterns
export const cacheShortTerm = createCacheMiddleware({
	ttl: 60, // 1 minute
	namespace: 'short-term',
	cacheControl: 'public, max-age=60',
});

export const cacheMediumTerm = createCacheMiddleware({
	ttl: 300, // 5 minutes
	namespace: 'medium-term',
	cacheControl: 'public, max-age=300',
});

export const cacheLongTerm = createCacheMiddleware({
	ttl: 3600, // 1 hour
	namespace: 'long-term',
	cacheControl: 'public, max-age=3600',
});

// Cache invalidation middleware
export const invalidateCache = (pattern: string, namespace?: string) => {
	return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			await cacheService.invalidatePattern(pattern, namespace);
			res.set('X-Cache-Invalidated', 'true');
			next();
		} catch (error) {
			console.error('Cache invalidation error:', error);
			next();
		}
	};
};

// Cache warming utilities
export const warmCache = async (
	patterns: Array<{
		url: string;
		method?: string;
		headers?: Record<string, string>;
		ttl?: number;
		namespace?: string;
	}>,
): Promise<void> => {
	for (const pattern of patterns) {
		try {
			const cacheKey = generateCacheKey(
				{
					method: pattern.method || 'GET',
					path: pattern.url,
					query: {},
					headers: pattern.headers || {},
				} as Request,
				['Accept', 'Accept-Encoding'],
			);

			// This would typically make an HTTP request to the endpoint
			// and cache the response. For now, we'll just log it.
			console.log(`Cache warming for ${pattern.url} with key ${cacheKey}`);
		} catch (error) {
			console.error(`Cache warming failed for ${pattern.url}:`, error);
		}
	}
};

// Advanced cache key generator for RESTful APIs
export const createRestfulCacheKey = (req: Request): string => {
	const parts = [req.method.toLowerCase(), req.path];

	// Add resource identifier for RESTful endpoints
	const idMatch = req.path.match(/\/([a-fA-F0-9-]{36}|[\d]+)$/);
	if (idMatch) {
		parts.push(`id:${idMatch[1]}`);
	}

	// Add pagination parameters
	if (req.query.page || req.query.limit || req.query.offset) {
		const pagination = {
			page: req.query.page || '1',
			limit: req.query.limit || '10',
			offset: req.query.offset || '0',
		};
		parts.push(`pagination:${JSON.stringify(pagination)}`);
	}

	// Add sorting parameters
	if (req.query.sort || req.query.order) {
		const sorting = {
			sort: req.query.sort,
			order: req.query.order || 'asc',
		};
		parts.push(`sort:${JSON.stringify(sorting)}`);
	}

	// Add filter parameters (excluding pagination and sorting)
	const filters = { ...req.query };
	delete filters.page;
	delete filters.limit;
	delete filters.offset;
	delete filters.sort;
	delete filters.order;

	if (Object.keys(filters).length > 0) {
		const sortedFilters = Object.keys(filters)
			.sort()
			.reduce(
				(acc, key) => {
					acc[key] = filters[key];
					return acc;
				},
				{} as Record<string, unknown>,
			);
		parts.push(`filters:${JSON.stringify(sortedFilters)}`);
	}

	const keyString = parts.join('|');
	return crypto.createHash('sha256').update(keyString).digest('hex').substring(0, 16);
};

// Conditional cache skip helper
export const skipCacheForAuthenticated = (req: Request): boolean => {
	return !!(req.headers.authorization || req.headers['x-api-key'] || req.user);
};

export const skipCacheForQueries = (req: Request): boolean => {
	return !!(req.query.search || req.query.q || req.query.filter);
};

export const skipCacheForNonGet = (req: Request): boolean => {
	return req.method !== 'GET';
};
