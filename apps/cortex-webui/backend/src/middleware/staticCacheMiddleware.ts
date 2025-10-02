// Static Asset Caching Middleware for brAInwav Cortex WebUI
// High-performance static asset serving with CDN headers and compression

import type { NextFunction, Request, Response } from 'express';
import type { Stats } from 'node:fs';
import { createReadStream, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { cacheService } from '../services/cacheService.js';

export interface StaticCacheConfig {
	rootDir: string;
	maxAge?: number;
	immutableMaxAge?: number;
	brotli?: boolean;
	gzip?: boolean;
	etag?: boolean;
	lastModified?: boolean;
	rangeRequests?: boolean;
	cdnHeaders?: boolean;
	compressionThreshold?: number;
	mimeTypes?: Record<string, string>;
}

export interface CacheHeaders {
	'Cache-Control'?: string;
	ETag?: string;
	'Last-Modified'?: string;
	'Content-Encoding'?: string;
	Vary?: string;
	'X-Content-Type-Options'?: string;
	'X-Frame-Options'?: string;
	'Content-Security-Policy'?: string;
}

const defaultMimeTypes: Record<string, string> = {
	// Text files
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.xml': 'application/xml; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8',
	'.md': 'text/markdown; charset=utf-8',

	// Images
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.ico': 'image/x-icon',

	// Fonts
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.otf': 'font/otf',
	'.eot': 'application/vnd.ms-fontobject',

	// Audio/Video
	'.mp3': 'audio/mpeg',
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
	'.wav': 'audio/wav',

	// Documents
	'.pdf': 'application/pdf',
	'.doc': 'application/msword',
	'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'.xls': 'application/vnd.ms-excel',
	'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

	// Archives
	'.zip': 'application/zip',
	'.tar': 'application/x-tar',
	'.gz': 'application/gzip',
};

const defaultConfig: Required<Omit<StaticCacheConfig, 'rootDir' | 'mimeTypes'>> = {
	maxAge: 3600, // 1 hour for regular assets
	immutableMaxAge: 31536000, // 1 year for versioned assets
	brotli: true,
	gzip: true,
	etag: true,
	lastModified: true,
	rangeRequests: true,
	cdnHeaders: true,
	compressionThreshold: 1024, // 1KB
};

export const createStaticCacheMiddleware = (config: StaticCacheConfig) => {
	const opts = { ...defaultConfig, ...config };
	const mimeTypes = { ...defaultMimeTypes, ...config.mimeTypes };

	return (req: Request, res: Response, next: NextFunction): void => {
		const filePath = join(opts.rootDir, req.path);

		// Check if file exists
		const stats = statSync(filePath);
		if (!stats.isFile()) {
			next();
			return;
		}

		// Get file extension and MIME type
		const ext = extname(filePath).toLowerCase();
		const mimeType = mimeTypes[ext] || 'application/octet-stream';

		// Determine cache duration based on file patterns
		const isImmutable = isImmutableAsset(req.path);
		const maxAge = isImmutable ? opts.immutableMaxAge : opts.maxAge;

		// Generate ETag if enabled
		let etag: string | undefined;
		if (opts.etag) {
			etag = generateETag(stats);
		}

		// Get last modified time if enabled
		let lastModified: string | undefined;
		if (opts.lastModified) {
			lastModified = stats.mtime.toUTCString();
		}

		// Handle conditional requests
		if (etag && req.headers['if-none-match'] === etag) {
			res.status(304).end();
			return;
		}

		if (lastModified && req.headers['if-modified-since'] === lastModified) {
			res.status(304).end();
			return;
		}

		// Handle range requests if enabled
		if (opts.rangeRequests && req.headers.range) {
			handleRangeRequest(req, res, filePath, stats, mimeType, etag, lastModified);
			return;
		}

		// Set cache headers
		const cacheHeaders: CacheHeaders = {};

		// Cache-Control header
		const cacheControl = isImmutable
			? `public, max-age=${opts.immutableMaxAge}, immutable`
			: `public, max-age=${maxAge}`;
		cacheHeaders['Cache-Control'] = cacheControl;

		if (etag) {
			cacheHeaders['ETag'] = etag;
		}

		if (lastModified) {
			cacheHeaders['Last-Modified'] = lastModified;
		}

		// Add CDN headers if enabled
		if (opts.cdnHeaders) {
			cacheHeaders['Vary'] = 'Accept-Encoding';
			cacheHeaders['X-Content-Type-Options'] = 'nosniff';
			cacheHeaders['X-Frame-Options'] = 'SAMEORIGIN';

			// Basic CSP for static assets
			if (isHtmlFile(ext)) {
				cacheHeaders['Content-Security-Policy'] =
					"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
			}
		}

		// Set content type
		res.set('Content-Type', mimeType);
		res.set('Content-Length', stats.size.toString());

		// Apply cache headers
		Object.entries(cacheHeaders).forEach(([key, value]) => {
			if (value) {
				res.set(key, value);
			}
		});

		// Handle compression based on Accept-Encoding
		const acceptEncoding = req.headers['accept-encoding'] || '';
		const shouldCompress =
			stats.size >= opts.compressionThreshold && (opts.gzip || opts.brotli) && isCompressible(ext);

		if (shouldCompress) {
			handleCompressedResponse(req, res, filePath, stats, acceptEncoding, opts);
		} else {
			// Stream the file directly
			const stream = createReadStream(filePath);
			stream.pipe(res);

			stream.on('error', (error) => {
				console.error('Static file stream error:', error);
				if (!res.headersSent) {
					res.status(500).end();
				}
			});
		}
	};
};

function isImmutableAsset(path: string): boolean {
	// Check for common immutable asset patterns
	const immutablePatterns = [
		/\.[a-f0-9]{8,}\./, // Hashed files like app.abc12345.js
		/\/[a-f0-9]{8,}\//, // Hashed directories
		/\/v?\d+\.\d+\.\d+\//, // Versioned directories
		/\?v=\d+/, // Query string version
		/\?hash=/, // Query string hash
	];

	return immutablePatterns.some((pattern) => pattern.test(path));
}

function isHtmlFile(ext: string): boolean {
	return ['.html', '.htm'].includes(ext);
}

function isCompressible(ext: string): boolean {
	const compressibleTypes = [
		'.html',
		'.htm',
		'.css',
		'.js',
		'.json',
		'.xml',
		'.txt',
		'.md',
		'.svg',
		'.ttf',
		'.otf',
		'.eot',
		'.woff',
		'.woff2',
	];

	return compressibleTypes.includes(ext);
}

function generateETag(stats: Stats): string {
	const size = stats.size;
	const mtime = stats.mtime.getTime();
	const etag = `"${size}-${mtime}"`;
	return etag;
}

function handleRangeRequest(
	req: Request,
	res: Response,
	filePath: string,
	stats: Stats,
	mimeType: string,
	etag?: string,
	lastModified?: string,
): void {
	const range = req.headers.range;
	if (!range) {
		return;
	}

	const parts = range.replace(/bytes=/, '').split('-');
	const start = parseInt(parts[0], 10);
	const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
	const chunksize = end - start + 1;

	if (start >= stats.size || end >= stats.size || start > end) {
		res.status(416).set('Content-Range', `bytes */${stats.size}`).end();
		return;
	}

	res.status(206);
	res.set('Content-Range', `bytes ${start}-${end}/${stats.size}`);
	res.set('Accept-Ranges', 'bytes');
	res.set('Content-Length', chunksize.toString());
	res.set('Content-Type', mimeType);

	if (etag) {
		res.set('ETag', etag);
	}

	if (lastModified) {
		res.set('Last-Modified', lastModified);
	}

	const stream = createReadStream(filePath, { start, end });
	stream.pipe(res);

	stream.on('error', (error) => {
		console.error('Range request stream error:', error);
		if (!res.headersSent) {
			res.status(500).end();
		}
	});
}

async function handleCompressedResponse(
	_req: Request,
	res: Response,
	filePath: string,
	_stats: Stats,
	acceptEncoding: string,
	opts: Required<Omit<StaticCacheConfig, 'rootDir' | 'mimeTypes'>>,
): Promise<void> {
	try {
		const encoding = determineEncoding(acceptEncoding, opts);
		const cacheKey = `static:${filePath}:${encoding}`;

		// Try to get from cache first
		const cached = await cacheService.get<Buffer>(cacheKey, undefined, {
			namespace: 'static-cache',
			compress: false, // Already compressed
			ttl: opts.maxAge,
		});

		if (cached) {
			res.set('Content-Encoding', encoding);
			res.set('Content-Length', cached.length.toString());
			res.end(cached);
			return;
		}

		// Read and compress file (in production, you'd pre-compress these)
		const fileBuffer = await readFileAsync(filePath);
		let compressedBuffer: Buffer;

		if (encoding === 'br' && opts.brotli) {
			// Would use brotli compression here
			compressedBuffer = fileBuffer; // Placeholder
		} else if (encoding === 'gzip' && opts.gzip) {
			// Would use gzip compression here
			compressedBuffer = fileBuffer; // Placeholder
		} else {
			// No compression supported
			res.end(fileBuffer);
			return;
		}

		// Cache the compressed version
		await cacheService.set(cacheKey, compressedBuffer, {
			namespace: 'static-cache',
			compress: false,
			ttl: opts.maxAge,
		});

		res.set('Content-Encoding', encoding);
		res.set('Content-Length', compressedBuffer.length.toString());
		res.end(compressedBuffer);
	} catch (error) {
		console.error('Compression handling error:', error);
		// Fallback to uncompressed
		const stream = createReadStream(filePath);
		stream.pipe(res);
	}
}

function determineEncoding(
	acceptEncoding: string,
	opts: Required<Omit<StaticCacheConfig, 'rootDir' | 'mimeTypes'>>,
): string {
	if (opts.brotli && acceptEncoding.includes('br')) {
		return 'br';
	}
	if (opts.gzip && acceptEncoding.includes('gzip')) {
		return 'gzip';
	}
	return 'identity';
}

// Helper function to read file async
function readFileAsync(filePath: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		const stream = createReadStream(filePath);

		stream.on('data', (chunk: Buffer) => {
			chunks.push(chunk);
		});

		stream.on('end', () => {
			resolve(Buffer.concat(chunks));
		});

		stream.on('error', reject);
	});
}

