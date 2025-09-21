/**
 * nO Master Agent Loop - Authentication & Authorization Middleware
 *
 * Provides Express.js middleware for OAuth 2.0/OIDC authentication
 * and RBAC authorization with comprehensive security features.
 *
 * Co-authored-by: brAInwav Development Team
 */

import type { NextFunction, Request, Response } from 'express';
import { securityMetrics } from '../monitoring/prometheus-metrics.js';
import type { AuthenticationResult, OAuthProvider } from './oauth-provider.js';
import { type PolicyContext, rbacSystem } from './rbac-system.js';

export interface AuthenticatedRequest extends Request {
	user?: any;
	auth?: AuthenticationResult;
}

export interface AuthMiddlewareConfig {
	oauthProvider: OAuthProvider;
	skipPaths?: string[];
	enforceHttps?: boolean;
	rateLimiting?: {
		enabled: boolean;
		maxRequests: number;
		windowMs: number;
	};
}

/**
 * Authentication Middleware
 */
export class AuthMiddleware {
	private config: AuthMiddlewareConfig;
	private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

	constructor(config: AuthMiddlewareConfig) {
		this.config = config;
	}

	/**
	 * Main authentication middleware
	 */
	authenticate() {
		return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
			try {
				// Skip authentication for certain paths
				if (this.shouldSkipAuth(req.path)) {
					return next();
				}

				// Enforce HTTPS in production
				if (
					this.config.enforceHttps &&
					req.headers['x-forwarded-proto'] !== 'https' &&
					req.protocol !== 'https'
				) {
					res.status(400).json({
						error: 'HTTPS required',
						message: 'This endpoint requires HTTPS connection',
					});
					return;
				}

				// Rate limiting
				if (this.config.rateLimiting?.enabled) {
					const rateLimitResult = this.checkRateLimit(req);
					if (!rateLimitResult.allowed) {
						securityMetrics.rateLimitHits.labels(this.getClientId(req), req.path).inc();

						res.status(429).json({
							error: 'Rate limit exceeded',
							message: 'Too many requests, please try again later',
							retryAfter: rateLimitResult.retryAfter,
						});
						return;
					}
				}

				// Extract token from request
				const token = this.extractToken(req);
				if (!token) {
					res.status(401).json({
						error: 'Missing token',
						message: 'Authentication token is required',
					});
					return;
				}

				// Validate token
				const authResult = await this.config.oauthProvider.validateToken(token);
				if (!authResult.success) {
					securityMetrics.authAttempts.labels('jwt', 'failure').inc();
					res.status(401).json({
						error: 'Invalid token',
						message: authResult.error || 'Token validation failed',
						code: authResult.errorCode,
					});
					return;
				}

				// Attach user information to request
				req.user = authResult.user;
				req.auth = authResult;

				securityMetrics.authAttempts.labels('jwt', 'success').inc();
				next();
			} catch (error) {
				securityMetrics.authAttempts.labels('middleware', 'error').inc();
				console.error('Authentication middleware error:', error);
				res.status(500).json({
					error: 'Authentication error',
					message: 'Internal authentication error',
				});
			}
		};
	}

	/**
	 * Authorization middleware factory
	 */
	authorize(resource: string, action: string) {
		return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
			try {
				if (!req.user) {
					res.status(401).json({
						error: 'Not authenticated',
						message: 'Authentication required for this endpoint',
					});
					return;
				}

				// Build policy context
				const context: PolicyContext = {
					user: req.user,
					resource,
					action,
					environment: {
						endpoint: req.path,
						method: req.method,
						timestamp: Date.now(),
					},
					request: {
						ip: this.getClientIP(req),
						userAgent: req.headers['user-agent'],
						timestamp: Date.now(),
					},
				};

				// Check authorization
				const authzResult = await rbacSystem.authorize(context);

				if (!authzResult.allowed) {
					res.status(403).json({
						error: 'Forbidden',
						message: authzResult.reason || 'Insufficient permissions',
						missingPermissions: authzResult.missingPermissions,
					});
					return;
				}

				next();
			} catch (error) {
				console.error('Authorization middleware error:', error);
				res.status(500).json({
					error: 'Authorization error',
					message: 'Internal authorization error',
				});
			}
		};
	}

	/**
	 * OAuth callback handler
	 */
	handleOAuthCallback() {
		return async (req: Request, res: Response): Promise<void> => {
			try {
				const { code, state, error } = req.query;

				if (error) {
					res.status(400).json({
						error: 'OAuth error',
						message: error as string,
					});
					return;
				}

				if (!code) {
					res.status(400).json({
						error: 'Missing code',
						message: 'Authorization code is required',
					});
					return;
				}

				// Exchange code for tokens
				const authResult = await this.config.oauthProvider.exchangeCodeForTokens(
					code as string,
					state as string,
				);

				if (!authResult.success) {
					res.status(400).json({
						error: 'Token exchange failed',
						message: authResult.error,
						code: authResult.errorCode,
					});
					return;
				}

				// Set secure cookie with token
				res.cookie('auth_token', authResult.token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'strict',
					maxAge: 3600000, // 1 hour
				});

				// Redirect to application
				const redirectUrl =
					state && typeof state === 'string' ? Buffer.from(state, 'base64').toString() : '/';
				res.redirect(redirectUrl);
			} catch (error) {
				console.error('OAuth callback error:', error);
				res.status(500).json({
					error: 'OAuth callback error',
					message: 'Failed to process OAuth callback',
				});
			}
		};
	}

	/**
	 * Login endpoint
	 */
	handleLogin() {
		return (req: Request, res: Response): void => {
			const { redirect } = req.query;
			const state =
				redirect && typeof redirect === 'string'
					? Buffer.from(redirect).toString('base64')
					: undefined;
			const nonce = this.generateNonce();

			const authUrl = this.config.oauthProvider.getAuthorizationUrl(state, nonce);

			res.json({
				authUrl,
				state,
				nonce,
			});
		};
	}

	/**
	 * Logout endpoint
	 */
	handleLogout() {
		return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
			try {
				if (req.auth?.token) {
					await this.config.oauthProvider.logout(req.auth.token, req.auth.refreshToken);
				}

				// Clear cookie
				res.clearCookie('auth_token');

				res.json({
					message: 'Logged out successfully',
				});
			} catch (error) {
				console.error('Logout error:', error);
				res.status(500).json({
					error: 'Logout error',
					message: 'Failed to logout',
				});
			}
		};
	}

	/**
	 * User info endpoint
	 */
	handleUserInfo() {
		return (req: AuthenticatedRequest, res: Response): void => {
			if (!req.user) {
				res.status(401).json({
					error: 'Not authenticated',
					message: 'Authentication required',
				});
				return;
			}

			// Get user's effective permissions
			const permissions = rbacSystem.getUserEffectivePermissions(req.user.sub);

			res.json({
				user: {
					sub: req.user.sub,
					email: req.user.email,
					name: req.user.name,
					roles: req.user.roles,
					groups: req.user.groups,
				},
				permissions: permissions.map((p) => ({
					id: p.id,
					name: p.name,
					resource: p.resource,
					action: p.action,
				})),
			});
		};
	}

	/**
	 * Extract token from request
	 */
	private extractToken(req: Request): string | null {
		// Check Authorization header
		const authHeader = req.headers.authorization;
		if (authHeader?.startsWith('Bearer ')) {
			return authHeader.substring(7);
		}

		// Check cookie
		if (req.cookies?.auth_token) {
			return req.cookies.auth_token;
		}

		// Check query parameter (not recommended for production)
		if (req.query.token && typeof req.query.token === 'string') {
			return req.query.token;
		}

		return null;
	}

	/**
	 * Get client IP address
	 */
	private getClientIP(req: Request): string {
		return (
			(req.headers['x-forwarded-for'] as string) ||
			(req.headers['x-real-ip'] as string) ||
			req.connection.remoteAddress ||
			req.socket.remoteAddress ||
			'unknown'
		);
	}

	/**
	 * Get client identifier for rate limiting
	 */
	private getClientId(req: Request): string {
		// Use authenticated user ID if available
		if ((req as AuthenticatedRequest).user?.sub) {
			return (req as AuthenticatedRequest).user.sub;
		}

		// Fall back to IP address
		return this.getClientIP(req);
	}

	/**
	 * Check if authentication should be skipped
	 */
	private shouldSkipAuth(path: string): boolean {
		const skipPaths = this.config.skipPaths || [
			'/health',
			'/health/live',
			'/health/ready',
			'/metrics',
			'/auth/login',
			'/auth/callback',
		];

		return skipPaths.some((skipPath) => path === skipPath || path.startsWith(`${skipPath}/`));
	}

	/**
	 * Rate limiting check
	 */
	private checkRateLimit(req: Request): { allowed: boolean; retryAfter?: number } {
		if (!this.config.rateLimiting?.enabled) {
			return { allowed: true };
		}

		const clientId = this.getClientId(req);
		const now = Date.now();
		const window = this.config.rateLimiting.windowMs;
		const maxRequests = this.config.rateLimiting.maxRequests;

		const clientData = this.requestCounts.get(clientId);

		if (!clientData || now > clientData.resetTime) {
			// Reset or initialize counter
			this.requestCounts.set(clientId, {
				count: 1,
				resetTime: now + window,
			});
			return { allowed: true };
		}

		if (clientData.count >= maxRequests) {
			const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);
			return { allowed: false, retryAfter };
		}

		clientData.count++;
		return { allowed: true };
	}

	/**
	 * Generate nonce for OAuth flow
	 */
	private generateNonce(): string {
		return (
			Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
		);
	}
}

/**
 * Create authentication middleware
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig): AuthMiddleware {
	return new AuthMiddleware(config);
}
