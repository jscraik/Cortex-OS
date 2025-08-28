import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';
import supertest from 'supertest';
import { createASBRServer, type ASBRServer } from '../../src/api/server.js';
import { initializeAuth } from '../../src/api/auth.js';
import { initializeXDG } from '../../src/xdg/index.js';

describe('ASBR API Performance Tests', () => {
  let server: ASBRServer;
  let request: supertest.SuperTest<supertest.Test>;
  let authToken: string;

  beforeAll(async () => {
    await initializeXDG();
    const tokenInfo = await initializeAuth();
    authToken = tokenInfo.token;

    server = createASBRServer({ port: 7440 });
    await server.start();
    request = supertest(`http://127.0.0.1:7440`);
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should respond to health check within 50ms', async () => {
    const start = performance.now();

    const response = await request.get('/health').expect(200);

    const duration = performance.now() - start;

    expect(response.body).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
    });
    expect(duration).toBeLessThan(50);
  });

  it('should create tasks within 100ms', async () => {
    const start = performance.now();

    const response = await request
      .post('/v1/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        input: {
          title: 'Performance Test Task',
          brief: 'Testing task creation performance',
          inputs: [],
          scopes: ['tasks:create'],
          schema: 'cortex.task.input@1',
        },
      })
      .expect(200);

    const duration = performance.now() - start;

    expect(response.body.task).toBeDefined();
    expect(duration).toBeLessThan(100);
  });

  it('should retrieve tasks within 50ms', async () => {
    // First create a task
    const createResponse = await request
      .post('/v1/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        input: {
          title: 'Retrieve Performance Test',
          brief: 'Testing task retrieval performance',
          inputs: [],
          scopes: ['tasks:create'],
          schema: 'cortex.task.input@1',
        },
      });

    const taskId = createResponse.body.task.id;

    const start = performance.now();

    const response = await request
      .get(`/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const duration = performance.now() - start;

    expect(response.body.task.id).toBe(taskId);
    expect(duration).toBeLessThan(50);
  });

  it('should handle concurrent requests efficiently', async () => {
    const start = performance.now();

    // Create 10 concurrent requests
    const promises = Array.from({ length: 10 }, (_, i) =>
      request
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          input: {
            title: `Concurrent Test Task ${i}`,
            brief: 'Testing concurrent performance',
            inputs: [],
            scopes: ['tasks:create'],
            schema: 'cortex.task.input@1',
          },
        }),
    );

    const responses = await Promise.all(promises);
    const duration = performance.now() - start;

    // All requests should succeed
    responses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.body.task).toBeDefined();
    });

    // Total time should be reasonable for 10 concurrent requests
    expect(duration).toBeLessThan(500);
  });


  it('should serve SSE events efficiently', async () => {
    const start = performance.now();

    const response = await request
      .get('/v1/events?stream=sse')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Accept', 'text/event-stream');

    const duration = performance.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(200);
  });

  it('should handle SSE connections efficiently', async () => {
    const start = performance.now();

    const response = await request
      .get('/v1/events?stream=sse')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Accept', 'text/event-stream');

    const duration = performance.now() - start;

    // SSE should establish quickly (server auto-closes in test env)
    expect(duration).toBeLessThan(200);
    expect(response.status).toBe(200);
  });
});
