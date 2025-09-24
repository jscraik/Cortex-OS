import { Hono } from 'hono';
import { z } from 'zod';
import type { FeatureFlags } from './flags.js';
import type { StorageAdapter } from './types.js';

// Validation schemas
const CreateFlagSchema = z.object({
	enabled: z.boolean(),
	targeting: z
		.object({
			userTargets: z.array(z.string()).optional(),
			attributeRules: z
				.array(
					z.object({
						attribute: z.string(),
						operator: z.enum([
							'equals',
							'notEquals',
							'contains',
							'notContains',
							'startsWith',
							'endsWith',
							'greaterThan',
							'lessThan',
							'greaterThanOrEqual',
							'lessThanOrEqual',
							'in',
							'notIn',
						]),
						value: z.union([z.string(), z.number(), z.boolean()]),
					}),
				)
				.optional(),
			ruleLogic: z.enum(['AND', 'OR']).optional(),
		})
		.optional(),
	percentageRollout: z
		.object({
			percentage: z.number().min(0).max(100),
			salt: z.string(),
		})
		.optional(),
	abTest: z
		.object({
			groups: z.array(
				z.object({
					name: z.string(),
					percentage: z.number().min(0).max(100),
					config: z.record(z.unknown()).optional(),
				}),
			),
			salt: z.string(),
		})
		.optional(),
	overrides: z.record(z.boolean()).optional(),
	metadata: z.record(z.unknown()).optional(),
});

const UpdateFlagSchema = CreateFlagSchema.partial();

// Type definitions for internal use
// type CreateFlagInput = z.infer<typeof CreateFlagSchema>;
// type UpdateFlagInput = z.infer<typeof UpdateFlagSchema>;

/**
 * Create admin API routes for feature flags management
 */
