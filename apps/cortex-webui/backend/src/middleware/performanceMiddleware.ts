// Performance Middleware for brAInwav Cortex WebUI
// Advanced compression, rate limiting, and request optimization

import { createHash } from 'node:crypto';
import type { Transform } from 'node:stream';
import { constants, createBrotliCompress, createDeflate, createGzip } from 'node:zlib';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import SlowDown from 'express-slow-down';
import { MetricsService } from '../monitoring/services/metricsService.js';
import { cacheService } from '../services/cacheService.js';

export interface CompressionOptions {
	threshold?: number;
	level?: number;
	chunkSize?: number;
	windowBits?: number;
	memLevel?: number;
	strategy?: number;
}

export interface RateLimitOptions {
	windowMs?: number;
	max?: number;
	message?: string;
	standardHeaders?: boolean;
	legacyHeaders?: boolean;
	keyGenerator?: (req: Request) => string;
	skipSuccessfulRequests?: boolean;
	skipFailedRequests?: boolean;
}

export interface SlowDownOptions {
	windowMs?: number;
	delayAfter?: number;
	delayMs?: number;
	maxDelayMs?: number;
	keyGenerator?: (req: Request) => string;
}

export interface PerformanceConfig {
	compression?: CompressionOptions;
	rateLimit?: RateLimitOptions;
	slowDown?: SlowDownOptions;
	timeout?: number;
	requestLogging?: boolean;
	metricsCollection?: boolean;
	responseTimeThreshold?: number;
}

interface RequestWithPerformance extends Request {
	startTime?: number;
	compressionStream?: Transform;
}

// Custom compression middleware with support for Brotli, Gzip, and Deflate
export const createCompressionMiddleware = (options: CompressionOptions = {}) => {
	const opts = {
		threshold: options.threshold || 1024, // 1KB
		level: options.level || 6,
		chunkSize: options.chunkSize || 16384, // 16KB
		windowBits: options.windowBits || 15,
		memLevel: options.memLevel || 8,
		strategy: options.strategy || 0, // Z_DEFAULT_STRATEGY
	};

	return (req: Request, res: Response, next: NextFunction): void => {
		const reqWithPerf = req as RequestWithPerformance;

		// Check if client accepts compression
		const acceptEncoding = req.headers['accept-encoding'] || '';
		const contentType = (res.getHeader('Content-Type') as string) || '';

		// Don't compress already compressed content, images, or small responses
		if (shouldSkipCompression(contentType, acceptEncoding)) {
			next();
			return;
		} // Store original response methods
		const originalWrite = res.write;
		const originalEnd = res.end;
		const originalWriteHead = res.writeHead;

		let _compressed = false;
		let stream: Transform | null = null;

		// Choose compression method based on Accept-Encoding header
		if (acceptEncoding.includes('br')) {
			// Brotli compression
			stream = createBrotliCompress({
				params: {
					[constants.BROTLI_PARAM_QUALITY]: opts.level,
				},
				chunkSize: opts.chunkSize,
			});
			res.setHeader('Content-Encoding', 'br');
			_compressed = true;
		} else if (acceptEncoding.includes('gzip')) {
			// Gzip compression
			stream = createGzip({
				level: opts.level,
				chunkSize: opts.chunkSize,
				windowBits: opts.windowBits,
				memLevel: opts.memLevel,
				strategy: opts.strategy,
			});
			res.setHeader('Content-Encoding', 'gzip');
			_compressed = true;
		} else if (acceptEncoding.includes('deflate')) {
			// Deflate compression
			stream = createDeflate({
				level: opts.level,
				chunkSize: opts.chunkSize,
				windowBits: opts.windowBits,
				memLevel: opts.memLevel,
				strategy: opts.strategy,
			});
			res.setHeader('Content-Encoding', 'deflate');
			_compressed = true;
		}

		if (!stream) {
			next();
			return;
		} // Set Vary header to indicate that content varies by Accept-Encoding
		res.setHeader('Vary', 'Accept-Encoding');

		// Initialize compression data tracking
		let originalSize = 0;
		let compressedSize = 0;
		let aboveThreshold = false;

		// Override writeHead to capture content length
		res.writeHead = function (this: Response, statusCode: number, headers?: any): Response {
			const contentLength = this.getHeader('Content-Length');
			if (contentLength) {
				originalSize = parseInt(contentLength, 10);
				aboveThreshold = originalSize >= opts.threshold;
			}
			return originalWriteHead.call(this, statusCode, headers);
		};

		// Override write method
		res.write = function (
			this: Response,
			chunk: any,
			encoding?: BufferEncoding,
			cb?: (err?: Error) => void,
		): boolean {
			if (!aboveThreshold) {
				originalSize += Buffer.byteLength(chunk, encoding);
				if (originalSize >= opts.threshold) {
					aboveThreshold = true;
				} else {
					// Buffer until we reach threshold
					return true;
				}
			}

			if (aboveThreshold && stream) {
				if (encoding === 'utf-8') {
					chunk = Buffer.from(chunk, encoding);
				}
				return stream.write(chunk, cb);
			}
			return originalWrite.call(this, chunk, encoding, cb);
		};

		// Override end method
		res.end = function (
			this: Response,
			chunk?: any,
			encoding?: BufferEncoding,
			cb?: () => void,
		): Response {
			if (!aboveThreshold) {
				if (chunk) {
					originalSize += Buffer.byteLength(chunk, encoding);
				}
				// Response is too small to compress
				res.removeHeader('Content-Encoding');
				res.removeHeader('Vary');
				return originalEnd.call(this, chunk, encoding, cb);
			}

			if (stream) {
				stream.on('data', (data) => {
					compressedSize += data.length;
					originalWrite.call(res, data);
				});

				stream.on('end', () => {
					// Log compression metrics
					if (originalSize > 0 && compressedSize > 0) {
						const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
						console.log(
							`Compression: ${originalSize} -> ${compressedSize} bytes (${compressionRatio.toFixed(1)}% reduction)`,
						);

						// Record metrics
						const metricsService = MetricsService.getInstance();
						metricsService.recordHistogram('compression_ratio', compressionRatio);
						metricsService.recordHistogram('compressed_response_size', compressedSize);
					}

					originalEnd.call(this, chunk, encoding, cb);
				});

				if (chunk) {
					if (encoding === 'utf-8') {
						chunk = Buffer.from(chunk, encoding);
					}
					stream.end(chunk);
				} else {
					stream.end();
				}
			} else {
				return originalEnd.call(this, chunk, encoding, cb);
			}

			return this;
		};

		reqWithPerf.compressionStream = stream;
		next();
	};
};

