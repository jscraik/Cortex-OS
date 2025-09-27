import type { Router as ExpressRouter, NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { AUTH_BASE_URL, authCors, authMiddleware } from '../auth/config.js';
import {
	authenticatePasskeyCredential,
	PasskeyCredentialConflictError,
	PasskeyCredentialNotFoundError,
	PasskeyPersistenceError,
	registerPasskeyCredential,
} from '../auth/passkey-service.js';
import {
	startTwoFactorEnrollment,
	TwoFactorAlreadyEnabledError,
	TwoFactorNotConfiguredError,
	TwoFactorPersistenceError,
	verifyTwoFactorCode,
} from '../auth/two-factor-service.js';
import type { PrismaUserRecord } from '../auth/utils.js';
import { formatUserRecord, recordAuthAuditLog } from '../auth/utils.js';
import { prisma } from '../db/prisma-client.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

type PrismaUserDelegate = {
	readonly findUnique?: (args: {
		where: { id: string };
	}) => Promise<Record<string, unknown> | null>;
	readonly update?: (args: {
		where: { id: string };
		data: Record<string, unknown>;
	}) => Promise<Record<string, unknown>>;
};

type PrismaSessionDelegate = {
	readonly findMany?: (args: {
		where: { userId: string };
		orderBy?: { createdAt: 'asc' | 'desc' };
	}) => Promise<
		{
			id: string;
			userId: string;
			token: string;
			expiresAt: Date;
			createdAt: Date;
			userAgent: string | null;
		}[]
	>;
	readonly findUnique?: (args: { where: { id?: string; token?: string } }) => Promise<{
		id: string;
		userId: string;
		token: string;
		expiresAt: Date;
		createdAt: Date;
		userAgent: string | null;
	} | null>;
	readonly delete?: (args: { where: { id: string } }) => Promise<unknown>;
};

const resolveUserDelegate = (): PrismaUserDelegate | null => {
	const delegate = (prisma as Record<string, unknown>).user as PrismaUserDelegate | undefined;
	return delegate ?? null;
};

const resolveSessionDelegate = (): PrismaSessionDelegate | null => {
	const delegate = (prisma as Record<string, unknown>).session as PrismaSessionDelegate | undefined;
	return delegate ?? null;
};

const respondAuthRequired = (res: Response) => {
	return res.status(401).json({ error: 'brAInwav authentication required' });
};

const respondPersistenceUnavailable = (res: Response) => {
	return res.status(503).json({ error: 'brAInwav auth persistence unavailable' });
};

const mapSessionRecord = (
	session: {
		id: string;
		userId: string;
		expiresAt: Date;
		createdAt: Date;
		userAgent: string | null;
	},
	currentSessionId?: string,
) => ({
	id: session.id,
	userId: session.userId,
	expires: session.expiresAt,
	createdAt: session.createdAt,
	userAgent: session.userAgent,
	current: currentSessionId === session.id,
});

const buildUserUpdatePayload = (
	currentUser: { name?: string | null; image?: string | null },
	body: { name?: unknown; image?: unknown } | undefined,
) => {
	const updateData: Record<string, unknown> = {};
	const updatedFields: string[] = [];
	if (!body) {
		return { updateData, updatedFields };
	}

	if (typeof body.name === 'string') {
		const normalized = body.name.trim();
		if (normalized.length > 0 && normalized !== (currentUser.name ?? '')) {
			updateData.name = normalized;
			updatedFields.push('name');
		}
	}

	if (body.image === null) {
		if (currentUser.image !== null) {
			updateData.image = null;
			updatedFields.push('image');
		}
	} else if (typeof body.image === 'string') {
		const normalizedImage = body.image.trim();
		if (normalizedImage.length > 0 && normalizedImage !== currentUser.image) {
			updateData.image = normalizedImage;
			updatedFields.push('image');
		}
	}

	return { updateData, updatedFields };
};

// Apply CORS to all auth routes
router.use(authCors);

const AUTH_PATH_REWRITES = new Map<string, string>([
	['/register', '/sign-up/email'],
	['/login', '/sign-in/email'],
]);

const normalizePath = (path: string): string => {
	if (path.length > 1 && path.endsWith('/')) {
		return path.slice(0, -1);
	}
	return path;
};

const rewriteAuthPath = (req: Request, _res: Response, next: NextFunction) => {
	const rawUrl = req.url ?? '';
	const [rawPath = '', search = ''] = rawUrl.split('?');
	const normalized = normalizePath(rawPath);
	const target = AUTH_PATH_REWRITES.get(normalized);
	if (!target) {
		return next();
	}

	const rewrittenPath = search.length > 0 ? `${target}?${search}` : target;
	const previousOriginalUrl = req.originalUrl;
	req.url = rewrittenPath;
	req.originalUrl = previousOriginalUrl?.startsWith('/auth')
		? `/auth${rewrittenPath}`
		: rewrittenPath;
	next();
};

const AUTH_BASE_URL_DETAILS = new URL(AUTH_BASE_URL);
const ensureAuthHeaders = (req: Request, _res: Response, next: NextFunction) => {
	req.headers.host = req.headers.host ?? AUTH_BASE_URL_DETAILS.host;
	req.headers['x-forwarded-host'] = AUTH_BASE_URL_DETAILS.host;
	req.headers['x-forwarded-proto'] = AUTH_BASE_URL_DETAILS.protocol.replace(':', '');
	next();
};

// Better Auth routes (automatic handling)
router.use('/auth', rewriteAuthPath);
router.use('/auth', ensureAuthHeaders);
router.use('/auth', (req, _res, next) => {
	console.error('[brAInwav][auth-router] incoming request', {
		originalUrl: req.originalUrl,
		url: req.url,
		method: req.method,
		headers: {
			host: req.headers.host,
			'x-forwarded-host': req.headers['x-forwarded-host'],
			'x-forwarded-proto': req.headers['x-forwarded-proto'],
		},
	});
	next();
});
router.use('/auth', authMiddleware);

// Protected routes that require authentication
router.get('/api/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.user) {
			return respondAuthRequired(res);
		}

		res.json({
			user: {
				id: req.user.id,
				email: req.user.email,
				name: req.user.name,
				emailVerified: req.user.emailVerified,
				image: req.user.image,
				createdAt: req.user.createdAt,
				updatedAt: req.user.updatedAt,
			},
		});
	} catch (error) {
		console.error('[brAInwav][auth-router] error fetching user', { error });
		res.status(500).json({ error: 'brAInwav internal server error' });
	}
});