// Convenience middleware for different asset types
export const createImageCacheMiddleware = (rootDir: string) =>
	createStaticCacheMiddleware({
		rootDir,
		maxAge: 86400, // 24 hours for images
		immutableMaxAge: 31536000, // 1 year for versioned images
		cdnHeaders: true,
	});

export const createFontCacheMiddleware = (rootDir: string) =>
	createStaticCacheMiddleware({
		rootDir,
		maxAge: 604800, // 1 week for fonts
		immutableMaxAge: 31536000, // 1 year for versioned fonts
		cdnHeaders: true,
	});

export const createCSSJSCacheMiddleware = (rootDir: string) =>
	createStaticCacheMiddleware({
		rootDir,
		maxAge: 3600, // 1 hour for CSS/JS
		immutableMaxAge: 31536000, // 1 year for versioned CSS/JS
		brotli: true,
		gzip: true,
		cdnHeaders: true,
	});

export const createDocumentCacheMiddleware = (rootDir: string) =>
	createStaticCacheMiddleware({
		rootDir,
		maxAge: 3600, // 1 hour for documents
		immutableMaxAge: 86400, // 1 day for versioned documents
		brotli: true,
		gzip: true,
		cdnHeaders: true,
	});

// Cache invalidation utilities
export const invalidateStaticCache = async (pattern: string): Promise<void> => {
	try {
		await cacheService.invalidatePattern(`static:${pattern}:*`, 'static-cache');
	} catch (error) {
		console.error('Static cache invalidation error:', error);
	}
};

// CDN configuration utilities
export const generateCDNHeaders = (req: Request): Record<string, string> => {
	const headers: Record<string, string> = {};

	// Add CDN-specific headers based on request
	if (req.headers['cf-ray']) {
		// Cloudflare
		headers['X-Cache-Status'] = (req.headers['cf-cache-status'] as string) || 'unknown';
	}

	if (req.headers['x-amz-cf-id']) {
		// CloudFront
		headers['X-Amz-Cf-Id'] = req.headers['x-amz-cf-id'] as string;
	}

	// Add country code if available from CDN
	if (req.headers['cf-ipcountry']) {
		headers['X-Country-Code'] = req.headers['cf-ipcountry'] as string;
	}

	return headers;
};

// Performance monitoring for static assets
export const trackStaticAssetPerformance = (
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	const startTime = Date.now();

	res.on('finish', () => {
		const duration = Date.now() - startTime;
		const size = parseInt(res.get('Content-Length') || '0', 10);

		// Track performance metrics
		console.log(`Static asset: ${req.path} - ${duration}ms - ${size} bytes - ${res.statusCode}`);

		// Could send to metrics service here
		// metricsService.recordStaticAssetRequest(req.path, duration, size, res.statusCode);
	});

	next();
};
