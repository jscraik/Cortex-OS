/**
 * Example: Using Skip Permissions in a Cortex-OS Application
 *
 * This example demonstrates how to integrate and use the dangerously-skip-permissions
 * feature in a typical Cortex-OS application.
 */

import { SkipPermissionsAPI } from '@cortex-os/agents/features/skip-permissions-api';
import { RBACSystem } from '@cortex-os/orchestration/security/rbac-system';
import { SkipPermissionsService } from '@cortex-os/orchestration/security/skip-permissions';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Initialize services
const skipService = new SkipPermissionsService({
	enabled: process.env.NODE_ENV === 'development',
	requireAdmin: true,
	auditLog: true,
	allowedIPs: process.env.ALLOWED_IPS?.split(',') || [],
});

const rbacSystem = new RBACSystem(skipService);
const skipAPI = new SkipPermissionsAPI(skipService);

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', skipService.middleware());

// Mock authentication middleware
app.use('*', async (c, next) => {
	const authHeader = c.req.header('Authorization');

	if (authHeader?.startsWith('Bearer ')) {
		const token = authHeader.substring(7);

		// Mock user database
		const users: Record<string, any> = {
			'admin-token': {
				id: 'admin-1',
				role: 'admin',
				email: 'admin@example.com',
			},
			'user-token': {
				id: 'user-1',
				role: 'user',
				email: 'user@example.com',
			},
		};

		const user = users[token];
		if (user) {
			c.set('user', user);
		}
	}

	await next();
});

// Add skip permissions API routes
app.route('/skip-permissions', skipAPI.getApp());

// Protected routes with permission checks
app.get('/api/admin/dashboard', async (c) => {
	const user = c.get('user');
	const bypassResult = c.get('skipPermissionsResult');

	// Check authorization
	const authResult = await rbacSystem.authorize({
		user: user || { sub: 'anonymous', roles: [] },
		resource: 'admin',
		action: 'read',
		bypassToken: c.req.header('X-Skip-Permissions'),
	});

	if (!authResult.allowed) {
		return c.json(
			{
				error: 'Access denied',
				reason: authResult.reason,
			},
			403,
		);
	}

	return c.json({
		data: 'Admin dashboard data',
		user: user?.email,
		bypassed: authResult.bypassed,
		bypassType: authResult.bypassType,
	});
});

app.post('/api/system/config', async (c) => {
	const user = c.get('user');
	const body = await c.req.json();

	// Check authorization
	const authResult = await rbacSystem.authorize({
		user: user || { sub: 'anonymous', roles: [] },
		resource: 'config',
		action: 'write',
		bypassToken: c.req.header('X-Skip-Permissions'),
	});

	if (!authResult.allowed) {
		return c.json(
			{
				error: 'Access denied',
				reason: authResult.reason,
			},
			403,
		);
	}

	// Update configuration (mock)
	console.log('Updating config:', body);

	return c.json({
		success: true,
		message: 'Configuration updated',
		bypassed: authResult.bypassed,
	});
});

app.delete('/api/users/:id', async (c) => {
	const user = c.get('user');
	const userId = c.req.param('id');

	// Check authorization
	const authResult = await rbacSystem.authorize({
		user: user || { sub: 'anonymous', roles: [] },
		resource: 'users',
		action: 'delete',
		bypassToken: c.req.header('X-Skip-Permissions'),
	});

	if (!authResult.allowed) {
		return c.json(
			{
				error: 'Access denied',
				reason: authResult.reason,
			},
			403,
		);
	}

	// Delete user (mock)
	console.log('Deleting user:', userId);

	return c.json({
		success: true,
		message: `User ${userId} deleted`,
		bypassed: authResult.bypassed,
	});
});

// Public health endpoint
app.get('/health', (c) => {
	return c.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		skipPermissions: {
			enabled: skipService.getConfig().enabled,
		},
	});
});

// Start server
const port = parseInt(process.env.PORT || '3000', 10);
console.log(`Server running on port ${port}`);

// Example usage script
async function demonstrateSkipPermissions() {
	const baseUrl = `http://localhost:${port}`;

	console.log('=== Skip Permissions Demo ===\n');

	// 1. Generate a bypass token (as admin)
	console.log('1. Generating bypass token...');
	const tokenResponse = await fetch(`${baseUrl}/skip-permissions/tokens`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer admin-token',
		},
		body: JSON.stringify({
			description: 'Demo bypass token',
			duration: 60000, // 1 minute
		}),
	});

	if (!tokenResponse.ok) {
		console.error('Failed to generate token:', await tokenResponse.text());
		return;
	}

	const { token } = await tokenResponse.json();
	console.log('Generated token:', token);

	// 2. Try accessing admin dashboard as regular user (should fail)
	console.log('\n2. Accessing admin dashboard as regular user...');
	const dashboardResponse = await fetch(`${baseUrl}/api/admin/dashboard`, {
		headers: {
			Authorization: 'Bearer user-token',
		},
	});

	console.log('Status:', dashboardResponse.status);
	console.log('Response:', await dashboardResponse.json());

	// 3. Try again with bypass token (should succeed)
	console.log('\n3. Accessing admin dashboard with bypass token...');
	const bypassResponse = await fetch(`${baseUrl}/api/admin/dashboard`, {
		headers: {
			Authorization: 'Bearer user-token',
			'X-Skip-Permissions': token,
		},
	});

	console.log('Status:', bypassResponse.status);
	console.log('Response:', await bypassResponse.json());

	// 4. Admin accessing without token (should work)
	console.log('\n4. Admin accessing without bypass token...');
	const adminResponse = await fetch(`${baseUrl}/api/admin/dashboard`, {
		headers: {
			Authorization: 'Bearer admin-token',
		},
	});

	console.log('Status:', adminResponse.status);
	console.log('Response:', await adminResponse.json());

	// 5. Check active tokens
	console.log('\n5. Listing active tokens...');
	const tokensResponse = await fetch(`${baseUrl}/skip-permissions/tokens`, {
		headers: {
			Authorization: 'Bearer admin-token',
		},
	});

	console.log('Active tokens:', await tokensResponse.json());

	// 6. Revoke the token
	console.log('\n6. Revoking token...');
	const revokeResponse = await fetch(`${baseUrl}/skip-permissions/tokens/${token}`, {
		method: 'DELETE',
		headers: {
			Authorization: 'Bearer admin-token',
		},
	});

	console.log('Revoke response:', await revokeResponse.json());

	// 7. Try using revoked token (should fail)
	console.log('\n7. Using revoked token...');
	const revokedResponse = await fetch(`${baseUrl}/api/admin/dashboard`, {
		headers: {
			Authorization: 'Bearer user-token',
			'X-Skip-Permissions': token,
		},
	});

	console.log('Status:', revokedResponse.status);
	console.log('Response:', await revokedResponse.json());
}

// Uncomment to run demo when starting the server
// setTimeout(demonstrateSkipPermissions, 1000);

export default app;
