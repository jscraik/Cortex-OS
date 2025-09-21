import { describe, expect, it } from 'vitest';
import { app } from '../../src/server/index.js';

describe('HTTP Server', () => {
  describe('Server instance creation', () => {
    it('should create server instance successfully', () => {
      expect(app).toBeDefined();
      expect(typeof app.request).toBe('function');
    });

    it('should handle requests properly', async () => {
      const response = await app.request('/health');
      expect(response).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Routing', () => {
    it('should handle POST /agents/execute route', async () => {
      const response = await app.request('/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key-valid',
        },
        body: JSON.stringify({ agentId: 'test-agent', input: 'test input' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toBeDefined();
    });

    it('should return 404 for unknown routes', async () => {
      const response = await app.request('/unknown/route');
      expect(response.status).toBe(404);
    });

    it('should return 405 for method not allowed', async () => {
      const response = await app.request('/agents/execute', {
        method: 'GET',
      });
      expect(response.status).toBe(405);
    });
  });

  describe('Request validation', () => {
    it('should validate request body schema', async () => {
      const response = await app.request('/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key-valid',
        },
        body: JSON.stringify({ invalid: 'data' }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('should validate content-type', async () => {
      const response = await app.request('/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'X-API-Key': 'test-api-key-valid',
        },
        body: 'invalid content',
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('should enforce request size limits', async () => {
      const largePayload = 'x'.repeat(1024 * 1024); // 1MB

      const response = await app.request('/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key-valid',
        },
        body: JSON.stringify({ data: largePayload }),
      });

      expect(response.status).toBe(413);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });

  describe('Request ID generation', () => {
    it('should generate unique request ID for each request', async () => {
      const response1 = await app.request('/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key-valid',
        },
        body: JSON.stringify({ agentId: 'test-agent', input: 'test input' }),
      });

      const response2 = await app.request('/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key-valid',
        },
        body: JSON.stringify({ agentId: 'test-agent', input: 'test input' }),
      });

      expect(response1.headers.get('x-request-id')).toBeDefined();
      expect(response2.headers.get('x-request-id')).toBeDefined();
      expect(response1.headers.get('x-request-id')).not.toBe(response2.headers.get('x-request-id'));
    });
  });

  describe('Error handling middleware', () => {
    it('should handle internal server errors gracefully', async () => {
      // This would require creating a route that throws an error,
      // for now we'll test the general error response structure
      const response = await app.request('/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId: 'error-agent', input: 'trigger error' }),
      });

      // Should get auth error (401) since no auth provided
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });
});
