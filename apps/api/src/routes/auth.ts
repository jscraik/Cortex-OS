import type { Request, Response } from 'express';
import { Router } from 'express';
import { authCors, authMiddleware } from '../auth/config.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Apply CORS to all auth routes
router.use(authCors);

// Better Auth routes (automatic handling)
router.use('/auth', authMiddleware);

// Protected routes that require authentication
router.get('/api/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({ error: 'Authentication required' });
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
		console.error('Error fetching user:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Update user profile
router.put('/api/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({ error: 'Authentication required' });
		}
		const { name, image } = req.body;

		// In a real implementation, you would update the user in the database
		const updatedUser = {
			...req.user,
			name: name || req.user.name,
			image: image || req.user.image,
			updatedAt: new Date(),
		};

		res.json({
			user: {
				id: updatedUser.id,
				email: updatedUser.email,
				name: updatedUser.name,
				emailVerified: updatedUser.emailVerified,
				image: updatedUser.image,
				createdAt: updatedUser.createdAt,
				updatedAt: updatedUser.updatedAt,
			},
		});
	} catch (error) {
		console.error('Error updating user:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Get user sessions
router.get('/api/sessions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.session) {
			return res.status(404).json({ error: 'Session not found' });
		}

		// In a real implementation, you would fetch all sessions for the user
		res.json({
			sessions: [
				{
					id: req.session.id,
					userId: req.session.userId,
					expires: req.session.expires,
					createdAt: req.session.createdAt,
					userAgent: req.session.userAgent,
					current: true, // This is the current session
				},
			],
		});
	} catch (error) {
		console.error('Error fetching sessions:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Revoke a session
router.delete(
	'/api/sessions/:sessionId',
	requireAuth,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			const { sessionId } = req.params;
			const currentSession = req.session;

			if (!currentSession) {
				return res.status(404).json({ error: 'Session not found' });
			}

			// Don't allow revoking the current session through this endpoint
			if (sessionId === currentSession.id) {
				return res.status(400).json({ error: 'Cannot revoke current session' });
			}

			// In a real implementation, you would delete the session from the database
			res.json({ success: true });
		} catch (error) {
			console.error('Error revoking session:', error);
			res.status(500).json({ error: 'Internal server error' });
		}
	},
);

// Enable/disable two-factor authentication
router.post('/api/2fa/enable', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({ error: 'Authentication required' });
		}
		// This would be handled by Better Auth's twoFactor plugin
		res.json({
			message: 'Two-factor authentication setup initiated',
			// In real implementation, return QR code and secret
		});
	} catch (error) {
		console.error('Error enabling 2FA:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Verify two-factor authentication
router.post('/api/2fa/verify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { code } = req.body;
		if (!code) {
			return res.status(400).json({ error: 'Verification code required' });
		}
		if (!req.user) {
			return res.status(401).json({ error: 'Authentication required' });
		}

		// This would be handled by Better Auth's twoFactor plugin
		// In real implementation, verify the TOTP code
		res.json({ success: true });
	} catch (error) {
		console.error('Error verifying 2FA:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// WebAuthn/Passkey routes
router.post(
	'/api/passkeys/register',
	requireAuth,
	async (req: AuthenticatedRequest, res: Response) => {
		try {
			if (!req.user) {
				return res.status(401).json({ error: 'Authentication required' });
			}
			// This would be handled by Better Auth's passkey plugin
			res.json({
				challenge: 'challenge-here',
				rp: {
					name: 'Cortex-OS',
					id: 'localhost',
				},
				user: {
					id: req.user.id,
					name: req.user.email,
					displayName: req.user.name,
				},
			});
		} catch (error) {
			console.error('Error registering passkey:', error);
			res.status(500).json({ error: 'Internal server error' });
		}
	},
);

router.post('/api/passkeys/authenticate', async (_req: Request, res: Response) => {
	try {
		// This would be handled by Better Auth's passkey plugin
		res.json({ challenge: 'challenge-here' });
	} catch (error) {
		console.error('Error authenticating with passkey:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

export const authRouter = router;