// Smart rate limiting with different limits for different user types
export const createSmartRateLimitMiddleware = (options: RateLimitOptions = {}) => {
	const defaultOptions = {
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 100, // 100 requests per window
		message: {
			error: 'Too many requests from this IP, please try again later.',
			brand: 'brAInwav',
			retryAfter: '15 minutes',
		},
		standardHeaders: true,
		legacyHeaders: false,
		skipSuccessfulRequests: false,
		skipFailedRequests: false,
	};

	const opts = { ...defaultOptions, ...options };

	return rateLimit({
		windowMs: opts.windowMs!,
		max: opts.max!,
		message: opts.message!,
		standardHeaders: opts.standardHeaders!,
		legacyHeaders: opts.legacyHeaders!,
		keyGenerator: opts.keyGenerator || generateSmartKey,
		skipSuccessfulRequests: opts.skipSuccessfulRequests!,
		skipFailedRequests: opts.skipFailedRequests!,
		handler: (req, res) => {
			const metricsService = MetricsService.getInstance();
			metricsService.incrementCounter('rate_limit_exceeded', {
				ip: req.ip,
				path: req.path,
				user_agent: req.get('User-Agent'),
			});

			res.status(429).json(opts.message);
		},
	});
};

// Progressive slowdown for approaching rate limits
export const createSlowDownMiddleware = (options: SlowDownOptions = {}) => {
	const defaultOptions = {
		windowMs: 15 * 60 * 1000, // 15 minutes
		delayAfter: 50, // Start slowing down after 50 requests
		delayMs: 500, // Add 500ms delay per request after delayAfter
		maxDelayMs: 5000, // Maximum delay of 5 seconds
		keyGenerator: generateSmartKey,
	};

	const opts = { ...defaultOptions, ...options };

	return SlowDown({
		windowMs: opts.windowMs!,
		delayAfter: opts.delayAfter!,
		delayMs: opts.delayMs!,
		maxDelayMs: opts.maxDelayMs!,
		keyGenerator: opts.keyGenerator!,
	});
};

// Request timeout middleware
export const createTimeoutMiddleware = (timeoutMs: number = 30000) => {
	return (req: RequestWithPerformance, res: Response, next: NextFunction): void => {
		const timeout = setTimeout(() => {
			if (!res.headersSent) {
				const metricsService = MetricsService.getInstance();
				metricsService.incrementCounter('request_timeout', {
					path: req.path,
					method: req.method,
				});

				res.status(408).json({
					error: 'Request timeout',
					message: `Request took longer than ${timeoutMs}ms to process`,
					brand: 'brAInwav',
				});
			}
		}, timeoutMs);

		res.on('finish', () => {
			clearTimeout(timeout);
		});

		res.on('close', () => {
			clearTimeout(timeout);
		});

		next();
	};
};

