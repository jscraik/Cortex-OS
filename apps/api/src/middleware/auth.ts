import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

type AuthenticatedUser = {
	id: string;
	email?: string;
	name?: string;
	roles?: string[];
	permissions?: string[];
	[key: string]: unknown;
};

type AuthenticatedSession = {
	id: string;
	expires?: Date | string | number;
	[key: string]: unknown;
};

export interface AuthenticatedRequest extends Request {
	user?: AuthenticatedUser;
	session?: AuthenticatedSession;
}

type TokenPayload = jwt.JwtPayload & {
	readonly user?: AuthenticatedUser;
	readonly session?: AuthenticatedSession;
};

const decodeToken = (token: string): TokenPayload => {
	const decoded = jwt.verify(token, JWT_SECRET);

	if (typeof decoded === 'string') {
		throw new jwt.JsonWebTokenError('Invalid token payload');
	}

	return decoded as TokenPayload;
};

// JWT secret should be the same as Better Auth secret
const JWT_SECRET = process.env.BETTER_AUTH_SECRET || 'better-auth-secret';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	try {
		// Get token from Authorization header
		const authHeader = req.headers.authorization;
		if (!authHeader?.startsWith('Bearer ')) {
			return res.status(401).json({ error: 'Missing authorization header' });
		}

		const token = authHeader.substring(7); // Remove "Bearer " prefix

		// Verify JWT token
		const decoded = decodeToken(token);

		// Verify session exists and is valid
		// In a real implementation, you would check the database
		// For now, we'll attach the decoded data to the request
		req.user = decoded.user;
		req.session = decoded.session;

		next();
	} catch (error) {
		if (error instanceof jwt.JsonWebTokenError) {
			return res.status(401).json({ error: 'Invalid token' });
		}
		if (error instanceof jwt.TokenExpiredError) {
			return res.status(401).json({ error: 'Token expired' });
		}

		console.error('Auth middleware error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (
	req: AuthenticatedRequest,
	_res: Response,
	next: NextFunction,
) => {
	try {
		const authHeader = req.headers.authorization;
		if (authHeader?.startsWith('Bearer ')) {
			const token = authHeader.substring(7);

			try {
				const decoded = decodeToken(token);
				req.user = decoded.user;
				req.session = decoded.session;
			} catch (error) {
				// Token is invalid, but we continue without auth
				console.warn('Invalid token in optional auth:', error);
			}
		}

		next();
	} catch (error) {
		console.error('Optional auth middleware error:', error);
		next();
	}
};

/**
 * Check if user has specific role/permission
 */
export const requireRole = (role: string) => {
	return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		if (!req.user) {
			return res.status(401).json({ error: 'Authentication required' });
		}

		const roles = Array.isArray(req.user.roles) ? req.user.roles : [];
		if (!roles.includes(role)) {
			return res.status(403).json({ error: 'Forbidden' });
		}

		// In a real implementation, you would check roles in the database
		// For now, we'll assume all authenticated users have the required role
		next();
	};
};

/**
 * Check if user has specific permission
 */
export const requirePermission = (permission: string) => {
	return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		if (!req.user) {
			return res.status(401).json({ error: 'Authentication required' });
		}

		const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
		if (!permissions.includes(permission)) {
			return res.status(403).json({ error: 'Forbidden' });
		}

		// In a real implementation, you would check permissions
		// For now, we'll assume all authenticated users have all permissions
		next();
	};
};

/**
 * Rate limiting middleware for auth routes
 */
export const authRateLimit = async (
	_req: AuthenticatedRequest,
	_res: Response,
	next: NextFunction,
) => {
	// In a real implementation, you would use a rate limiter like express-rate-limit
	// For now, we'll just pass through
	next();
};
