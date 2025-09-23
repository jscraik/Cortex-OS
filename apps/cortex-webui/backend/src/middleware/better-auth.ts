import { type NextFunction, Request, type Response } from 'express';
import { auth, authUtils } from '../auth';

// Extend Express Request type
export interface BetterAuthRequest extends Request {
	session?: any;
	user?: any;
	apiKey?: any;
}

// Authentication middleware using Better Auth
export const betterAuth = async (req: BetterAuthRequest, res: Response, next: NextFunction) => {
	try {
		// Convert Express request to Request object
		const request = new Request(req.url, {
			method: req.method,
			headers: new Headers(req.headers as any),
			body: req.body ? JSON.stringify(req.body) : undefined,
		});

		// Get session from Better Auth
		const session = await authUtils.getSession(request);

		if (!session) {
			return res.status(401).json({
				error: 'Authentication required',
				message: 'Please log in to access this resource',
			});
		}

		// Attach session and user to request
		req.session = session;
		req.user = session.user;

		next();
	} catch (error) {
		console.error('Better Auth authentication error:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: 'Authentication service unavailable',
		});
	}
};

// Optional authentication middleware (doesn't fail if not authenticated)
export const optionalBetterAuth = async (
	req: BetterAuthRequest,
	_res: Response,
	next: NextFunction,
) => {
	try {
		const request = new Request(req.url, {
			method: req.method,
			headers: new Headers(req.headers as any),
			body: req.body ? JSON.stringify(req.body) : undefined,
		});

		const session = await authUtils.getSession(request);

		// Attach session and user if available
		if (session) {
			req.session = session;
			req.user = session.user;
		}

		next();
	} catch (error) {
		console.error('Optional Better Auth error:', error);
		// Don't fail, just continue without auth
		next();
	}
};

// Role-based access control middleware
export const requireRole = (roles: string | string[]) => {
	return async (req: BetterAuthRequest, res: Response, next: NextFunction) => {
		try {
			const user = req.user;

			if (!user) {
				return res.status(401).json({
					error: 'Authentication required',
					message: 'Please log in to access this resource',
				});
			}

			const allowedRoles = Array.isArray(roles) ? roles : [roles];

			if (!allowedRoles.includes(user.role)) {
				return res.status(403).json({
					error: 'Insufficient permissions',
					message: 'You do not have permission to access this resource',
				});
			}

			next();
		} catch (error) {
			console.error('Role authorization error:', error);
			res.status(500).json({
				error: 'Internal server error',
				message: 'Authorization service unavailable',
			});
		}
	};
};

// API key authentication middleware
export const authenticateAPIKey = async (
	req: BetterAuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const apiKey = req.headers['x-api-key'] as string;

		if (!apiKey) {
			return res.status(401).json({
				error: 'API key required',
				message: 'Please provide an API key in the X-API-Key header',
			});
		}

		const validatedKey = await authUtils.validateAPIKey(apiKey);

		if (!validatedKey) {
			return res.status(401).json({
				error: 'Invalid API key',
				message: 'The provided API key is invalid or expired',
			});
		}

		// Attach API key info to request
		req.apiKey = validatedKey;
		req.user = validatedKey.user;

		next();
	} catch (error) {
		console.error('API key authentication error:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: 'API key authentication failed',
		});
	}
};