// Request logging middleware with performance metrics
export const createRequestLoggingMiddleware = (
	options: {
		logSlowRequests?: boolean;
		slowRequestThreshold?: number;
		logHeaders?: boolean;
		logBody?: boolean;
	} = {},
) => {
	const opts = {
		logSlowRequests: options.logSlowRequests !== false,
		slowRequestThreshold: options.slowRequestThreshold || 1000, // 1 second
		logHeaders: options.logHeaders || false,
		logBody: options.logBody || false,
	};

	return (req: RequestWithPerformance, res: Response, next: NextFunction): void => {
		req.startTime = Date.now();

		const originalSend = res.send;
		res.send = function (this: Response, body: any): Response {
			const duration = Date.now() - req.startTime!;
			const contentLength = this.getHeader('Content-Length');
			const contentType = this.getHeader('Content-Type');

			// Log all requests or only slow requests
			if (opts.logSlowRequests ? duration >= opts.slowRequestThreshold! : true) {
				const logData: Record<string, any> = {
					method: req.method,
					url: req.url,
					status: this.statusCode,
					duration: `${duration}ms`,
					contentLength: contentLength || '0',
					contentType: contentType || 'unknown',
					ip: req.ip,
					userAgent: req.get('User-Agent'),
					compressed: !!req.compressionStream,
				};

				if (opts.logHeaders) {
					logData.headers = req.headers;
				}

				if (opts.logBody && req.body) {
					logData.body = req.body;
				}

				console.log(JSON.stringify(logData));
			}

			// Record metrics
			const metricsService = MetricsService.getInstance();
			metricsService.recordHttpRequest(req.method, req.path, this.statusCode, duration);
			metricsService.recordHistogram('request_duration', duration, {
				method: req.method,
				path: req.path,
				status_code: this.statusCode.toString(),
			});

			// Alert on slow requests
			if (duration >= opts.slowRequestThreshold!) {
				metricsService.incrementCounter('slow_request', {
					path: req.path,
					method: req.method,
					duration: duration.toString(),
				});
			}

			return originalSend.call(this, body);
		};

		next();
	};
};

// Response size monitoring middleware
export const createResponseSizeMiddleware = () => {
	return (req: Request, res: Response, next: NextFunction): void => {
		let responseSize = 0;
		const originalWrite = res.write;
		const originalEnd = res.end;

		res.write = function (
			this: Response,
			chunk: any,
			encoding?: BufferEncoding,
			cb?: (err?: Error) => void,
		): boolean {
			responseSize += Buffer.byteLength(chunk, encoding);
			return originalWrite.call(this, chunk, encoding, cb);
		};

		res.end = function (
			this: Response,
			chunk?: any,
			encoding?: BufferEncoding,
			cb?: () => void,
		): Response {
			if (chunk) {
				responseSize += Buffer.byteLength(chunk, encoding);
			}

			// Record response size metrics
			const metricsService = MetricsService.getInstance();
			metricsService.recordHistogram('response_size_bytes', responseSize, {
				path: req.path,
				method: req.method,
			});

			// Set response size header
			if (!this.getHeader('Content-Length')) {
				this.setHeader('Content-Length', responseSize.toString());
			}

			return originalEnd.call(this, chunk, encoding, cb);
		};

		next();
	};
};

// Health check with performance metrics
export const createPerformanceHealthMiddleware = () => {
	return async (_req: Request, res: Response): Promise<void> => {
		try {
			const metricsService = MetricsService.getInstance();
			const metrics = await metricsService.getMetrics();

			// Get cache service stats
			const cacheStats = cacheService.getStats();

			// Get database service stats if available
			const dbStats = await getDatabaseStats();

			const health = {
				status: 'healthy',
				timestamp: new Date().toISOString(),
				brand: 'brAInwav',
				uptime: process.uptime(),
				memory: {
					used: process.memoryUsage(),
					heapUsed: process.memoryUsage().heapUsed,
					heapTotal: process.memoryUsage().heapTotal,
					external: process.memoryUsage().external,
				},
				cache: {
					hitRate: cacheStats.hitRate,
					totalRequests: cacheStats.hits + cacheStats.misses,
					memoryUsage: cacheStats.memoryUsage,
					keyCount: cacheStats.keyCount,
				},
				database: dbStats,
				metrics: {
					totalRequests: metrics.http_requests_total || 0,
					averageResponseTime: metrics.http_request_duration_seconds_average || 0,
					errorRate: metrics.http_requests_failed_rate || 0,
				},
			};

			// Determine health status based on metrics
			const errorRate = metrics.http_requests_failed_rate || 0;
			const avgResponseTime = metrics.http_request_duration_seconds_average || 0;
			const memoryUsageRatio = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;

			if (errorRate > 0.05 || avgResponseTime > 5 || memoryUsageRatio > 0.9) {
				health.status = 'degraded';
				res.status(200);
			}

			if (errorRate > 0.2 || avgResponseTime > 10 || memoryUsageRatio > 0.95) {
				health.status = 'unhealthy';
				res.status(503);
			}

			res.json(health);
		} catch (error) {
			console.error('Performance health check error:', error);
			res.status(503).json({
				status: 'unhealthy',
				error: 'Health check failed',
				timestamp: new Date().toISOString(),
				brand: 'brAInwav',
			});
		}
	};
};

