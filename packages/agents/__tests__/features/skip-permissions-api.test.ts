import type { SkipPermissionsService } from '@cortex-os/orchestration/security/skip-permissions';
import { beforeEach, describe, expect, it, jest } from 'vitest';
import { SkipPermissionsAPI } from '../../src/features/skip-permissions-api';

type MockContextOverrides = {
	req?: {
		header?: ReturnType<typeof jest.fn>;
		json?: ReturnType<typeof jest.fn>;
		query?: ReturnType<typeof jest.fn>;
	};
	get?: ReturnType<typeof jest.fn>;
	json?: ReturnType<typeof jest.fn>;
	param?: ReturnType<typeof jest.fn>;
	query?: ReturnType<typeof jest.fn>;
};

type MockContext = {
	req: {
		header: ReturnType<typeof jest.fn>;
		json: ReturnType<typeof jest.fn>;
		query: ReturnType<typeof jest.fn>;
	};
	get: ReturnType<typeof jest.fn>;
	json: ReturnType<typeof jest.fn>;
	param: ReturnType<typeof jest.fn>;
	query: ReturnType<typeof jest.fn>;
};

// Mock Hono
const createMockContext = (overrides: MockContextOverrides = {}): MockContext => {
	const { req: reqOverrides, get, json, param, query } = overrides;

	return {
		req: {
			header: jest.fn(),
			json: jest.fn(),
			query: jest.fn(),
			...reqOverrides,
		},
		get: get ?? jest.fn(),
		json: json ?? jest.fn(),
		param: param ?? jest.fn(),
		query: query ?? jest.fn(),
	};
};

type RouteHandler = (ctx: MockContext) => Promise<unknown> | unknown;

const findHandler = (
	api: SkipPermissionsAPI,
	path: string,
	method: string,
): RouteHandler | undefined => {
	const route = api.getApp().routes.find((r) => r.path === path && r.method === method);

	return route?.handler as unknown as RouteHandler | undefined;
};

