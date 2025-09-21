import type { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createFeatureFlagsAdminRouter,
	InMemoryStorageAdapter,
} from '../../src/features/admin-api';
import { FeatureFlags } from '../../src/features/flags';

describe('Feature Flags Admin API', () => {
	let featureFlags: FeatureFlags;
	let storage: InMemoryStorageAdapter;
	let app: Hono;
	let authenticateMock: any;

	beforeEach(() => {
		vi.clearAllMocks();

		storage = new InMemoryStorageAdapter();
		featureFlags = new FeatureFlags({ storage });

		authenticateMock = vi.fn().mockImplementation((_c: any, next: any) => next());

		app = createFeatureFlagsAdminRouter(featureFlags, {
			authenticate: authenticateMock,
			basePath: '/api/flags',
		});
	});

	describe('GET /api/flags', () => {
		it('should return empty array when no flags exist', async () => {
			const response = await app.request('/api/flags');
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.data).toEqual({});
			expect(authenticateMock).toHaveBeenCalled();
		});

		it('should return all flags', async () => {
			await featureFlags.setFlag('test-flag', {
				enabled: true,
				metadata: { description: 'Test flag' },
			});

			const response = await app.request('/api/flags');
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.data).toHaveProperty('test-flag');
			expect(body.data['test-flag'].enabled).toBe(true);
		});

		it('should handle storage errors gracefully', async () => {
			vi.spyOn(featureFlags, 'getAllFlags').mockRejectedValue(new Error('Storage error'));

			const response = await app.request('/api/flags');
			expect(response.status).toBe(500);

			const body = await response.json();
			expect(body.success).toBe(false);
			expect(body.error).toBe('Failed to fetch flags');
		});
	});

	describe('GET /api/flags/:name', () => {
		it('should return specific flag', async () => {
			await featureFlags.setFlag('test-flag', {
				enabled: true,
				percentageRollout: {
					percentage: 50,
					salt: 'test-salt',
				},
			});

			const response = await app.request('/api/flags/test-flag');
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.data.enabled).toBe(true);
			expect(body.data.percentageRollout).toEqual({
				percentage: 50,
				salt: 'test-salt',
			});
		});

		it('should return 404 for non-existent flag', async () => {
			const response = await app.request('/api/flags/non-existent');
			expect(response.status).toBe(404);

			const body = await response.json();
			expect(body.success).toBe(false);
			expect(body.error).toBe('Flag not found');
		});
	});

	describe('POST /api/flags', () => {
		it('should create new flag', async () => {
			const flagData = {
				name: 'new-feature',
				enabled: true,
				targeting: {
					userTargets: ['user1', 'user2'],
				},
			};

			const response = await app.request('/api/flags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(flagData),
			});

			expect(response.status).toBe(201);

			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.data.name).toBe('new-feature');
			expect(body.data.config.enabled).toBe(true);

			// Verify flag was actually created
			const flag = await featureFlags.getFlag('new-feature');
			expect(flag).toBeDefined();
			expect(flag?.enabled).toBe(true);
		});

		it('should create flag with generated name when none provided', async () => {
			const flagData = {
				enabled: false,
			};

			const response = await app.request('/api/flags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(flagData),
			});

			expect(response.status).toBe(201);

			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.data.name).toMatch(/^flag-\d+$/);
		});

		it('should validate request body', async () => {
			const invalidData = {
				enabled: 'not-a-boolean',
				percentageRollout: {
					percentage: 150, // Invalid percentage
				},
			};

			const response = await app.request('/api/flags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(invalidData),
			});

			expect(response.status).toBe(400);

			const body = await response.json();
			expect(body.success).toBe(false);
			expect(body.error).toBe('Invalid request body');
			expect(body.details).toBeDefined();
		});
	});

	describe('PUT /api/flags/:name', () => {
		it('should update existing flag', async () => {
			await featureFlags.setFlag('test-flag', {
				enabled: false,
			});

			const updateData = {
				enabled: true,
				metadata: {
					updatedBy: 'admin',
					reason: 'Feature ready for release',
				},
			};

			const response = await app.request('/api/flags/test-flag', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updateData),
			});

			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.data.config.enabled).toBe(true);
			expect(body.data.config.metadata).toEqual(updateData.metadata);

			// Verify update persisted
			const flag = await featureFlags.getFlag('test-flag');
			expect(flag?.enabled).toBe(true);
		});

		it('should return 404 for non-existent flag', async () => {
			const response = await app.request('/api/flags/non-existent', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled: true }),
			});

			expect(response.status).toBe(404);
		});

		it('should validate update data', async () => {
			await featureFlags.setFlag('test-flag', { enabled: true });

			const invalidData = {
				percentageRollout: {
					percentage: -10, // Invalid
				},
			};

			const response = await app.request('/api/flags/test-flag', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(invalidData),
			});

			expect(response.status).toBe(400);
		});
	});

	describe('DELETE /api/flags/:name', () => {
		it('should delete existing flag', async () => {
			await featureFlags.setFlag('test-flag', { enabled: true });

			const response = await app.request('/api/flags/test-flag', {
				method: 'DELETE',
			});

			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.message).toBe('Flag deleted successfully');

			// Verify flag was deleted
			const flag = await featureFlags.getFlag('test-flag');
			expect(flag).toBeUndefined();
		});

		it('should return 404 for non-existent flag', async () => {
			const response = await app.request('/api/flags/non-existent', {
				method: 'DELETE',
			});

			expect(response.status).toBe(404);
		});
	});

	describe('POST /api/flags/:name/evaluate', () => {
		beforeEach(async () => {
			await featureFlags.setFlag('feature-flag', {
				enabled: true,
				percentageRollout: {
					percentage: 50,
					salt: 'test-salt',
				},
				abTest: {
					groups: [
						{ name: 'control', percentage: 50 },
						{ name: 'variant', percentage: 50 },
					],
					salt: 'ab-test-salt',
				},
			});
		});

		it('should evaluate flag for user', async () => {
			const evaluateData = {
				userId: 'user123',
				attributes: { plan: 'premium' },
			};

			const response = await app.request('/api/flags/feature-flag/evaluate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(evaluateData),
			});

			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.data).toHaveProperty('isEnabled');
			expect(body.data).toHaveProperty('variant');
			expect(body.data.flagName).toBe('feature-flag');
			expect(body.data.userContext).toEqual(evaluateData);
		});

		it('should require userId', async () => {
			const response = await app.request('/api/flags/feature-flag/evaluate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ attributes: { plan: 'premium' } }),
			});

			expect(response.status).toBe(400);

			const body = await response.json();
			expect(body.success).toBe(false);
			expect(body.error).toBe('userId is required');
		});

		it('should handle non-existent flag', async () => {
			const response = await app.request('/api/flags/non-existent/evaluate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: 'user123' }),
			});

			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.data.isEnabled).toBe(false);
			expect(body.data.variant).toBeNull();
		});
	});

	describe('GET /api/flags/:name/audit', () => {
		it('should return audit log placeholder', async () => {
			await featureFlags.setFlag('test-flag', { enabled: true });

			const response = await app.request('/api/flags/test-flag/audit');
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.data.flagName).toBe('test-flag');
			expect(body.data.message).toContain('not implemented');
			expect(body.data.auditLogs).toEqual([]);
		});
	});

	describe('Authentication', () => {
		it('should apply authentication middleware', async () => {
			const unauthenticatedApp = createFeatureFlagsAdminRouter(featureFlags, {
				authenticate: (c: any) => {
					return c.json({ success: false, error: 'Unauthorized' }, 401);
				},
			});

			const response = await unauthenticatedApp.request('/api/flags');
			expect(response.status).toBe(401);
		});

		it('should work without authentication middleware', async () => {
			const noAuthApp = createFeatureFlagsAdminRouter(featureFlags, {
				basePath: '/api/flags',
			});

			const response = await noAuthApp.request('/api/flags');
			expect(response.status).toBe(200);
		});
	});

	describe('Error handling', () => {
		it('should handle JSON parse errors', async () => {
			const response = await app.request('/api/flags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: 'invalid json',
			});

			expect(response.status).toBe(400);
		});

		it('should handle unexpected errors', async () => {
			vi.spyOn(featureFlags, 'setFlag').mockRejectedValue(new Error('Unexpected error'));

			const response = await app.request('/api/flags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled: true }),
			});

			expect(response.status).toBe(500);
		});
	});
});
