import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { createApp } from '../../../server';

describe('HTTP Server', () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeEach(async () => {
    const app = createApp();
    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterEach(() => {
    return new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  describe('Server instance creation', () => {
    it('should create server instance successfully', () => {
      expect(server).toBeDefined();
      expect(server.listening).toBe(true);
    });

    it('should bind to a valid port', () => {
      const address = server.address() as AddressInfo;
      expect(address.port).toBeGreaterThan(0);
      expect(address.port).toBeLessThan(65536);
    });
  });

  describe('Port binding validation', () => {
    it('should handle port already in use', async () => {
      const app1 = createApp();
      const server1 = createServer(app1);

      await new Promise<void>((resolve) => {
        server1.listen(0, () => {
          resolve();
        });
      });

      const address1 = server1.address() as AddressInfo;
      const port = address1.port;

      const app2 = createApp();
      const server2 = createServer(app2);

      await expect(new Promise<void>((resolve, reject) => {
        server2.listen(port, () => {
          reject(new Error('Should not bind to same port'));
        }).on('error', () => {
          resolve();
        });
      })).resolves.not.toThrow();

      server1.close();
    });
  });

  describe('Graceful shutdown', () => {
    it('should close server gracefully', async () => {
      await new Promise<void>((resolve) => {
        server.close(() => {
          expect(server.listening).toBe(false);
          resolve();
        });
      });
    });
  });

  describe('Routing', () => {
    it('should handle POST /agents/execute route', async () => {
      const response = await request(baseUrl)
        .post('/agents/execute')
        .send({ agentId: 'test-agent', input: 'test input' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 404 for unknown routes', async () => {
      await request(baseUrl)
        .get('/unknown/route')
        .expect(404);
    });

    it('should return 405 for method not allowed', async () => {
      await request(baseUrl)
        .get('/agents/execute')
        .expect(405);
    });
  });

  describe('Request validation', () => {
    it('should validate request body schema', async () => {
      const response = await request(baseUrl)
        .post('/agents/execute')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate content-type', async () => {
      const response = await request(baseUrl)
        .post('/agents/execute')
        .set('Content-Type', 'text/plain')
        .send('invalid content')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should enforce request size limits', async () => {
      const largePayload = 'x'.repeat(1024 * 1024); // 1MB

      const response = await request(baseUrl)
        .post('/agents/execute')
        .send({ data: largePayload })
        .expect(413);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Request ID generation', () => {
    it('should generate unique request ID for each request', async () => {
      const response1 = await request(baseUrl)
        .post('/agents/execute')
        .send({ agentId: 'test-agent', input: 'test input' });

      const response2 = await request(baseUrl)
        .post('/agents/execute')
        .send({ agentId: 'test-agent', input: 'test input' });

      expect(response1.headers['x-request-id']).toBeDefined();
      expect(response2.headers['x-request-id']).toBeDefined();
      expect(response1.headers['x-request-id']).not.toBe(response2.headers['x-request-id']);
    });
  });

  describe('Error handling middleware', () => {
    it('should handle internal server errors gracefully', async () => {
      const response = await request(baseUrl)
        .post('/agents/execute')
        .send({ agentId: 'error-agent', input: 'trigger error' })
        .expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});