describe('SkipPermissionsAPI', () => {
	let api: SkipPermissionsAPI;
	let mockSkipService: jest.Mocked<SkipPermissionsService>;

	beforeEach(() => {
		// Create a mock SkipPermissionsService
		mockSkipService = {
			canBypass: jest.fn(),
			generateBypassToken: jest.fn(),
			listBypassTokens: jest.fn(),
			revokeBypassToken: jest.fn(),
			getConfig: jest.fn(),
			updateConfig: jest.fn(),
			getRateLimitStatus: jest.fn(),
			resetRateLimit: jest.fn(),
		} satisfies jest.Mocked<SkipPermissionsService>;

		api = new SkipPermissionsAPI(mockSkipService);
	});

	describe('GET /skip-permissions/health', () => {
		it('should return health status', async () => {
			mockSkipService.getConfig.mockReturnValue({
				enabled: true,
				requireAdmin: true,
			});

			const mockContext = createMockContext();
			const handler = findHandler(api, '/skip-permissions/health', 'GET');
			if (!handler) {
				throw new Error('Route handler not found');
			}

			await handler(mockContext);
			expect(mockContext.json).toHaveBeenCalledWith({
				status: 'ok',
				enabled: true,
				timestamp: expect.any(String),
			});
		});
	});

	describe('POST /skip-permissions/tokens', () => {
		it('should require admin role', async () => {
			const mockContext = createMockContext({
				get: jest.fn().mockReturnValue({ role: 'user' }),
			});

			const handler = findHandler(api, '/skip-permissions/tokens', 'POST');
			if (!handler) {
				throw new Error('Route handler not found');
			}

			await handler(mockContext);
			expect(mockContext.json).toHaveBeenCalledWith({ error: 'Admin access required' }, 403);
		});

		it('should create token for admin user', async () => {
			const mockUser = { id: 'admin1', role: 'admin' };
			const mockToken = {
				token: 'test-token-123',
				description: 'Test token',
				createdAt: '2024-01-01T00:00:00Z',
				createdBy: 'admin1',
			};

			mockSkipService.generateBypassToken.mockReturnValue(mockToken);

			const mockContext = createMockContext({
				get: jest.fn().mockReturnValue(mockUser),
				req: {
					json: jest.fn().mockResolvedValue({
						description: 'Test token',
						duration: 3600000,
					}),
				},
			});

			const handler = findHandler(api, '/skip-permissions/tokens', 'POST');
			if (!handler) {
				throw new Error('Route handler not found');
			}

			await handler(mockContext);
			expect(mockSkipService.generateBypassToken).toHaveBeenCalledWith(
				'Test token',
				'admin1',
				3600000,
			);
			expect(mockContext.json).toHaveBeenCalledWith({
				token: 'test-token-123',
				description: 'Test token',
				createdAt: '2024-01-01T00:00:00Z',
				createdBy: 'admin1',
			});
		});

		it('should validate request body', async () => {
			const mockUser = { id: 'admin1', role: 'admin' };

			const mockContext = createMockContext({
				get: jest.fn().mockReturnValue(mockUser),
				req: {
					json: jest.fn().mockResolvedValue({
						description: '', // Invalid: empty string
					}),
				},
			});

			const handler = findHandler(api, '/skip-permissions/tokens', 'POST');
			if (!handler) {
				throw new Error('Route handler not found');
			}

			await handler(mockContext);
			expect(mockContext.json).toHaveBeenCalledWith(
				{ error: 'Invalid request body', details: expect.any(Array) },
				400,
			);
		});
	});

	describe('GET /skip-permissions/tokens', () => {
		it('should list tokens for admin', async () => {
			const mockUser = { id: 'admin1', role: 'admin' };
			const mockTokens = [
				{ token: 'token1', description: 'Token 1' },
				{ token: 'token2', description: 'Token 2' },
			];

			mockSkipService.listBypassTokens.mockReturnValue(mockTokens);

			const mockContext = createMockContext({
				get: jest.fn().mockReturnValue(mockUser),
			});

			const handler = findHandler(api, '/skip-permissions/tokens', 'GET');
			if (!handler) {
				throw new Error('Route handler not found');
			}

			await handler(mockContext);
			expect(mockContext.json).toHaveBeenCalledWith({
				tokens: mockTokens,
				count: 2,
			});
		});
	});

	describe('DELETE /skip-permissions/tokens/:token', () => {
		it('should revoke token for admin', async () => {
			const mockUser = { id: 'admin1', role: 'admin' };
			mockSkipService.revokeBypassToken.mockReturnValue(true);

			const mockContext = createMockContext({
				get: jest.fn().mockReturnValue(mockUser),
				param: jest.fn().mockReturnValue('test-token'),
			});

			const handler = findHandler(api, '/skip-permissions/tokens/:token', 'DELETE');
			if (!handler) {
				throw new Error('Route handler not found');
			}

			await handler(mockContext);
			expect(mockSkipService.revokeBypassToken).toHaveBeenCalledWith('test-token');
			expect(mockContext.json).toHaveBeenCalledWith({ success: true });
		});

		it('should return 404 for non-existent token', async () => {
			const mockUser = { id: 'admin1', role: 'admin' };
			mockSkipService.revokeBypassToken.mockReturnValue(false);

			const mockContext = createMockContext({
				get: jest.fn().mockReturnValue(mockUser),
				param: jest.fn().mockReturnValue('non-existent'),
			});

			const handler = findHandler(api, '/skip-permissions/tokens/:token', 'DELETE');
			if (!handler) {
				throw new Error('Route handler not found');
			}

			await handler(mockContext);
			expect(mockContext.json).toHaveBeenCalledWith({ error: 'Token not found' }, 404);
		});
	});

	describe('GET /skip-permissions/config', () => {
		it('should return configuration for admin', async () => {
			const mockUser = { id: 'admin1', role: 'admin' };
			const mockConfig = {
				enabled: true,
				requireAdmin: true,
				auditLog: true,
			};

			mockSkipService.getConfig.mockReturnValue(mockConfig);

			const mockContext = createMockContext({
				get: jest.fn().mockReturnValue(mockUser),
			});

			const handler = findHandler(api, '/skip-permissions/config', 'GET');
			if (!handler) {
				throw new Error('Route handler not found');
			}

			await handler(mockContext);
			expect(mockContext.json).toHaveBeenCalledWith(mockConfig);
		});
	});

	describe('PATCH /skip-permissions/config', () => {
		it('should update configuration for admin', async () => {
			const mockUser = { id: 'admin1', role: 'admin' };
			const newConfig = {
				enabled: false,
				requireAdmin: false,
			};

			mockSkipService.updateConfig.mockReturnValue(newConfig);

			const mockContext = createMockContext({
				get: jest.fn().mockReturnValue(mockUser),
				req: {
					json: jest.fn().mockResolvedValue(newConfig),
				},
			});

			const handler = findHandler(api, '/skip-permissions/config', 'PATCH');
			if (!handler) {
				throw new Error('Route handler not found');
			}

			await handler(mockContext);
			expect(mockSkipService.updateConfig).toHaveBeenCalledWith(newConfig);
			expect(mockContext.json).toHaveBeenCalledWith({
				success: true,
				config: newConfig,
			});
		});
	});

	describe('POST /skip-permissions/check', () => {
		it('should perform dry run check for admin', async () => {
			const mockUser = { id: 'admin1', role: 'admin' };
			const mockResult = {
				allowed: true,
				bypassType: 'admin',
			};

			mockSkipService.canBypass.mockResolvedValue(mockResult);

			const mockContext = createMockContext({
				get: jest.fn().mockReturnValue(mockUser),
				req: {
					json: jest.fn().mockResolvedValue({
						bypassToken: 'test-token',
						resource: 'test:resource',
						action: 'read',
					}),
					header: jest.fn().mockReturnValue('192.168.1.1'),
				},
			});

			const handler = findHandler(api, '/skip-permissions/check', 'POST');
			if (!handler) {
				throw new Error('Route handler not found');
			}

			await handler(mockContext);
			expect(mockContext.json).toHaveBeenCalledWith(mockResult);
		});
	});

	describe('GET /skip-permissions/rate-limit/status', () => {
		it('should return rate limit status for admin', async () => {
			const mockUser = { id: 'admin1', role: 'admin' };
			const mockStatus = {
				ipAddress: '192.168.1.1',
				limited: false,
				remaining: 5,
			};

			mockSkipService.getRateLimitStatus.mockReturnValue(mockStatus);

			const mockContext = createMockContext({
				get: jest.fn().mockReturnValue(mockUser),
				req: {
					header: jest.fn().mockReturnValue('192.168.1.1'),
				},
			});

			const handler = findHandler(api, '/skip-permissions/rate-limit/status', 'GET');
			if (!handler) {
				throw new Error('Route handler not found');
			}

			await handler(mockContext);
			expect(mockContext.json).toHaveBeenCalledWith(mockStatus);
		});
	});

	describe('POST /skip-permissions/rate-limit/reset', () => {
		it('should reset rate limit for admin', async () => {
			const mockUser = { id: 'admin1', role: 'admin' };
			mockSkipService.resetRateLimit.mockReturnValue(true);

			const mockContext = createMockContext({
				get: jest.fn().mockReturnValue(mockUser),
				req: {
					json: jest.fn().mockResolvedValue({
						ipAddress: '192.168.1.1',
					}),
				},
			});

			const handler = findHandler(api, '/skip-permissions/rate-limit/reset', 'POST');
			if (!handler) {
				throw new Error('Route handler not found');
			}

			await handler(mockContext);
			expect(mockSkipService.resetRateLimit).toHaveBeenCalledWith('192.168.1.1');
			expect(mockContext.json).toHaveBeenCalledWith({
				success: true,
				message: 'Rate limit reset successfully',
			});
		});

		it('should require IP address in request body', async () => {
			const mockUser = { id: 'admin1', role: 'admin' };

			const mockContext = createMockContext({
				get: jest.fn().mockReturnValue(mockUser),
				req: {
					json: jest.fn().mockResolvedValue({}),
				},
			});

			const handler = findHandler(api, '/skip-permissions/rate-limit/reset', 'POST');
			if (!handler) {
				throw new Error('Route handler not found');
			}

			await handler(mockContext);
			expect(mockContext.json).toHaveBeenCalledWith({ error: 'IP address is required' }, 400);
		});
	});
});