export function createFeatureFlagsAdminRouter(
	featureFlags: FeatureFlags,
	options: {
		authenticate?: (c: any, next: any) => Promise<void> | void;
		basePath?: string;
	} = {},
) {
	const { authenticate, basePath = '/admin/api/flags' } = options;
	const router = new Hono();

	// Apply authentication middleware if provided
	if (authenticate) {
		router.use('*', async (c, next) => {
			await authenticate(c, next);
		});
	}

	// GET /flags - List all flags
	router.get(basePath, async (c) => {
		try {
			const flags = await featureFlags.getAllFlags();
			return c.json({
				success: true,
				data: flags,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			console.error('Failed to fetch flags:', error);
			return c.json(
				{
					success: false,
					error: 'Failed to fetch flags',
					message: error instanceof Error ? error.message : 'Unknown error',
				},
				500,
			);
		}
	});

	// GET /flags/:name - Get specific flag
	router.get(`${basePath}/:name`, async (c) => {
		try {
			const flagName = c.req.param('name');
			const flag = await featureFlags.getFlag(flagName);

			if (!flag) {
				return c.json(
					{
						success: false,
						error: 'Flag not found',
					},
					404,
				);
			}

			return c.json({
				success: true,
				data: flag,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			return c.json(
				{
					success: false,
					error: 'Failed to fetch flag',
					message: error instanceof Error ? error.message : 'Unknown error',
				},
				500,
			);
		}
	});

	// POST /flags - Create new flag
	router.post(basePath, async (c) => {
		try {
			let body: any;
			try {
				body = await c.req.json();
			} catch (_jsonError) {
				return c.json(
					{
						success: false,
						error: 'Invalid JSON in request body',
					},
					400,
				);
			}

			const result = CreateFlagSchema.safeParse(body);

			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Invalid request body',
						details: result.error.errors,
					},
					400,
				);
			}

			const flagName = body.name || `flag-${Date.now()}`;
			await featureFlags.setFlag(flagName, result.data);

			const createdFlag = await featureFlags.getFlag(flagName);

			return c.json(
				{
					success: true,
					data: {
						name: flagName,
						config: createdFlag,
					},
					timestamp: new Date().toISOString(),
				},
				201,
			);
		} catch (error) {
			return c.json(
				{
					success: false,
					error: 'Failed to create flag',
					message: error instanceof Error ? error.message : 'Unknown error',
				},
				500,
			);
		}
	});

	// PUT /flags/:name - Update flag
	router.put(`${basePath}/:name`, async (c) => {
		try {
			const flagName = c.req.param('name');
			let body: any;
			try {
				body = await c.req.json();
			} catch (_jsonError) {
				return c.json(
					{
						success: false,
						error: 'Invalid JSON in request body',
					},
					400,
				);
			}

			const result = UpdateFlagSchema.safeParse(body);

			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Invalid request body',
						details: result.error.errors,
					},
					400,
				);
			}

			const existingFlag = await featureFlags.getFlag(flagName);
			if (!existingFlag) {
				return c.json(
					{
						success: false,
						error: 'Flag not found',
					},
					404,
				);
			}

			const updatedConfig = { ...existingFlag, ...result.data };
			await featureFlags.setFlag(flagName, updatedConfig);

			const updatedFlag = await featureFlags.getFlag(flagName);

			return c.json({
				success: true,
				data: {
					name: flagName,
					config: updatedFlag,
				},
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			return c.json(
				{
					success: false,
					error: 'Failed to update flag',
					message: error instanceof Error ? error.message : 'Unknown error',
				},
				500,
			);
		}
	});

	// DELETE /flags/:name - Delete flag
	router.delete(`${basePath}/:name`, async (c) => {
		try {
			const flagName = c.req.param('name');
			const existingFlag = await featureFlags.getFlag(flagName);

			if (!existingFlag) {
				return c.json(
					{
						success: false,
						error: 'Flag not found',
					},
					404,
				);
			}

			await featureFlags.deleteFlag(flagName);

			return c.json({
				success: true,
				message: 'Flag deleted successfully',
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			return c.json(
				{
					success: false,
					error: 'Failed to delete flag',
					message: error instanceof Error ? error.message : 'Unknown error',
				},
				500,
			);
		}
	});

	// POST /flags/:name/evaluate - Evaluate flag for user
	router.post(`${basePath}/:name/evaluate`, async (c) => {
		try {
			const flagName = c.req.param('name');
			let body: any;
			try {
				body = await c.req.json();
			} catch (_jsonError) {
				return c.json(
					{
						success: false,
						error: 'Invalid JSON in request body',
					},
					400,
				);
			}

			const { userId, attributes = {} } = body;

			if (!userId) {
				return c.json(
					{
						success: false,
						error: 'userId is required',
					},
					400,
				);
			}

			const isEnabled = await featureFlags.isEnabled(flagName, { userId, attributes });
			const variant = await featureFlags.getVariant(flagName, { userId, attributes });

			return c.json({
				success: true,
				data: {
					flagName,
					isEnabled,
					variant,
					userContext: { userId, attributes },
				},
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			return c.json(
				{
					success: false,
					error: 'Failed to evaluate flag',
					message: error instanceof Error ? error.message : 'Unknown error',
				},
				500,
			);
		}
	});

	// GET /flags/:name/audit - Get flag change history (if storage supports it)
	router.get(`${basePath}/:name/audit`, async (c) => {
		try {
			const flagName = c.req.param('name');

			// This would require storage adapter to support audit log retrieval
			// For now, return a placeholder response
			return c.json({
				success: true,
				data: {
					flagName,
					message: 'Audit log not implemented in base storage adapter',
					auditLogs: [],
				},
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			return c.json(
				{
					success: false,
					error: 'Failed to fetch audit log',
					message: error instanceof Error ? error.message : 'Unknown error',
				},
				500,
			);
		}
	});

	return router;
}

/**
 * In-memory storage adapter for development/testing
 */
export class InMemoryStorageAdapter implements StorageAdapter {
	private store: Map<string, unknown> = new Map();

	async get(key: string): Promise<unknown> {
		return this.store.get(key);
	}

	async set(key: string, value: unknown): Promise<void> {
		this.store.set(key, value);
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
	}

	async clear(): Promise<void> {
		this.store.clear();
	}

	// Helper for testing
	getData(): Record<string, unknown> {
		return Object.fromEntries(this.store);
	}
}
