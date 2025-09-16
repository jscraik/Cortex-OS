import { describe, expect, it } from 'vitest';

import type { GatewayToolInput } from '../src/mcp/schemas.js';
import { McpRouteNotFoundError } from '../src/mcp/errors.js';
import { createTestEnvironment } from './test-utils.js';

describe('API MCP integration flow', () => {
  it('executes an end-to-end order creation flow with sanitization and auditing', async () => {
    const env = createTestEnvironment();
    const gatewayInput: GatewayToolInput = {
      operationId: 'orders.create',
      method: 'POST',
      path: '/orders',
      apiKey: 'valid-key',
      payload: { items: [{ sku: 'item-1', quantity: 2 }], note: '<script>alert()</script>ship' },
      headers: { 'x-correlation-id': 'cid-123' },
    };

    const gatewayResult = await env.gatewayTool.execute(gatewayInput, env.context);

    expect(gatewayResult.statusCode).toBe(201);
    expect(gatewayResult.body).toMatchObject({ payload: { items: [{ sku: 'item-1', quantity: 2 }], note: 'ship' } });
    expect(gatewayResult.fromCache).toBe(false);
    expect(env.metrics.get('mcp.api.requests')).toBe(1);
    expect(env.metrics.get('mcp.api.cache.miss')).toBe(0);

    const handled = await env.responseTool.execute(
      {
        routeId: 'orders.create',
        statusCode: gatewayResult.statusCode,
        rawBody: gatewayResult.body,
        headers: gatewayResult.headers,
        durationMs: gatewayResult.durationMs,
        requestId: gatewayResult.requestId,
        correlationId: 'cid-123',
      },
      env.context,
    );

    expect(handled.status).toBe('success');
    expect(handled.body).toHaveProperty('orderId');
    expect(handled.metadata).toMatchObject({ requestId: gatewayResult.requestId, routeId: 'orders.create' });
    expect(env.audit.list()).toHaveLength(1);
    expect(env.metrics.get('mcp.tools.api-response.handled')).toBe(1);
  });

  it('captures route resolution failures for observability', async () => {
    const env = createTestEnvironment();
    const gatewayInput: GatewayToolInput = {
      operationId: 'unknown.route',
      method: 'GET',
      path: '/missing',
      apiKey: 'valid-key',
    };

    await expect(env.gatewayTool.execute(gatewayInput, env.context)).rejects.toBeInstanceOf(McpRouteNotFoundError);
    const warnLog = env.logger.history.find((entry) => entry.level === 'warn');
    expect(warnLog).toBeDefined();
  });
});
