type PolicyRouter = {
	route: (input: {
		interfaceId: string;
		capabilities: string[];
		tags: string[];
		source: string;
	}) => Promise<any>;
	explain: (requestId: string) => any;
};

import { createJWTAuth, type JWTAuth } from '../auth/jwt-auth.js';
import { HTTPException } from '../errors.js';
import { Server } from '../server.js';
import { createRoutingTools } from './routing-tools.js';

interface AuthServerConfig {
	jwt?: JWTAuth;
	requireAuth?: boolean;
	allowedOrigins?: string[];
	rateLimit?: {
		enabled: boolean;
		windowMs: number;
		max: number;
	};
	router?: PolicyRouter;
}

export class AuthServer extends Server {
	private jwt: JWTAuth;
	private requireAuth: boolean;
	private allowedOrigins: string[];
	private rateLimit: AuthServerConfig['rateLimit'];
	private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

	constructor(config: AuthServerConfig = {}) {
		super();

		this.jwt = config.jwt || createJWTAuth();
		this.requireAuth = config.requireAuth ?? true;
		this.allowedOrigins = config.allowedOrigins || ['*'];
		this.rateLimit = config.rateLimit || { enabled: true, windowMs: 60000, max: 100 };

		if (config.router) {
			for (const tool of createRoutingTools(config.router)) {
				this.registerTool(tool);
			}
		}
	}

	/**
	 * Override handleRequest to add authentication
	 */
	async handleRequest(request: any): Promise<any> {
		// Apply CORS
		this.applyCORS(request);

		// Apply rate limiting
		if (this.rateLimit.enabled) {
			await this.checkRateLimit(request);
		}

		// Apply authentication
		if (this.requireAuth) {
			await this.authenticate(request);
		}

		// Call parent handleRequest
		return super.handleRequest(request);
	}

	/**
	 * Apply CORS headers
	 */
	private applyCORS(request: any): void {
		const origin = request.headers?.origin;

		if (origin) {
			// Check if origin is allowed
			const isAllowed = this.allowedOrigins.includes('*') || this.allowedOrigins.includes(origin);

			if (isAllowed) {
				request.corsHeaders = {
					'Access-Control-Allow-Origin': origin,
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					'Access-Control-Allow-Credentials': 'true',
				};
			}
		}

		// Handle preflight requests
		if (request.method === 'OPTIONS') {
			throw new HTTPException(204, 'No Content', {
				headers: request.corsHeaders,
			});
		}
	}

	/**
	 * Check rate limiting
	 */
	private async checkRateLimit(request: any): Promise<void> {
		const clientId = this.getClientId(request);
		const now = Date.now();
		const windowStart = now - this.rateLimit.windowMs;

		// Clean expired entries
		for (const [key, data] of this.rateLimitStore.entries()) {
			if (data.resetTime < now) {
				this.rateLimitStore.delete(key);
			}
		}

		// Get or create rate limit entry
		let entry = this.rateLimitStore.get(clientId);
		if (!entry || entry.resetTime < windowStart) {
			entry = { count: 0, resetTime: now + this.rateLimit.windowMs };
			this.rateLimitStore.set(clientId, entry);
		}

		// Check if limit exceeded
		if (entry.count >= this.rateLimit.max) {
			throw new HTTPException(429, 'Too many requests', {
				headers: {
					'X-RateLimit-Limit': this.rateLimit.max.toString(),
					'X-RateLimit-Remaining': '0',
					'X-RateLimit-Reset': entry.resetTime.toString(),
				},
			});
		}

		entry.count++;

		// Add rate limit headers to response
		if (!request.rateLimitHeaders) {
			request.rateLimitHeaders = {
				'X-RateLimit-Limit': this.rateLimit.max.toString(),
				'X-RateLimit-Remaining': (this.rateLimit.max - entry.count).toString(),
				'X-RateLimit-Reset': entry.resetTime.toString(),
			};
		}
	}

	/**
	 * Get client identifier for rate limiting
	 */
	private getClientId(request: any): string {
		// Try to get from authenticated user first
		if (request.user?.userId) {
			return `user:${request.user.userId}`;
		}

		// Fall back to IP address
		return request.ip || request.connection?.remoteAddress || 'unknown';
	}

	/**
	 * Authenticate the request
	 */
	private async authenticate(request: any): Promise<void> {
		const authHeader = request.headers?.authorization;

		if (!authHeader) {
			throw new HTTPException(401, 'Missing authorization header');
		}

		try {
			const token = this.jwt.extractTokenFromHeader(authHeader);
			if (!token) {
				throw new HTTPException(401, 'Invalid authorization header format');
			}

			const payload = await this.jwt.validateToken(token);
			request.user = payload;
			request.auth = {
				token,
				payload,
			};
		} catch (error) {
			if (error instanceof HTTPException) {
				throw error;
			}
			throw new HTTPException(401, 'Authentication failed');
		}
	}

	/**
	 * Create authenticated tool handler
	 */
	createAuthTool(
		name: string,
		handler: (params: any, context: any) => Promise<any>,
		options?: {
			requiredRoles?: string[];
			requiredPermissions?: string[];
		},
	) {
		return {
			name,
			description: `Authenticated tool: ${name}`,
			inputSchema: {
				type: 'object',
				properties: {},
				required: [],
			},
			handler: async (params: any, context: any) => {
				const request = context?.request || {};

				// Check authentication
				if (!request.user) {
					throw new HTTPException(401, 'Authentication required');
				}

				// Check roles
				if (options?.requiredRoles) {
					for (const role of options.requiredRoles) {
						if (!this.jwt.hasRole(request.user, role)) {
							throw new HTTPException(403, `Required role: ${role}`);
						}
					}
				}

				// Check permissions
				if (options?.requiredPermissions) {
					for (const permission of options.requiredPermissions) {
						if (!this.jwt.hasPermission(request.user, permission)) {
							throw new HTTPException(403, `Required permission: ${permission}`);
						}
					}
				}

				// Call the original handler
				return handler(params, { ...context, user: request.user });
			},
		};
	}

	/**
	 * Create a token for service-to-service authentication
	 */
	createServiceToken(serviceName: string, scopes: string[] = []): string {
		return this.jwt.createToken(
			{
				userId: `service:${serviceName}`,
				sessionId: `service-${Date.now()}`,
				roles: ['service'],
				permissions: scopes,
			},
			{ expiresIn: '24h' },
		);
	}

	/**
	 * Validate service token
	 */
	async validateServiceToken(token: string): Promise<{ serviceName: string; scopes: string[] }> {
		const payload = await this.jwt.validateToken(token);

		if (!payload.userId?.startsWith('service:')) {
			throw new HTTPException(401, 'Invalid service token');
		}

		return {
			serviceName: payload.userId.substring('service:'.length),
			scopes: payload.permissions || [],
		};
	}

	/**
	 * Override sendResponse to add CORS headers
	 */
	async sendResponse(response: any, data: any): Promise<void> {
		// Add CORS headers if they exist
		if (response.request?.corsHeaders) {
			Object.assign(response.headers || {}, response.request.corsHeaders);
		}

		// Add rate limit headers if they exist
		if (response.request?.rateLimitHeaders) {
			Object.assign(response.headers || {}, response.request.rateLimitHeaders);
		}

		return super.sendResponse(response, data);
	}
}

// Factory function to create AuthServer
export function createAuthServer(config?: AuthServerConfig): AuthServer {
	return new AuthServer(config);
}

export default AuthServer;