// Update user profile
router.put('/api/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.user) {
			return respondAuthRequired(res);
		}

		const userDelegate = resolveUserDelegate();
		if (!userDelegate?.update) {
			console.error('[brAInwav][auth-router] user delegate unavailable for profile update');
			return respondPersistenceUnavailable(res);
		}

		const { updateData, updatedFields } = buildUserUpdatePayload(req.user, req.body);
		if (updatedFields.length === 0) {
			return res.json({ user: req.user });
		}

		const updatedRecord = (await userDelegate.update({
			where: { id: req.user.id },
			data: updateData,
		})) as PrismaUserRecord;
		const formattedUser = formatUserRecord(updatedRecord);
		if (!formattedUser) {
			console.error('[brAInwav][auth-router] missing user record after profile update', {
				userId: req.user.id,
			});
			return res.status(500).json({ error: 'brAInwav internal server error' });
		}
		req.user = formattedUser;

		await recordAuthAuditLog({
			userId: formattedUser.id,
			sessionId: req.session?.id,
			action: 'profile.update',
			message: 'profile updated',
			metadata: { updatedFields },
		});

		res.json({ user: formattedUser });
	} catch (error) {
		console.error('[brAInwav][auth-router] error updating user profile', { error });
		res.status(500).json({ error: 'brAInwav internal server error' });
	}
});

// Get user sessions
router.get('/api/sessions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.user) {
			return respondAuthRequired(res);
		}

		const sessionDelegate = resolveSessionDelegate();
		if (!sessionDelegate?.findMany) {
			console.error('[brAInwav][auth-router] session delegate unavailable for listing sessions');
			return respondPersistenceUnavailable(res);
		}

		const sessions = await sessionDelegate.findMany({
			where: { userId: req.user.id },
			orderBy: { createdAt: 'desc' },
		});

		res.json({
			sessions: sessions.map((session) => mapSessionRecord(session, req.session?.id)),
		});
	} catch (error) {
		console.error('[brAInwav][auth-router] error fetching sessions', { error });
		res.status(500).json({ error: 'brAInwav internal server error' });
	}
});

// Revoke a session
router.delete(
	'/api/sessions/:sessionId',
	requireAuth,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			if (!req.user) {
				return respondAuthRequired(res);
			}
			const { sessionId: sessionIdParam } = req.params;
			const currentSession = req.session;

			if (!sessionIdParam) {
				return res.status(400).json({ error: 'brAInwav session identifier required' });
			}
			const sessionId = sessionIdParam;

			if (!currentSession) {
				return res.status(404).json({ error: 'brAInwav session not found' });
			}

			// Don't allow revoking the current session through this endpoint
			if (sessionId === currentSession.id) {
				return res.status(400).json({ error: 'brAInwav cannot revoke current session' });
			}

			const sessionDelegate = resolveSessionDelegate();
			if (!sessionDelegate?.delete || !sessionDelegate.findUnique) {
				console.error('[brAInwav][auth-router] session delegate unavailable for revocation');
				return respondPersistenceUnavailable(res);
			}

			const targetSession = await sessionDelegate.findUnique({ where: { id: sessionId } });
			if (!targetSession || targetSession.userId !== req.user.id) {
				return res.status(404).json({ error: 'brAInwav session not found' });
			}

			await sessionDelegate.delete({ where: { id: sessionId } });

			await recordAuthAuditLog({
				userId: req.user.id,
				sessionId: req.session?.id,
				action: 'session.revoke',
				message: 'session revoked by user',
				metadata: { revokedSessionId: sessionId },
			});

			res.json({ success: true, message: 'brAInwav session revoked' });
		} catch (error) {
			console.error('[brAInwav][auth-router] error revoking session', { error });
			res.status(500).json({ error: 'brAInwav internal server error' });
		}
	},
);

