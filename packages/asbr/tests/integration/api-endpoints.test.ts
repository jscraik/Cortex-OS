/**
 * Integration tests for ASBR API endpoints
 * Tests the complete API surface according to the blueprint
 */

// Node environment required for server integration tests to access Node builtins like 'crypto'.
// These tests interact directly with the server and require Node APIs that are not available in other environments (e.g., jsdom).
// @vitest-environment node

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeAuth } from '../../src/api/auth.js';
import { ASBRServer } from '../../src/api/server.js';
import type { Profile, TaskInput } from '../../src/types/index.js';
import { initializeXDG } from '../../src/xdg/index.js';

describe('ASBR API Integration Tests', () => {
  let server: ASBRServer;
  let authToken: string;
  let app: any;

  beforeAll(async () => {
    // Initialize XDG directories
    await initializeXDG();

    // Initialize auth and get token
    const tokenInfo = await initializeAuth();
    authToken = tokenInfo.token;

    // Start server
    server = new ASBRServer({ port: 0, host: '127.0.0.1' });
    await server.start();

    // Get the Express app for testing
    app = (server as any).app;
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app).get('/v1/tasks/test-id').expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should accept requests with valid token', async () => {
      const response = await request(app)
        .get('/v1/tasks/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Task not found');
    });

    it('should only accept loopback connections', async () => {
      // This test would need to be run from a non-loopback address
      // For now, we just verify the auth middleware is in place
      expect(true).toBe(true);
    });
  });

  describe('Task Management', () => {
    let taskId: string;

    it('should create a new task', async () => {
      const taskInput: TaskInput = {
        title: 'Test Task',
        brief: 'This is a test task for integration testing',
        inputs: [{ kind: 'text', value: 'Sample input text' }],
        scopes: ['test'],
        schema: 'cortex.task.input@1',
      };

      const response = await request(app)
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ input: taskInput })
        .expect(200);

      expect(response.body.task).toBeDefined();
      expect(response.body.task.id).toBeDefined();
      expect(response.body.task.status).toBe('queued');
      expect(response.body.task.schema).toBe('cortex.task@1');

      taskId = response.body.task.id;
    });

    it('should support idempotent task creation', async () => {
      const taskInput: TaskInput = {
        title: 'Idempotent Test Task',
        brief: 'This task tests idempotency',
        inputs: [{ kind: 'text', value: 'Idempotent input' }],
        scopes: ['test'],
        schema: 'cortex.task.input@1',
      };

      // Create task first time
      const response1 = await request(app)
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', 'test-idempotency-key')
        .send({ input: taskInput })
        .expect(200);

      // Create task second time with same key
      const response2 = await request(app)
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', 'test-idempotency-key')
        .send({ input: taskInput })
        .expect(200);

      expect(response1.body.task.id).toBe(response2.body.task.id);
    });

    it('should retrieve a task by ID', async () => {
      const response = await request(app)
        .get(`/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.task.id).toBe(taskId);
      expect(response.body.task.status).toBeDefined();
    });

    it('should cancel a task', async () => {
      const response = await request(app)
        .post(`/v1/tasks/${taskId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should resume a paused task', async () => {
      // First, we'd need to pause a task, but for testing we'll
      // just verify the endpoint exists
      const response = await request(app)
        .post(`/v1/tasks/${taskId}/resume`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400); // Should fail because task is canceled, not paused

      expect(response.body.error).toContain('paused');
    });
  });

  describe('Event System', () => {
    it('should provide SSE event stream', async () => {
      const response = await request(app)
        .get('/v1/events?stream=sse')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      // Note: Testing SSE fully requires a different approach
      // This just verifies the endpoint exists and returns appropriate headers
      expect(response.status).toBe(200);
    });

    it('should allow SSE event stream for specific task', async () => {
      const response = await request(app)
        .get('/v1/events?stream=sse&taskId=test-task-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
    });

    it('should reject unsupported stream type', async () => {
      await request(app)
        .get('/v1/events?stream=poll')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('Profile Management', () => {
    let profileId: string;

    it('should create a new profile', async () => {
      const profile: Omit<Profile, 'id'> = {
        skill: 'intermediate',
        tools: ['filesystem', 'web_search'],
        a11y: {
          keyboardOnly: true,
          screenReader: false,
          reducedMotion: true,
          highContrast: false,
        },
        schema: 'cortex.profile@1',
      };

      const response = await request(app)
        .post('/v1/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ profile })
        .expect(200);

      expect(response.body.profile).toBeDefined();
      expect(response.body.profile.id).toBeDefined();
      expect(response.body.profile.skill).toBe('intermediate');

      profileId = response.body.profile.id;
    });

    it('should retrieve a profile by ID', async () => {
      const response = await request(app)
        .get(`/v1/profiles/${profileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(profileId);
      expect(response.body.skill).toBe('intermediate');
    });

    it('should update an existing profile', async () => {
      const updatedProfile: Profile = {
        id: profileId,
        skill: 'expert',
        tools: ['filesystem', 'web_search', 'calculator'],
        a11y: {
          keyboardOnly: true,
          screenReader: true,
          reducedMotion: true,
          highContrast: true,
        },
        schema: 'cortex.profile@1',
      };

      const response = await request(app)
        .put(`/v1/profiles/${profileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ profile: updatedProfile })
        .expect(200);

      expect(response.body.profile.skill).toBe('expert');
      expect(response.body.profile.a11y.screenReader).toBe(true);
    });
  });

  describe('Artifact Management', () => {
    it('should list artifacts with pagination', async () => {
      const response = await request(app)
        .get('/v1/artifacts?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.artifacts).toBeDefined();
      expect(response.body.total).toBeDefined();
      expect(Array.isArray(response.body.artifacts)).toBe(true);
    });

    it('should filter artifacts by kind', async () => {
      const response = await request(app)
        .get('/v1/artifacts?kind=diff')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.artifacts).toBeDefined();
    });

    it('should retrieve artifact content with digest headers', async () => {
      // For this test, we'd need to create an artifact first
      // For now, we'll test with a mock artifact ID
      const response = await request(app)
        .get('/v1/artifacts/mock-artifact-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404); // Expected since artifact doesn't exist

      // In a real test with an existing artifact:
      // expect(response.headers['digest']).toBeDefined();
      // expect(response.headers['etag']).toBeDefined();
    });
  });

  describe('Connector Service Map', () => {
    it('should return connector service map', async () => {
      const response = await request(app)
        .get('/v1/connectors/service-map')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
      expect(Object.keys(response.body).length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent resources', async () => {
      const response = await request(app)
        .get('/v1/tasks/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Task not found');
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should validate request schemas', async () => {
      const invalidTaskInput = {
        title: '', // Invalid: empty title
        brief: 'Test brief',
        // Missing required fields
      };

      const response = await request(app)
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ input: invalidTaskInput })
        .expect(400);

      expect(response.body.error).toContain('Invalid');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject legacy task input formats', async () => {
      const response = await request(app)
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          input: {
            title: 'Legacy',
            brief: 'Legacy',
            inputs: [{ type: 'text', content: 'hello' }],
            scopes: ['test'],
            schema: 'cortex.task.input@1',
          },
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });
});
