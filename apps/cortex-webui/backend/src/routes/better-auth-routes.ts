import { type Express, Request, type Response } from 'express';
import { auth, authUtils } from '../auth';
import { authCORS, authRateLimit, betterAuthErrorHandler } from '../middleware/better-auth.js';

// Better Auth API Routes
export const setupBetterAuthRoutes = (app: Express) => {
	// Apply CORS to all auth routes
	app.use('/api/auth/*', authCORS);

	// Rate limiting for auth endpoints
	app.use('/api/auth/*', authRateLimit());

	// Better Auth handler (for all Better Auth routes)
	app.all('/api/auth/*', async (req: Request, res: Response) => {
		try {
			// Convert Express request to Request object
			const request = new Request(req.url, {
				method: req.method,
				headers: new Headers(req.headers as any),
				body: req.body ? JSON.stringify(req.body) : undefined,
			});

			// Let Better Auth handle the request
			const response = await auth.handler(request);

			// Convert Better Auth response to Express response
			response.headers.forEach((value, key) => {
				res.setHeader(key, value);
			});

			res.status(response.status);

			if (response.body) {
				const text = await response.text();
				res.send(text);
			} else {
				res.end();
			}
		} catch (error) {
			betterAuthErrorHandler(error, req, res, () => {});
		}
	});

	// Session management
	app.get('/api/auth/session', async (req: Request, res: Response) => {
		try {
			const request = new Request(req.url, {
				method: req.method,
				headers: new Headers(req.headers as any),
			});

			const session = await authUtils.getSession(request);

			if (session) {
				res.json({
					session: {
						id: session.id,
						userId: session.userId,
						expires: session.expires,
					},
					user: session.user,
				});
			} else {
				res.status(401).json({ error: 'No active session' });
			}
		} catch (error) {
			betterAuthErrorHandler(error, req, res, () => {});
		}
	});

	// User profile
	app.get('/api/auth/user', async (req: Request, res: Response) => {
		try {
			const request = new Request(req.url, {
				method: req.method,
				headers: new Headers(req.headers as any),
			});

			const user = await authUtils.getUser(request);

			if (user) {
				res.json(user);
			} else {
				res.status(401).json({ error: 'Not authenticated' });
			}
		} catch (error) {
			betterAuthErrorHandler(error, req, res, () => {});
		}
	});

	// OAuth provider URLs
	app.get('/api/auth/oauth/:provider', async (req: Request, res: Response) => {
		try {
			const { provider } = req.params;

			// Generate OAuth URL for the provider
			const url = `${auth.baseURL}/api/auth/signin/${provider}`;

			res.json({ url });
		} catch (error) {
			betterAuthErrorHandler(error, req, res, () => {});
		}
	});

	// API Key management
	app.post('/api/auth/api-keys', async (req: Request, res: Response) => {
		try {
			const request = new Request(req.url, {
				method: req.method,
				headers: new Headers(req.headers as any),
				body: JSON.stringify(req.body),
			});

			const session = await authUtils.getSession(request);

			if (!session) {
				return res.status(401).json({ error: 'Authentication required' });
			}

			const { name } = req.body;
			const result = await authUtils.createAPIKey(session.userId, name);

			res.json(result);
		} catch (error) {
			betterAuthErrorHandler(error, req, res, () => {});
		}
	});

	// Validate API key
	app.post('/api/auth/api-keys/validate', async (req: Request, res: Response) => {
		try {
			const { apiKey } = req.body;
			const result = await authUtils.validateAPIKey(apiKey);

			if (result) {
				res.json({ valid: true, key: result });
			} else {
				res.json({ valid: false });
			}
		} catch (error) {
			betterAuthErrorHandler(error, req, res, () => {});
		}
	});

	// Two-factor authentication setup
	app.post('/api/auth/2fa/enable', async (req: Request, res: Response) => {
		try {
			const request = new Request(req.url, {
				method: req.method,
				headers: new Headers(req.headers as any),
			});

			const session = await authUtils.getSession(request);

			if (!session) {
				return res.status(401).json({ error: 'Authentication required' });
			}

			// Enable 2FA for the user
			const result = await auth.api.twoFactor.enable({
				userId: session.userId,
			});

			res.json(result);
		} catch (error) {
			betterAuthErrorHandler(error, req, res, () => {});
		}
	});

	// Magic link request
	app.post('/api/auth/magic-link', async (req: Request, res: Response) => {
		try {
			const { email } = req.body;

			const _result = await auth.api.magicLink.send({
				email,
				redirectURL: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`,
			});

			res.json({ success: true, message: 'Magic link sent if email exists' });
		} catch (error) {
			betterAuthErrorHandler(error, req, res, () => {});
		}
	});

	// Password reset request
	app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
		try {
			const { email } = req.body;

			const _result = await auth.api.forgetPassword({
				email,
				redirectURL: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`,
			});

			res.json({ success: true, message: 'Password reset email sent if email exists' });
		} catch (error) {
			betterAuthErrorHandler(error, req, res, () => {});
		}
	});

	// Password reset confirmation
	app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
		try {
			const { token, newPassword } = req.body;

			const _result = await auth.api.resetPassword({
				token,
				newPassword,
			});

			res.json({ success: true, message: 'Password reset successfully' });
		} catch (error) {
			betterAuthErrorHandler(error, req, res, () => {});
		}
	});

	// Organization management
	app.get('/api/auth/organizations', async (req: Request, res: Response) => {
		try {
			const request = new Request(req.url, {
				method: req.method,
				headers: new Headers(req.headers as any),
			});

			const session = await authUtils.getSession(request);

			if (!session) {
				return res.status(401).json({ error: 'Authentication required' });
			}

			const organizations = await auth.api.organization.list({
				userId: session.userId,
			});

			res.json(organizations);
		} catch (error) {
			betterAuthErrorHandler(error, req, res, () => {});
		}
	});

	// Passkey (WebAuthn) registration
	app.post('/api/auth/passkeys/register', async (req: Request, res: Response) => {
		try {
			const request = new Request(req.url, {
				method: req.method,
				headers: new Headers(req.headers as any),
				body: JSON.stringify(req.body),
			});

			const session = await authUtils.getSession(request);

			if (!session) {
				return res.status(401).json({ error: 'Authentication required' });
			}

			const result = await auth.api.passkey.register({
				userId: session.userId,
				...req.body,
			});

			res.json(result);
		} catch (error) {
			betterAuthErrorHandler(error, req, res, () => {});
		}
	});
};
