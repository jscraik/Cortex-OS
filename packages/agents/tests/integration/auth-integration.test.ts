import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { app } from '../../src/server/index';

describe('Authentication Integration Tests', () => {
  describe('Health Endpoint', () => {
    it('should allow access to health check without authentication', async () => {
      const response = await app.request('/health');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('healthy');
    });
  });

  describe('Token Endpoint', () => {
    it('should reject requests without API key', async () => {
      const response = await app.request('/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.message).toBe('API key required');
    });

    it('should reject invalid API key', async () => {
      const response = await app.request('/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'invalid-key' }),
      });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error.message).toBe('Invalid API key');
    });

    it('should issue JWT token for valid API key', async () => {
      const response = await app.request('/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'test-api-key-valid' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.accessToken).toBeDefined();
      expect(body.user.id).toBeDefined();
      expect(body.user.roles).toContain('user');
      expect(body.user.permissions).toContain('read:agents');
    });

    it('should issue admin token for admin API key', async () => {
      const response = await app.request('/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'admin-api-key-valid' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.accessToken).toBeDefined();
      expect(body.user.roles).toContain('admin');
      expect(body.user.permissions).toContain('manage:agents');
    });
  });

  describe('Protected Routes', () => {
    let userToken: string;
    let adminToken: string;

    beforeEach(async () => {
      // Get user token
      const userResponse = await app.request('/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'test-api-key-valid' }),
      });
      const userBody = await userResponse.json();
      userToken = userBody.accessToken;

      // Get admin token
      const adminResponse = await app.request('/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'admin-api-key-valid' }),
      });
      const adminBody = await adminResponse.json();
      adminToken = adminBody.accessToken;
    });

    it('should reject requests without authentication', async () => {
      const response = await app.request('/agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'test', input: 'test' }),
      });

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await app.request('/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify({ agentId: 'test', input: 'test' }),
      });

      expect(response.status).toBe(401);
    });

    it('should allow authenticated user with valid permissions', async () => {
      const response = await app.request('/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({ agentId: 'test', input: 'test' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.agentId).toBe('test');
    });

    it('should allow admin access to all endpoints', async () => {
      const response = await app.request('/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ agentId: 'test', input: 'test' }),
      });

      expect(response.status).toBe(200);
    });

    it('should include security headers in response', async () => {
      const response = await app.request('/health');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });
  });

  describe('API Key Authentication', () => {
    it('should accept valid API key in X-API-Key header', async () => {
      const response = await app.request('/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key-valid',
        },
        body: JSON.stringify({ agentId: 'test', input: 'test' }),
      });

      expect(response.status).toBe(200);
    });

    it('should accept valid API key in Authorization header', async () => {
      const response = await app.request('/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-valid',
        },
        body: JSON.stringify({ agentId: 'test', input: 'test' }),
      });

      expect(response.status).toBe(200);
    });
  });
});