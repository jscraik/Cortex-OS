import { describe, expect, it } from 'vitest';

import { McpRouteNotFoundError, McpValidationError } from '../src/mcp/errors.js';
import type { RoutingToolInput } from '../src/mcp/schemas.js';
import { createTestEnvironment } from './test-utils.js';

describe('ApiRequestRoutingTool', () => {
	it('resolves routes by operation identifier', async () => {
		const env = createTestEnvironment();
		const input: RoutingToolInput = {
			operationId: 'users.list',
			method: 'GET',
			path: '/users',
		};

		const result = await env.routingTool.execute(input, env.context);

		expect(result.route.id).toBe('users.list');
		expect(result.inputShape).toHaveProperty('page');
		expect(env.metrics.get('mcp.tools.api-routing.success')).toBe(1);
	});

	it('resolves routes using method and path', async () => {
		const env = createTestEnvironment();
		const input: RoutingToolInput = { method: 'POST', path: '/orders' };

		const result = await env.routingTool.execute(input, env.context);

		expect(result.route.action).toBe('createOrder');
	});

	it('throws validation errors for invalid payload', async () => {
		const env = createTestEnvironment();

		await expect(
			env.routingTool.execute(
				{
					// @ts-expect-error invalid route input
					method: 'INVALID',
					path: '',
				},
				env.context,
			),
		).rejects.toBeInstanceOf(McpValidationError);
	});

	it('raises descriptive error when route cannot be found', async () => {
		const env = createTestEnvironment();
		const input: RoutingToolInput = { method: 'GET', path: '/missing' };

		await expect(env.routingTool.execute(input, env.context)).rejects.toBeInstanceOf(
			McpRouteNotFoundError,
		);
		expect(env.metrics.get('mcp.tools.api-routing.failure')).toBe(1);
	});
});
