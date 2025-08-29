
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { createASBRServer, type ASBRServer } from '../../src/api/server.js';
import { initializeAuth } from '../../src/api/auth.js';

import { initializeXDG } from '../../src/xdg/index.js';

// This file runs integration tests for complete workflows

describe('Complete Workflows', () => {
  let server: ASBRServer;
  let app: ReturnType<ASBRServer['start']>;
  let authToken = 'test-token';

  beforeAll(async () => {
    await initializeXDG();

    // Initialize auth
    const tokenInfo = await initializeAuth();
    authToken = tokenInfo.token;

    server = createASBRServer({ port: 7442 });

    await server.start();
    app = server['app'];
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Task Management', () => {
    it('should handle task creation and cancellation', async () => {
      // Step 1: Create a task
      const createResponse = await request
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          input: {
            title: 'Process files',
            brief: 'Analyze a set of files for anomalies',
            inputs: [
              { kind: 'file', value: 'file:///path/to/input1.txt' },
              { kind: 'file', value: 'file:///path/to/input2.txt' },
            ],
            scopes: ['filesystem:read', 'ai:analyze'],
            schema: 'cortex.task.input@1',
          },
        })
        .expect(200);

      const taskId = createResponse.body.task.id;
      expect(taskId).toBeDefined();


      // Step 2: Monitor task progress via events
      const eventsResponse = await request

        .get(`/v1/events?stream=sse&taskId=${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');


      expect(eventsResponse.status).toBe(200);


      // Step 3: Retrieve task status
      const statusResponse = await request
        .get(`/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.task.status).toBe('queued');

      // Step 4: Cancel task if needed
      const cancelResponse = await request
        .post(`/v1/tasks/${taskId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);

      // Step 5: Verify task is canceled
      const finalStatusResponse = await request
        .get(`/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalStatusResponse.body.task.status).toBe('canceled');
    });
  });

  describe('Artifact Retrieval', () => {
    it('should list artifacts with pagination', async () => {
      const response = await request
        .get('/v1/artifacts?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.artifacts).toBeInstanceOf(Array);
    });
  });

  describe('Real-time Event Streaming', () => {
    it('should provide real-time updates via SSE', async () => {
      // Create a task to generate events
      const taskResponse = await request
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          input: {
            title: 'SSE Test Task',
            brief: 'Task for testing server-sent events',
            inputs: [],
            scopes: ['events:stream'],
            schema: 'cortex.task.input@1',
          },
        })
        .expect(200);

      const taskId = taskResponse.body.task.id;

      // Test SSE endpoint (simplified for test environment)
      const sseResponse = await request
        .get(`/v1/events?stream=sse&taskId=${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      expect(sseResponse.status).toBe(200);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle and recover from errors gracefully', async () => {
      // Create a task with invalid inputs to test error handling
      const response = await request
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          input: {
            title: 'Error Recovery Test',
            brief: 'Testing error handling and recovery',
            inputs: [{ kind: 'invalid_type', value: 'this should cause an error' }],
            scopes: ['tasks:create'],
            schema: 'cortex.task.input@1',
          },
        });

      // Task should be created but may handle errors internally
      if (response.status === 200) {
        expect(response.body.task).toBeDefined();
      } else {
        expect(response.status).toBe(400);
      }
    });
  });
});
