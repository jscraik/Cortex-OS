/**
 * Authentication and authorization middleware
 */

import { createPinoLogger } from '@voltagent/logger';

// Context type definition for Hono
export interface Context {
	req: {
		method: string;
		path: string;
		header(name: string): string | undefined;
		query(name: string): string | undefined;
	};
	res: {
		status: number;
	};
	header(name: string, value: string): void;
	json(data: any, status?: number): Response;
	get(name: string): any;
	set(name: string, value: any): void;
}

export type Next = () => Promise<void>;

const logger = createPinoLogger({ name: 'AuthMiddleware' });

export interface AuthConfig {
	// API key for authentication
	apiKey?: string;
	// JWT secret for token-based auth
	jwtSecret?: string;
	// Rate limiting
	rateLimitWindow?: number; // in ms
	rateLimitMax?: number; // max requests per window
	// Trusted IPs
	trustedIPs?: string[];
}

export interface AuthContext {
	userId?: string;
	roles?: string[];
	permissions?: string[];
	apiKey?: string;
}

// Simple in-memory rate limiter with cleanup
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup expired rate limit entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	const expiredKeys: string[] = [];

	for (const [key, data] of rateLimitStore) {
		// Remove entries older than 1 hour
		if (now > data.resetTime + 3600000) {
			expiredKeys.push(key);
		}
	}

	for (const key of expiredKeys) {
		rateLimitStore.delete(key);
	}

	if (expiredKeys.length > 0) {
		logger.debug(`Cleaned up ${expiredKeys.length} expired rate limit entries`);
	}
}, 300000); // 5 minutes

export function createAuthMiddleware(config: AuthConfig = {}) {
	const {
		apiKey,
		rateLimitWindow = 60000, // 1 minute
		rateLimitMax = 100, // 100 requests per minute
		trustedIPs = [],
	} = config;

	return async function auth(c: Context, next: Next) {
		const startTime = Date.now();

		try {
			// 1. Check IP allowlist if configured
			const clientIP =
				c.req.header('x-forwarded-for') ||
				c.req.header('x-real-ip') ||
				'unknown';
			if (trustedIPs.length > 0 && !trustedIPs.includes(clientIP)) {
				logger.warn('Blocked request from untrusted IP:', { ip: clientIP });
				return c.json({ error: 'Forbidden' }, 403);
			}

			// 2. Rate limiting
			const rateLimitKey = `rate_limit:${clientIP}`;
			const now = Date.now();
			const limitData = rateLimitStore.get(rateLimitKey);

			if (!limitData || now > limitData.resetTime) {
				rateLimitStore.set(rateLimitKey, {
					count: 1,
					resetTime: now + rateLimitWindow,
				});
			} else {
				limitData.count++;
				if (limitData.count > rateLimitMax) {
					logger.warn('Rate limit exceeded:', { ip: clientIP });
					return c.json({ error: 'Rate limit exceeded' }, 429);
				}
			}

			// 3. Authentication
			const authContext: AuthContext = {};

			// API Key authentication
			const providedApiKey =
				c.req.header('x-api-key') || c.req.query('api_key');
			if (apiKey && providedApiKey) {
				if (providedApiKey !== apiKey) {
					logger.warn('Invalid API key provided');
					return c.json({ error: 'Unauthorized' }, 401);
				}
				authContext.apiKey = providedApiKey;
				authContext.roles = ['api-user'];
				authContext.permissions = ['read', 'write'];
			}

			// Set auth context on request
			c.set('authContext', authContext);

			// 4. Authorization for protected routes
			const path = c.req.path;
			if (isProtectedRoute(path) && !authContext.apiKey) {
				logger.warn('Access denied to protected route:', {
					path,
					ip: clientIP,
				});
				return c.json({ error: 'Unauthorized' }, 401);
			}

			// Add security headers
			c.header('X-Content-Type-Options', 'nosniff');
			c.header('X-Frame-Options', 'DENY');
			c.header('X-XSS-Protection', '1; mode=block');
			c.header(
				'Strict-Transport-Security',
				'max-age=31536000; includeSubDomains',
			);
			c.header('Content-Security-Policy', "default-src 'self'");

			await next();

			// Log successful request
			const duration = Date.now() - startTime;
			logger.info('Request completed', {
				method: c.req.method,
				path,
				status: c.res.status,
				duration,
				ip: clientIP,
			});
		} catch (error) {
			logger.error('Auth middleware error:', error);
			return c.json({ error: 'Internal server error' }, 500);
		}
	};
}

function isProtectedRoute(path: string): boolean {
	// Define protected routes
	const protectedRoutes = ['/api/v1/agents', '/api/v1/tools', '/api/v1/memory'];

	return protectedRoutes.some((route) => path.startsWith(route));
}

// Helper to get auth context from request
export function getAuthContext(c: Context): AuthContext {
	return c.get('authContext') || {};
}

// RBAC helpers
export function hasPermission(c: Context, permission: string): boolean {
	const auth = getAuthContext(c);
	return auth.permissions?.includes(permission) || false;
}

export function hasRole(c: Context, role: string): boolean {
	const auth = getAuthContext(c);
	return auth.roles?.includes(role) || false;
}
