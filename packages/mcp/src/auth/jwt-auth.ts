import jwt from 'jsonwebtoken';
import { HTTPException } from '../errors.js';

interface JWTPayload {
	userId: string;
	sessionId: string;
	roles?: string[];
	permissions?: string[];
	iat?: number;
	exp?: number;
}

interface AuthConfig {
	secret: string;
	issuer?: string;
	audience?: string;
	algorithm?: jwt.Algorithm;
	expiresIn?: string | number;
}

export class JWTAuth {
	private config: AuthConfig;
	private jwtAvailable: boolean;

	constructor(config: AuthConfig) {
		this.config = {
			algorithm: 'HS256',
			expiresIn: '1h',
			...config,
		};

		// Check if JWT library is available
		this.jwtAvailable = true;
		try {
			jwt.sign({}, 'test');
		} catch (error) {
			console.warn('JWT library not available, falling back to static token');
			this.jwtAvailable = false;
		}
	}

	/**
	 * Create a JWT token for a user
	 */
	createToken(
		payload: Omit<JWTPayload, 'iat' | 'exp'>,
		options?: {
			expiresIn?: string | number;
			issuer?: string;
			audience?: string;
		},
	): string {
		if (!this.jwtAvailable) {
			// Fallback to static token for development/testing
			return `static-${payload.userId}-${Date.now()}`;
		}

		const tokenPayload: JWTPayload = {
			...payload,
			iat: Math.floor(Date.now() / 1000),
		};

		const signOptions: jwt.SignOptions = {
			algorithm: this.config.algorithm,
			issuer: options?.issuer || this.config.issuer,
			audience: options?.audience || this.config.audience,
			expiresIn: options?.expiresIn || this.config.expiresIn,
		};

		return jwt.sign(tokenPayload, this.config.secret, signOptions);
	}

	/**
	 * Validate a JWT token and return the payload
	 */
	async validateToken(token: string): Promise<JWTPayload> {
		if (!this.jwtAvailable) {
			// Validate static token
			if (token.startsWith('static-')) {
				return { userId: token.split('-')[1], valid: true };
			}
			throw new HTTPException(401, 'Invalid static token');
		}

		try {
			const payload = jwt.verify(token, this.config.secret, {
				algorithms: [this.config.algorithm!],
				issuer: this.config.issuer,
				audience: this.config.audience,
			}) as JWTPayload;

			return payload;
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				throw new HTTPException(401, 'Token expired');
			}
			if (error instanceof jwt.JsonWebTokenError) {
				throw new HTTPException(401, 'Invalid token');
			}
			throw new HTTPException(401, 'Authentication failed');
		}
	}

	/**
	 * Refresh an expired token
	 */
	async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
		const payload = await this.validateToken(refreshToken);

		// Create new access token with shorter expiration
		const accessToken = this.createToken(
			{
				userId: payload.userId,
				sessionId: payload.sessionId,
				roles: payload.roles,
				permissions: payload.permissions,
			},
			{ expiresIn: '15m' },
		);

		// Create new refresh token with longer expiration
		const newRefreshToken = this.createToken(
			{
				userId: payload.userId,
				sessionId: payload.sessionId,
				roles: payload.roles,
				permissions: payload.permissions,
			},
			{ expiresIn: '7d' },
		);

		return { accessToken, refreshToken: newRefreshToken };
	}

	/**
	 * Check if user has required role
	 */
	hasRole(payload: JWTPayload, role: string): boolean {
		return payload.roles?.includes(role) || false;
	}

	/**
	 * Check if user has required permission
	 */
	hasPermission(payload: JWTPayload, permission: string): boolean {
		return payload.permissions?.includes(permission) || false;
	}

	/**
	 * Extract token from Authorization header
	 */
	extractTokenFromHeader(authHeader: string | undefined): string | null {
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return null;
		}
		return authHeader.substring(7);
	}

	/**
	 * Create middleware for Express.js
	 */
	middleware() {
		return async (req: any, res: any, next: any) => {
			try {
				const token = this.extractTokenFromHeader(req.headers.authorization);

				if (!token) {
					throw new HTTPException(401, 'Missing authorization header');
				}

				const payload = await this.validateToken(token);
				req.user = payload;
				next();
			} catch (error) {
				if (error instanceof HTTPException) {
					res.status(error.status).json({ error: error.message });
				} else {
					res.status(500).json({ error: 'Internal server error' });
				}
			}
		};
	}

	/**
	 * Create middleware with role requirements
	 */
	requireRole(role: string) {
		return async (req: any, res: any, next: any) => {
			try {
				await this.middleware()(req, res, () => {
					if (!this.hasRole(req.user, role)) {
						throw new HTTPException(403, 'Insufficient permissions');
					}
					next();
				});
			} catch (error) {
				if (error instanceof HTTPException) {
					res.status(error.status).json({ error: error.message });
				} else {
					res.status(500).json({ error: 'Internal server error' });
				}
			}
		};
	}

	/**
	 * Create middleware with permission requirements
	 */
	requirePermission(permission: string) {
		return async (req: any, res: any, next: any) => {
			try {
				await this.middleware()(req, res, () => {
					if (!this.hasPermission(req.user, permission)) {
						throw new HTTPException(403, 'Insufficient permissions');
					}
					next();
				});
			} catch (error) {
				if (error instanceof HTTPException) {
					res.status(error.status).json({ error: error.message });
				} else {
					res.status(500).json({ error: 'Internal server error' });
				}
			}
		};
	}
}

// Factory function to create JWTAuth instance from environment
export function createJWTAuth(): JWTAuth {
	const secret = process.env.MCP_JWT_SECRET || process.env.BETTER_AUTH_SECRET || 'mcp-secret';

	return new JWTAuth({
		secret,
		issuer: 'cortex-os-mcp',
		audience: 'cortex-os-clients',
		expiresIn: '1h',
	});
}

// Default export
export default JWTAuth;
