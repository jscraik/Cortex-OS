/**
 * Integration test ensuring ASBR policies can block unsafe workflows.
 * @vitest-environment node
 */

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PolicyRegistry } from '@cortex-os/asbr-policy';
import { initializeAuth } from '../../src/api/auth.js';
import { type ASBRServer, createASBRServer } from '../../src/api/server.js';
import type { TaskInput } from '../../src/types/index.js';
import { initializeXDG } from '../../src/xdg/index.js';

describe('Policy enforcement integration', () => {
  let server: ASBRServer;
  let authToken: string;

  beforeAll(async () => {
    await initializeXDG();
    const tokenInfo = await initializeAuth();
    authToken = tokenInfo.token;

    const policyRegistry = new PolicyRegistry();
    policyRegistry.register('deny-forbidden-title', {
      id: 'policy.block.forbidden-title',
      description: 'Blocks task titles containing "forbidden"',
      evaluate: (context) => {
        if (context.kind !== 'task.create') {
          return { allowed: true };
        }
        const input = context.input as TaskInput;
        const shouldBlock = input.title.toLowerCase().includes('forbidden');
        return shouldBlock
          ? { allowed: false, reason: 'Task creation blocked by policy.deny-forbidden-title' }
          : { allowed: true };
      },
    });

    server = createASBRServer({ port: 0, host: '127.0.0.1', policyRegistry });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('rejects task creation when a policy denies it', async () => {
    const taskInput: TaskInput = {
      title: 'Forbidden research request',
      brief: 'Investigate something unsafe',
      inputs: [{ kind: 'text', value: 'unsafe payload' }],
      scopes: ['tasks:create'],
      schema: 'cortex.task.input@1',
    };

    const response = await request(server.app)
      .post('/v1/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ input: taskInput })
      .expect(403);

    expect(response.body.error).toMatch(/policy\.deny-forbidden-title/);
  });

  it('allows task creation when policies permit it', async () => {
    const taskInput: TaskInput = {
      title: 'Routine maintenance task',
      brief: 'Standard workflow',
      inputs: [{ kind: 'text', value: 'safe' }],
      scopes: ['tasks:create'],
      schema: 'cortex.task.input@1',
    };

    const response = await request(server.app)
      .post('/v1/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ input: taskInput })
      .expect(200);

    expect(response.body.task).toBeDefined();
    expect(response.body.task.status).toBe('queued');
  });
});
