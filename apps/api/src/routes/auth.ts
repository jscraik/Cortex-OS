import { Router } from 'express';
import { authCors, authMiddleware } from '../auth/config.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Apply CORS to all auth routes
router.use(authCors);

// Better Auth routes (automatic handling)
router.use('/auth', authMiddleware);

// Protected routes that require authentication
router.get('/api/me', requireAuth, async (req, res) => {
	try {
		// The user is attached to the request by the requireAuth middleware
		const user = (req as any).user;

		res.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				emailVerified: user.emailVerified,
				image: user.image,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
			},
		});
	} catch (error) {
		console.error('Error fetching user:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Update user profile
router.put('/api/me', requireAuth, async (req, res) => {
	try {
		const user = (req as any).user;
		const { name, image } = req.body;

		// In a real implementation, you would update the user in the database
		const updatedUser = {
			...user,
			name: name || user.name,
			image: image || user.image,
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
router.get('/api/sessions', requireAuth, async (req, res) => {
	try {
		const user = (req as any).user;
		const session = (req as any).session;

		// In a real implementation, you would fetch all sessions for the user
		res.json({
			sessions: [
				{
					id: session.id,
					userId: session.userId,
					expires: session.expires,
					createdAt: session.createdAt,
					userAgent: session.userAgent,
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
router.delete('/api/sessions/:sessionId', requireAuth, async (req, res) => {
	try {
		const { sessionId } = req.params;
		const user = (req as any).user;
		const currentSession = (req as any).session;

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
});

// Enable/disable two-factor authentication
router.post('/api/2fa/enable', requireAuth, async (req, res) => {
	try {
		const user = (req as any).user;
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
router.post('/api/2fa/verify', requireAuth, async (req, res) => {
	try {
		const { code } = req.body;
		const user = (req as any).user;

		// This would be handled by Better Auth's twoFactor plugin
		// In real implementation, verify the TOTP code
		res.json({ success: true });
	} catch (error) {
		console.error('Error verifying 2FA:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// WebAuthn/Passkey routes
router.post('/api/passkeys/register', requireAuth, async (req, res) => {
	try {
		const user = (req as any).user;
		// This would be handled by Better Auth's passkey plugin
		res.json({
			challenge: 'challenge-here',
			rp: {
				name: 'Cortex-OS',
				id: 'localhost',
			},
			user: {
				id: user.id,
				name: user.email,
				displayName: user.name,
			},
		});
	} catch (error) {
		console.error('Error registering passkey:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.post('/api/passkeys/authenticate', async (req, res) => {
	try {
		// This would be handled by Better Auth's passkey plugin
		res.json({ challenge: 'challenge-here' });
	} catch (error) {
		console.error('Error authenticating with passkey:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
