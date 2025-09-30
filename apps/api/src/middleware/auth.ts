import type { NextFunction, Request, Response } from 'express';
import { formatUserRecord } from '../auth/utils.js';
import { prisma } from '../db/prisma-client.js';

type AuthenticatedUser = {
	id: string;
	email?: string | null;
	name?: string | null;
	emailVerified?: boolean | Date | string | null;
	image?: string | null;
	createdAt?: Date | string;
	updatedAt?: Date | string;
	roles?: string[];
	permissions?: string[];
	[key: string]: unknown;
};

type AuthenticatedSession = {
	id: string;
	expires?: Date | string | number;
	createdAt?: Date | string;
	userAgent?: string | null;
	[key: string]: unknown;
};

export interface AuthenticatedRequest extends Request {
	user?: AuthenticatedUser;
	session?: AuthenticatedSession;
}

const sessionDelegate = (prisma as unknown as Record<string, unknown>).session as
	| undefined
	| {
			findUnique: (args: {
				where: { id?: string; token?: string };
				include?: { user: boolean };
			}) => Promise<{
				id: string;
				userId: string;
				token: string;
				expiresAt: Date;
				createdAt: Date;
				userAgent: string | null;
				user: Record<string, unknown> | null;
			} | null>;
			findMany: (args: {
				where: { userId: string };
				orderBy?: { createdAt: 'asc' | 'desc' };
			}) => Promise<
				{
					id: string;
					userId: string;
					expiresAt: Date;
					createdAt: Date;
					userAgent: string | null;
				}[]
			>;
			delete: (args: { where: { id: string } }) => Promise<unknown>;
	  };

const ensureSessionDelegate = (res: Response) => {
	if (!sessionDelegate) {
		res.status(503).json({ error: 'Auth persistence unavailable' });
		return null;
	}
	return sessionDelegate;
};

const sanitizeSession = (session: {
	id: string;
	expiresAt: Date;
	createdAt: Date;
	userAgent: string | null;
}): AuthenticatedSession => ({
	id: session.id,
	expires: session.expiresAt,
	createdAt: session.createdAt,
	userAgent: session.userAgent,
});

/**
 * Middleware to verify token and attach user/session data from Prisma.
 */
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	try {
		const sessionClient = ensureSessionDelegate(res);
		if (!sessionClient) return;

		const authHeader = req.headers.authorization;
		if (!authHeader?.startsWith('Bearer ')) {
			return res.status(401).json({ error: 'Missing authorization header' });
		}

		const token = authHeader.substring(7);
		const sessionRecord = await sessionClient.findUnique({
			where: { token },
			include: { user: true },
		});

		if (!sessionRecord) {
			return res.status(401).json({ error: 'Invalid session token' });
		}

		if (new Date(sessionRecord.expiresAt).getTime() <= Date.now()) {
			return res.status(401).json({ error: 'Session expired' });
		}

		const formattedUser = formatUserRecord(sessionRecord.user as any);
		if (!formattedUser) {
			return res.status(401).json({ error: 'User record missing' });
		}

		req.user = formattedUser;
		req.session = sanitizeSession(sessionRecord);

		return next();
	} catch (error) {
		console.error('Auth middleware error:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

/**
 * Optional authentication middleware - does not fail if no token is present.
 */
export const optionalAuth = async (
	req: AuthenticatedRequest,
	_res: Response,
	next: NextFunction,
) => {
	try {
		const sessionClient = sessionDelegate;
		if (!sessionClient) {
			return next();
		}

		const authHeader = req.headers.authorization;
		if (!authHeader?.startsWith('Bearer ')) {
			return next();
		}

		const token = authHeader.substring(7);
		const sessionRecord = await sessionClient.findUnique({
			where: { token },
			include: { user: true },
		});

		if (!sessionRecord) {
			return next();
		}

		if (new Date(sessionRecord.expiresAt).getTime() <= Date.now()) {
			return next();
		}

		req.user = formatUserRecord(sessionRecord.user as any) ?? undefined;
		req.session = sanitizeSession(sessionRecord);
		return next();
	} catch (error) {
		console.error('Optional auth middleware error:', error);
		return next();
	}
};

export const requireRole = (role: string) => {
	return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		if (!req.user) {
			return res.status(401).json({ error: 'Authentication required' });
		}

		const roles = Array.isArray(req.user.roles) ? req.user.roles : [];
		if (!roles.includes(role)) {
			return res.status(403).json({ error: 'Forbidden' });
		}

		return next();
	};
};

export const requirePermission = (permission: string) => {
	return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		if (!req.user) {
			return res.status(401).json({ error: 'Authentication required' });
		}

		const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
		if (!permissions.includes(permission)) {
			return res.status(403).json({ error: 'Forbidden' });
		}

		return next();
	};
};

export const authRateLimit = async (
	_req: AuthenticatedRequest,
	_res: Response,
	next: NextFunction,
) => {
	return next();
};