// Hybrid authentication middleware (supports both legacy JWT and Better Auth)
export const hybridAuth = async (req: BetterAuthRequest, res: Response, next: NextFunction) => {
	try {
		const authHeader = req.headers.authorization;

		if (authHeader?.startsWith('Bearer ')) {
			const token = authHeader.substring(7);

			// Try Better Auth first
			const request = new Request(req.url, {
				method: req.method,
				headers: new Headers(req.headers as any),
				body: req.body ? JSON.stringify(req.body) : undefined,
			});

			const session = await authUtils.getSession(request);

			if (session) {
				req.session = session;
				req.user = session.user;
				req.authType = 'better-auth';
				return next();
			}

			// Fallback to legacy JWT
			const { AuthService } = await import('../services/authService');
			const { UserService } = await import('../services/userService');

			try {
				const decoded = AuthService.verifyToken(token);
				if (decoded) {
					const user = await UserService.getUserById(decoded.userId);
					if (user) {
						req.user = { ...user, legacy: true };
						req.authType = 'legacy-jwt';
						return next();
					}
				}
			} catch (_legacyError) {
				// Continue to unauthorized response
			}
		}

		// No valid authentication found
		return res.status(401).json({
			error: 'Authentication required',
			message: 'Please provide a valid authentication token',
		});
	} catch (error) {
		console.error('Hybrid authentication error:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: 'Authentication service unavailable',
		});
	}
};

// Session validation middleware
export const validateSession = async (
	req: BetterAuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const sessionToken =
			req.cookies?.session_token || req.headers.authorization?.replace('Bearer ', '');

		if (!sessionToken) {
			return res.status(401).json({
				error: 'No session token provided',
				message: 'Please provide a session token',
			});
		}

		const session = await auth.api.getSession({ sessionToken });

		if (!session) {
			return res.status(401).json({
				error: 'Invalid session',
				message: 'Your session has expired or is invalid',
			});
		}

		// Check if session is expired
		if (session.expires < Date.now()) {
			return res.status(401).json({
				error: 'Session expired',
				message: 'Your session has expired. Please log in again',
			});
		}

		// Attach session to request
		req.session = session;
		req.user = session.user;

		next();
	} catch (error) {
		console.error('Session validation error:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: 'Session validation failed',
		});
	}
};

// Rate limiting middleware for auth endpoints
const authAttempts = new Map();

export const authRateLimit = (
	windowMs: number = 60 * 1000, // 1 minute
	maxAttempts: number = 5,
) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const ip = req.ip || req.connection.remoteAddress || 'unknown';
		const now = Date.now();
		const key = `${ip}:${req.path}`;

		if (!authAttempts.has(key)) {
			authAttempts.set(key, []);
		}

		const attempts = authAttempts.get(key);
		const validAttempts = attempts.filter((time: number) => now - time < windowMs);

		if (validAttempts.length >= maxAttempts) {
			return res.status(429).json({
				error: 'Too many attempts',
				message: `Please wait ${Math.ceil((windowMs - (now - validAttempts[0])) / 1000)} seconds before trying again`,
			});
		}

		validAttempts.push(now);
		authAttempts.set(key, validAttempts);

		// Clean up old attempts
		setTimeout(() => {
			const updatedAttempts = authAttempts.get(key) || [];
			const freshAttempts = updatedAttempts.filter((time: number) => now - time < windowMs);
			if (freshAttempts.length === 0) {
				authAttempts.delete(key);
			} else {
				authAttempts.set(key, freshAttempts);
			}
		}, windowMs);

		next();
	};
};

// CORS middleware for auth endpoints
export const authCORS = (req: Request, res: Response, next: NextFunction) => {
	res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.setHeader(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorization, X-API-Key, X-CSRF-Token',
	);
	res.setHeader('Access-Control-Allow-Credentials', 'true');

	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	next();
};

// Error handling middleware for auth
export const betterAuthErrorHandler = (
	error: any,
	_req: Request,
	res: Response,
	_next: NextFunction,
) => {
	console.error('Better Auth middleware error:', error);

	// Handle Better Auth specific errors
	if (error.name === 'BetterAuthError') {
		return res.status(400).json({
			error: error.message,
			code: error.code,
		});
	}

	// Handle validation errors
	if (error.name === 'ValidationError') {
		return res.status(400).json({
			error: 'Validation error',
			details: error.errors,
		});
	}

	// Default error response
	res.status(500).json({
		error: 'Internal server error',
		message: 'An unexpected error occurred',
	});
};

// Individual exports are already done above
