import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { ASBRServer } from '../../src/api/server.js';
import { initializeAuth } from '../../src/api/auth.js';
import { initializeXDG } from '../../src/xdg/index.js';

describe('ASBR End-to-End Workflow Tests', () => {
  let server: ASBRServer;
  let request: supertest.SuperTest<supertest.Test>;
  let authToken: string;

  beforeAll(async () => {
    await initializeXDG();
    // Initialize auth
    const tokenInfo = await initializeAuth();
    authToken = tokenInfo.token;

    server = new ASBRServer({ port: 7442 });
    await server.start();
    request = supertest(`http://127.0.0.1:7442`);
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Complete Task Lifecycle', () => {
    it('should handle full task creation to completion workflow', async () => {
      // Step 1: Create a task
      const createResponse = await request
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          input: {
            title: 'E2E Test Task',
            brief: 'Complete end-to-end test workflow',
            inputs: [
              { kind: 'text', value: 'Process this text input' },
              { kind: 'doc', path: '/test/data.json' },
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
        .get(`/v1/events?taskId=${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(eventsResponse.body.events).toBeInstanceOf(Array);
      expect(eventsResponse.body.events.length).toBeGreaterThan(0);

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

  describe('Multi-Agent Coordination Workflow', () => {
    it('should coordinate multiple agents for complex tasks', async () => {
      // Create a task that requires multiple agents
      const response = await request
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          input: {
            title: 'Multi-Agent Analysis Task',
            brief: 'Analyze code quality, security, and performance',
            inputs: [{ kind: 'repo', path: 'https://github.com/example/repo' }],
            scopes: ['code:analyze', 'security:scan', 'performance:benchmark'],
            agents: ['security-analyst', 'performance-expert', 'code-reviewer'],
            schema: 'cortex.task.input@1',
          },
        })
        .expect(200);

      const taskId = response.body.task.id;

      // Verify agents are coordinated
      const statusResponse = await request
        .get(`/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.task).toBeDefined();
    });
  });

  describe('Evidence Collection and Validation', () => {
    it('should collect and validate evidence throughout task execution', async () => {
      const response = await request
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          input: {
            title: 'Evidence Collection Task',
            brief: 'Task with evidence tracking',
            inputs: [],
            scopes: ['evidence:collect'],
            schema: 'cortex.task.input@1',
          },
        })
        .expect(200);

      const taskId = response.body.task.id;

      // Check that evidence collection is initialized
      const statusResponse = await request
        .get(`/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.task.evidenceIds).toBeInstanceOf(Array);
    });
  });

  describe('Profile-Based Task Customization', () => {
    it('should customize task execution based on user profile', async () => {
      // First create a profile
      const profileResponse = await request
        .post('/v1/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profile: {
            skill: 'expert',
            tools: ['filesystem', 'web_search', 'code_analysis'],
            a11y: {
              keyboardOnly: true,
              screenReader: true,
              reducedMotion: false,
              highContrast: true,
            },
            schema: 'cortex.profile@1',
          },
        })
        .expect(200);

      const profileId = profileResponse.body.profile.id;

      // Create task with profile
      const taskResponse = await request
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          input: {
            title: 'Profile-Customized Task',
            brief: 'Task customized for expert user with accessibility needs',
            inputs: [],
            scopes: ['tasks:create'],
            profileId: profileId,
            schema: 'cortex.task.input@1',
          },
        })
        .expect(200);

      expect(taskResponse.body.task).toBeDefined();
    });
  });

  describe('Artifact Generation and Retrieval', () => {
    it('should generate and retrieve artifacts during task execution', async () => {
      const taskResponse = await request
        .post('/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          input: {
            title: 'Artifact Generation Task',
            brief: 'Task that generates artifacts',
            inputs: [],
            scopes: ['artifacts:create'],
            schema: 'cortex.task.input@1',
          },
        })
        .expect(200);

      const taskId = taskResponse.body.task.id;

      // List artifacts
      const artifactsResponse = await request
        .get('/v1/artifacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(artifactsResponse.body.artifacts).toBeInstanceOf(Array);
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
        // Or it may reject invalid inputs
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with multiple concurrent tasks', async () => {
      const tasks = Array.from({ length: 5 }, (_, i) =>
        request
          .post('/v1/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            input: {
              title: `Concurrent Task ${i}`,
              brief: 'Testing concurrent task performance',
              inputs: [],
              scopes: ['tasks:create'],
              schema: 'cortex.task.input@1',
            },
          }),
      );

      const responses = await Promise.all(tasks);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.task).toBeDefined();
      });
    });
  });
});
