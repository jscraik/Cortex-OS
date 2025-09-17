import { describe, expect, it } from 'vitest';

import {
	McpRateLimitError,
	McpRouteNotFoundError,
	McpSecurityError,
	McpValidationError,
} from '../src/mcp/errors.js';
import type { GatewayToolInput } from '../src/mcp/schemas.js';
import { createTestEnvironment } from './test-utils.js';

describe('ApiGatewayTool', () => {
	it('executes a valid request through the gateway', async () => {
		const env = createTestEnvironment();
		const input: GatewayToolInput = {
			operationId: 'users.list',
			method: 'GET',
			path: '/users',
			apiKey: 'valid-key',
			headers: { 'x-correlation-id': 'cid-1' },
		};

		const result = await env.gatewayTool.execute(input, env.context);

		expect(result.statusCode).toBe(200);
		expect(result.body).toEqual({ users: [{ id: 'user-1', name: 'Test' }] });
		expect(result.fromCache).toBe(false);
		expect(env.metrics.get('mcp.tools.api-gateway.success')).toBe(1);
	});

	it('caches successful responses for subsequent calls', async () => {
		const env = createTestEnvironment();
		const input: GatewayToolInput = {
			operationId: 'users.list',
			method: 'GET',
			path: '/users',
			apiKey: 'valid-key',
		};

		const first = await env.gatewayTool.execute(input, env.context);
		const second = await env.gatewayTool.execute(input, env.context);

		expect(first.fromCache).toBe(false);
		expect(second.fromCache).toBe(true);
		expect(env.metrics.get('mcp.api.cache.hit')).toBe(1);
	});

	it('throws validation error when input is invalid', async () => {
		const env = createTestEnvironment();

		await expect(
			env.gatewayTool.execute(
				{
					method: 'GET',
					path: '',
				} as unknown as GatewayToolInput,
				env.context,
			),
		).rejects.toBeInstanceOf(McpValidationError);
	});

	it('rejects unauthenticated calls for protected routes', async () => {
		const env = createTestEnvironment();
		const input: GatewayToolInput = {
			operationId: 'users.list',
			method: 'GET',
			path: '/users',
			apiKey: 'invalid-key',
		};

		await expect(
			env.gatewayTool.execute(input, env.context),
		).rejects.toBeInstanceOf(McpSecurityError);
	});

	it('enforces rate limits per API key', async () => {
		const env = createTestEnvironment();
		const input: GatewayToolInput = {
			operationId: 'users.list',
			method: 'GET',
			path: '/users',
			apiKey: 'valid-key',
		};

		await env.gatewayTool.execute(input, env.context);
		await env.gatewayTool.execute(input, env.context);

		await expect(
			env.gatewayTool.execute(input, env.context),
		).rejects.toBeInstanceOf(McpRateLimitError);
	});

	it('maps missing routes to descriptive errors', async () => {
		const env = createTestEnvironment();
		const input: GatewayToolInput = {
			operationId: 'unknown.operation',
			method: 'GET',
			path: '/missing',
			apiKey: 'valid-key',
		};

		await expect(
			env.gatewayTool.execute(input, env.context),
		).rejects.toBeInstanceOf(McpRouteNotFoundError);
	});
});