// Enable/disable two-factor authentication
router.post('/api/2fa/enable', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.user) {
			return respondAuthRequired(res);
		}
		const result = await startTwoFactorEnrollment({
			userId: req.user.id,
			email: req.user.email,
			sessionId: req.session?.id,
		});

		res.json({
			secret: result.secret,
			otpauthUrl: result.otpauthUrl,
			backupCodes: result.backupCodes,
			message: 'brAInwav two-factor authentication setup initiated',
		});
	} catch (error) {
		console.error('[brAInwav][auth-router] error enabling 2FA', { error });
		if (error instanceof TwoFactorAlreadyEnabledError) {
			return res.status(409).json({ error: error.message });
		}
		if (error instanceof TwoFactorPersistenceError) {
			return respondPersistenceUnavailable(res);
		}
		res.status(500).json({ error: 'brAInwav internal server error' });
	}
});

// Verify two-factor authentication
router.post('/api/2fa/verify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { code } = req.body;
		if (!code) {
			return res.status(400).json({ error: 'brAInwav verification code required' });
		}
		if (!req.user) {
			return respondAuthRequired(res);
		}
		const result = await verifyTwoFactorCode({
			userId: req.user.id,
			code,
			sessionId: req.session?.id,
		});

		res.json({
			success: true,
			message: 'brAInwav two-factor verification success',
			method: result.method,
			backupCodesRemaining: result.backupCodesRemaining,
		});
	} catch (error) {
		console.error('[brAInwav][auth-router] error verifying 2FA', { error });
		if (error instanceof TwoFactorNotConfiguredError) {
			return res.status(400).json({ error: error.message });
		}
		if (error instanceof TwoFactorPersistenceError) {
			return respondPersistenceUnavailable(res);
		}
		if (error instanceof Error && error.message.includes('brAInwav')) {
			return res.status(400).json({ error: error.message });
		}
		res.status(500).json({ error: 'brAInwav internal server error' });
	}
});

// WebAuthn/Passkey routes
router.post(
	'/api/passkeys/register',
	requireAuth,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			if (!req.user) {
				return respondAuthRequired(res);
			}
			const transports = Array.isArray(req.body?.transports)
				? (req.body.transports as string[])
				: undefined;
			const result = await registerPasskeyCredential({
				userId: req.user.id,
				name: typeof req.body?.name === 'string' ? req.body.name : req.user.email,
				transports,
				deviceType: typeof req.body?.deviceType === 'string' ? req.body.deviceType : undefined,
				backedUp: typeof req.body?.backedUp === 'boolean' ? req.body.backedUp : undefined,
				credentialId:
					typeof req.body?.credentialId === 'string' ? req.body.credentialId : undefined,
				publicKey: typeof req.body?.publicKey === 'string' ? req.body.publicKey : undefined,
				sessionId: req.session?.id ?? null,
			});

			res.status(201).json({ passkey: result });
		} catch (error) {
			console.error('[brAInwav][auth-router] error registering passkey', { error });
			if (error instanceof PasskeyCredentialConflictError) {
				return res.status(409).json({ error: 'brAInwav passkey credential already exists' });
			}
			if (error instanceof PasskeyPersistenceError) {
				return respondPersistenceUnavailable(res);
			}
			res.status(500).json({ error: 'brAInwav internal server error' });
		}
	},
);

router.post('/api/passkeys/authenticate', async (req: Request, res: Response) => {
	try {
		const { credentialId } = req.body ?? {};
		if (typeof credentialId !== 'string' || credentialId.trim().length === 0) {
			return res.status(400).json({ error: 'brAInwav passkey credentialId required' });
		}

		const result = await authenticatePasskeyCredential({ credentialId: credentialId.trim() });

		res.json({
			success: true,
			message: 'brAInwav passkey authentication success',
			userId: result.userId,
			credentialId: result.credentialId,
			counter: result.counter,
		});
	} catch (error) {
		console.error('[brAInwav][auth-router] error authenticating with passkey', { error });
		if (error instanceof PasskeyCredentialNotFoundError) {
			return res.status(404).json({ error: 'brAInwav passkey credential not found' });
		}
		if (error instanceof PasskeyPersistenceError) {
			return respondPersistenceUnavailable(res);
		}
		res.status(500).json({ error: 'brAInwav internal server error' });
	}
});

export const authRouter: ExpressRouter = router;
