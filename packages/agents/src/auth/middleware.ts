import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

type Next = () => Promise<void>;

import { extractAPIKey, getAPIKey, validateAPIKey } from './api-key';
import { verifyJWT } from './jwt';
import { createUserContextFromAPIKey } from './permissions';
import type { AuthMiddlewareOptions, UserContext } from './types';

/**
 * Authentication middleware that supports both JWT tokens and API keys
 */
export function authMiddleware(options: AuthMiddlewareOptions) {
	const { secret, jwtHeader = 'Authorization', skipPaths = [] } = options;

	return async (c: Context, next: Next) => {
		// Skip authentication for certain paths
		const path = c.req.path;
		if (skipPaths.includes(path)) {
			await next();
			return;
		}

		// Try JWT authentication first
		const authHeader = c.req.header(jwtHeader);
		if (authHeader?.startsWith('Bearer ')) {
			const token = authHeader.substring(7);
			try {
				const payload = await verifyJWT(token, secret);

				// Create user context from JWT
				const userContext: UserContext = {
					id: payload.sub,
					roles: payload.roles || [],
					permissions: payload.permissions || [],
					apiKeyId: payload.apiKeyId,
				};

				// Set user context in the request
				c.set('user', userContext);
				await next();
				return;
			} catch {
				// JWT verification failed, continue to API key authentication
			}
		}

		// Try API key authentication
		const apiKey = extractAPIKey(c.req.raw.headers);
		if (apiKey) {
			const isValid = await validateAPIKey(apiKey);
			if (isValid) {
				const keyInfo = await getAPIKey(apiKey);
				if (keyInfo) {
					const userContext = createUserContextFromAPIKey(keyInfo);
					c.set('user', userContext);
					await next();
					return;
				}
			}
		}

		// No valid authentication found
		throw new HTTPException(401, {
			message: 'Authentication required',
		});
	};
}

/**
 * Middleware to require specific permissions
 */
export function requirePermission(permission: string) {
	return async (c: Context, next: Next) => {
		const user = c.get('user') as UserContext | undefined;

		if (!user) {
			throw new HTTPException(401, {
				message: 'Authentication required',
			});
		}

		const { checkPermission } = await import('./permissions');
		if (!checkPermission(user, permission)) {
			throw new HTTPException(403, {
				message: 'Insufficient permissions',
			});
		}

		await next();
	};
}

/**
 * Middleware to require specific roles
 */
export function requireRole(role: string) {
	return async (c: Context, next: Next) => {
		const user = c.get('user') as UserContext | undefined;

		if (!user) {
			throw new HTTPException(401, {
				message: 'Authentication required',
			});
		}

		const { hasRole } = await import('./permissions');
		if (!hasRole(user, role)) {
			throw new HTTPException(403, {
				message: 'Insufficient permissions',
			});
		}

		await next();
	};
}

/**
 * Middleware to require admin role
 */
export function requireAdmin() {
	return requireRole('admin');
}

/**
 * Add security headers to the response
 */
export function securityHeaders() {
	return async (c: Context, next: Next) => {
		await next();

		// Add security headers
		c.header('X-Content-Type-Options', 'nosniff');
		c.header('X-Frame-Options', 'DENY');
		c.header('X-XSS-Protection', '1; mode=block');
		c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
		c.header('Content-Security-Policy', "default-src 'self'");

		// Prevent caching of authenticated responses
		if (c.get('user')) {
			c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
			c.header('Pragma', 'no-cache');
			c.header('Expires', '0');
		}
	};
}

/**
 * Helper to get current user from context
 */
export function getCurrentUser(c: Context): UserContext | undefined {
	return c.get('user');
}

/**
 * Helper to check if current user has permission
 */
export async function currentUserHasPermission(c: Context, permission: string): Promise<boolean> {
	const user = getCurrentUser(c);
	if (!user) return false;

	const { checkPermission } = await import('./permissions');
	return checkPermission(user, permission);
}

/**
 * Helper to check if current user has role
 */
export async function currentUserHasRole(c: Context, role: string): Promise<boolean> {
	const user = getCurrentUser(c);
	if (!user) return false;

	const { hasRole } = await import('./permissions');
	return hasRole(user, role);
}