// Helper functions
function shouldSkipCompression(contentType: string, acceptEncoding: string): boolean {
	// Don't compress already compressed content
	const compressedTypes = [
		'image/png',
		'image/jpeg',
		'image/gif',
		'image/webp',
		'application/gzip',
		'application/zip',
		'application/x-compress',
		'application/x-gzip',
	];

	const isCompressed = compressedTypes.some((type) => contentType.includes(type));
	const acceptsCompression =
		acceptEncoding &&
		(acceptEncoding.includes('gzip') ||
			acceptEncoding.includes('deflate') ||
			acceptEncoding.includes('br'));

	return !acceptsCompression || isCompressed;
}

function generateSmartKey(req: Request): string {
	// Use different keys for different user types
	const user = req.user as any;
	const apiKey = req.headers['x-api-key'] as string;
	const ip = req.ip || req.connection.remoteAddress || 'unknown';

	if (user?.id) {
		// Authenticated user - use user ID
		return `user:${user.id}`;
	} else if (apiKey) {
		// API key authentication - use key hash
		return `api:${createHash('sha256').update(apiKey).digest('hex').substring(0, 16)}`;
	} else {
		// Anonymous user - use IP
		return `ip:${ip}`;
	}
}

async function getDatabaseStats(): Promise<any> {
	try {
		// This would integrate with the database service
		// For now, return placeholder data
		return {
			status: 'connected',
			connectionPoolSize: 5,
			activeConnections: 2,
			totalQueries: 1000,
			averageQueryTime: 25,
		};
	} catch (error) {
		return {
			status: 'error',
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

// Pre-configured middleware combinations
export const performanceMiddleware = {
	// Lightweight - for high-throughput APIs
	lightweight: [
		createCompressionMiddleware({ threshold: 2048 }),
		createSmartRateLimitMiddleware({ max: 1000, windowMs: 60000 }),
		createRequestLoggingMiddleware({ logSlowRequests: true, slowRequestThreshold: 500 }),
	],

	// Standard - for general APIs
	standard: [
		createCompressionMiddleware({ threshold: 1024 }),
		createSmartRateLimitMiddleware({ max: 100, windowMs: 900000 }),
		createSlowDownMiddleware({ delayAfter: 80, delayMs: 200 }),
		createRequestLoggingMiddleware(),
		createResponseSizeMiddleware(),
	],

	// Strict - for sensitive endpoints
	strict: [
		createCompressionMiddleware({ threshold: 512 }),
		createSmartRateLimitMiddleware({ max: 50, windowMs: 900000 }),
		createSlowDownMiddleware({ delayAfter: 40, delayMs: 500, maxDelayMs: 3000 }),
		createTimeoutMiddleware(15000),
		createRequestLoggingMiddleware({ logSlowRequests: true, slowRequestThreshold: 300 }),
		createResponseSizeMiddleware(),
	],
};

// Rate limit configurations for different endpoints
export const rateLimitConfigs = {
	// Authentication endpoints - very strict
	auth: createSmartRateLimitMiddleware({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 5, // 5 attempts per 15 minutes
		message: {
			error: 'Too many authentication attempts, please try again later.',
			brand: 'brAInwav',
			retryAfter: '15 minutes',
		},
	}),

	// API endpoints - standard
	api: createSmartRateLimitMiddleware({
		windowMs: 15 * 60 * 1000,
		max: 100,
	}),

	// File upload - stricter
	upload: createSmartRateLimitMiddleware({
		windowMs: 60 * 60 * 1000, // 1 hour
		max: 20, // 20 uploads per hour
	}),

	// Search endpoints - higher limit but with slowdown
	search: [
		createSmartRateLimitMiddleware({
			windowMs: 60 * 1000, // 1 minute
			max: 60, // 60 searches per minute
		}),
		createSlowDownMiddleware({
			delayAfter: 30,
			delayMs: 1000,
			maxDelayMs: 5000,
		}),
	],
};
