import { describe, expect, it } from 'vitest';

import { McpValidationError } from '../src/mcp/errors.js';
import type { ResponseHandlingInput } from '../src/mcp/schemas.js';
import { createTestEnvironment } from './test-utils.js';

describe('ApiResponseHandlingTool', () => {
  it('normalizes successful responses into success payloads', async () => {
    const env = createTestEnvironment();
    const input: ResponseHandlingInput = {
      routeId: 'users.list',
      statusCode: 200,
      rawBody: { users: [{ id: 'user-1', name: '<script>Alert</script>User' }] },
      headers: { 'Content-Type': 'application/json' },
      durationMs: 5,
      requestId: 'req-1',
      correlationId: 'cid-1',
    };

    const result = await env.responseTool.execute(input, env.context);

    expect(result.status).toBe('success');
    expect(result.body).toEqual({ users: [{ id: 'user-1', name: 'User' }] });
    expect(result.metadata).toHaveProperty('requestId', 'req-1');
    expect(result.headers).toEqual({ 'content-type': 'application/json' });
  });

  it('wraps error responses with structured error payloads', async () => {
    const env = createTestEnvironment();
    const input: ResponseHandlingInput = {
      routeId: 'users.list',
      statusCode: 500,
      rawBody: { message: 'server exploded' },
      headers: { 'content-type': 'application/json' },
      durationMs: 12,
      requestId: 'req-2',
    };

    const result = await env.responseTool.execute(input, env.context);

    expect(result.status).toBe('error');
    expect(result.body).toMatchObject({ code: 'E_API_HANDLER' });
    expect(result.metadata).toMatchObject({ durationMs: 12 });
  });

  it('validates required fields', async () => {
    const env = createTestEnvironment();

    await expect(
      env.responseTool.execute(
        {
          routeId: 'users.list',
        } as unknown as ResponseHandlingInput,
        env.context,
      ),
    ).rejects.toBeInstanceOf(McpValidationError);
  });
});
