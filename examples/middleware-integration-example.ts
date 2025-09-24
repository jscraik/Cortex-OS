/**
 * Example: Skip Permissions Middleware Integration
 *
 * This example shows how to integrate skip permissions middleware
 * with existing Express.js applications.
 */

import { SkipPermissionsService } from '@cortex-os/orchestration/security/skip-permissions';
import express from 'express';

type MockUserRole = 'admin' | 'user' | 'service';

type MockUser = {
	id: number;
	role: MockUserRole;
	email: string;
};

type SkipPermissionsResult = Awaited<ReturnType<SkipPermissionsService['canBypass']>>;

type AugmentedRequest = express.Request & {
	user?: MockUser;
	skipPermissionsResult?: SkipPermissionsResult;
};

// Initialize the skip permissions service
const skipService = new SkipPermissionsService({
	enabled: process.env.SKIP_PERMISSIONS_ENABLED === 'true',
	requireAdmin: true,
	allowedIPs: process.env.ALLOWED_IPS?.split(',') || [],
});

// Create Express app
const app = express();
app.use(express.json());

// Skip permissions middleware
const skipPermissionsMiddleware = async (
	req: express.Request,
	_res: express.Response,
	next: express.NextFunction,
) => {
	const bypassToken = req.header('X-Skip-Permissions');
	const request = req as AugmentedRequest;

	if (bypassToken) {
		try {
			// Check if bypass is allowed
			const result = await skipService.canBypass({
				userId: request.user?.id.toString(),
				userRole: request.user?.role,
				ipAddress: req.ip,
				userAgent: req.header('User-Agent'),
				resource: req.path,
				action: req.method.toLowerCase(),
				bypassToken,
			});

			// Store result for later use
			request.skipPermissionsResult = result;

			if (result.allowed) {
				console.warn('[AUDIT] Permissions bypassed:', {
					userId: request.user?.id,
					ipAddress: req.ip,
					path: req.path,
					method: req.method,
					bypassType: result.bypassType,
				});
			}
		} catch (error) {
			console.error('Skip permissions check failed:', error);
		}
	}

	next();
};

// Authentication middleware (mock)
const authMiddleware = (
	req: express.Request,
	_res: express.Response,
	next: express.NextFunction,
) => {
	const authHeader = req.header('Authorization');
	const request = req as AugmentedRequest;

	if (authHeader?.startsWith('Bearer ')) {
		const token = authHeader.substring(7);

		// Mock user lookup
		const users: Record<string, MockUser> = {
			'admin-token': { id: 1, role: 'admin', email: 'admin@example.com' },
			'user-token': { id: 2, role: 'user', email: 'user@example.com' },
			'service-token': { id: 3, role: 'service', email: 'service@example.com' },
		};

		request.user = users[token];
	}

	next();
};

// Apply middleware
app.use(authMiddleware);
app.use(skipPermissionsMiddleware);

// Permission check middleware helper
const requirePermission = (resource: string, action: string) => {
	return (req: AugmentedRequest, res: express.Response, next: express.NextFunction) => {
		// Check if permissions were bypassed
		const bypassResult = req.skipPermissionsResult;

		if (bypassResult?.allowed) {
			// Permissions bypassed, allow access
			return next();
		}

		// Normal permission check (simplified for example)
		const user = req.user;

		if (!user) {
			return res.status(401).json({ error: 'Authentication required' });
		}

		// Admin has all permissions
		if (user.role === 'admin') {
			return next();
		}

		// Simple role-based check
		const permissions: Record<string, string[]> = {
			user: ['users:read', 'content:read'],
			service: ['system:read', 'tasks:execute'],
		};

		const requiredPermission = `${resource}:${action}`;
		const userPermissions = permissions[user.role] || [];

		if (userPermissions.includes(requiredPermission) || userPermissions.includes(`${resource}:*`)) {
			return next();
		}

		res.status(403).json({
			error: 'Access denied',
			required: requiredPermission,
			user: user.role,
			bypassed: false,
		});
	};
};

// Protected routes
app.get('/api/users', requirePermission('users', 'read'), (req: AugmentedRequest, res) => {
	const bypassResult = req.skipPermissionsResult;
	res.json({
		users: [
			{ id: 1, name: 'John' },
			{ id: 2, name: 'Jane' },
		],
		bypassed: !!bypassResult?.allowed,
	});
});

app.post('/api/tasks', requirePermission('tasks', 'create'), (req: AugmentedRequest, res) => {
	const bypassResult = req.skipPermissionsResult;
	res.json({
		success: true,
		taskId: 'task-123',
		bypassed: !!bypassResult?.allowed,
	});
});

app.delete('/api/users/:id', requirePermission('users', 'delete'), (req: AugmentedRequest, res) => {
	const bypassResult = req.skipPermissionsResult;
	res.json({
		success: true,
		message: `User ${req.params.id} deleted`,
		bypassed: !!bypassResult?.allowed,
	});
});

// Admin-only route
app.get('/api/admin/logs', requirePermission('admin', 'read'), (req: AugmentedRequest, res) => {
	const bypassResult = req.skipPermissionsResult;
	res.json({
		logs: ['System started', 'User login', 'Task completed'],
		bypassed: !!bypassResult?.allowed,
	});
});

// Skip permissions management routes (admin only)
app.post('/api/admin/skip-tokens', async (req: AugmentedRequest, res) => {
	const user = req.user;

	if (!user || user.role !== 'admin') {
		return res.status(403).json({ error: 'Admin access required' });
	}

	const body = req.body as Record<string, unknown>;
	const description = typeof body.description === 'string' ? body.description : undefined;
	const duration = typeof body.duration === 'number' ? body.duration : undefined;

	if (!description) {
		return res.status(400).json({ error: 'Description is required' });
	}

	const token = skipService.generateBypassToken(description, user.id, duration);

	res.json({
		token: token.token,
		description: token.description,
		expiresAt: token.expiresAt,
		createdAt: token.createdAt,
	});
});

app.get('/api/admin/skip-tokens', (req: AugmentedRequest, res) => {
	const user = req.user;

	if (!user || user.role !== 'admin') {
		return res.status(403).json({ error: 'Admin access required' });
	}

	const tokens = skipService.listBypassTokens();
	res.json({ tokens });
});

app.delete('/api/admin/skip-tokens/:token', (req: AugmentedRequest, res) => {
	const user = req.user;

	if (!user || user.role !== 'admin') {
		return res.status(403).json({ error: 'Admin access required' });
	}

	const success = skipService.revokeBypassToken(req.params.token);

	if (!success) {
		return res.status(404).json({ error: 'Token not found' });
	}

	res.json({ success: true });
});

// Health check endpoint
app.get('/health', (_req, res) => {
	res.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		skipPermissions: skipService.getConfig(),
	});
});

// Error handling middleware
app.use(
	(err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
		if (err instanceof Error) {
			console.error(err.stack);
		} else {
			console.error('Unknown error received by Express middleware.', err);
		}
		res.status(500).json({ error: 'Internal server error' });
	},
);

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Express server running on port ${port}`);
	console.log(`Skip permissions enabled: ${skipService.getConfig().enabled}`);
});

export default app;
