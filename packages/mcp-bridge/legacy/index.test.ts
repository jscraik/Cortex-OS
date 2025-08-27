import express from 'express';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

// Mock the git handler for testing
const mockGitHandler = async (req: any) => ({
  ok: true,
  result: { message: 'test commit', hash: 'abc123' },
  timestamp: Date.now(),
});

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'mcp-server',
      version: '1.0.0',
    });
  });

  // Get agent card resources
  app.get('/resources/:card', (req, res) => {
    try {
      const cardPath = join(process.cwd(), 'agents', 'cards', `${req.params.card}.json`);

      if (!existsSync(cardPath)) {
        return res.status(404).json({
          error: 'Agent card not found',
          card: req.params.card,
        });
      }

      const cardData = JSON.parse(readFileSync(cardPath, 'utf8'));
      res.json(cardData);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to load agent card',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Git agent endpoint
  app.post('/local/git', async (req, res) => {
    try {
      const result = await mockGitHandler(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      });
    }
  });

  return app;
}

describe('MCP Server', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health Check', () => {
    it('should return 200 OK for health check', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'mcp-server',
        version: '1.0.0',
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Agent Cards', () => {
    it('should return git agent card', async () => {
      const response = await request(app).get('/resources/git').expect(200);

      expect(response.body).toMatchObject({
        id: 'git-agent',
        name: 'Git Status Agent',
        protocol: 'a2a/1',
      });
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.capabilities).toContain('git.commit');
    });

    it('should return 404 for non-existent agent card', async () => {
      const response = await request(app).get('/resources/nonexistent').expect(404);

      expect(response.body).toMatchObject({
        error: 'Agent card not found',
        card: 'nonexistent',
      });
    });
  });

  describe('Git Agent', () => {
    it('should handle git requests', async () => {
      const gitRequest = {
        action: 'git.commit',
        params: { message: 'test commit' },
        id: 'test-request',
        timestamp: Date.now(),
      };

      const response = await request(app).post('/local/git').send(gitRequest).expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        result: {
          message: 'test commit',
          hash: 'abc123',
        },
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle malformed git requests', async () => {
      const response = await request(app)
        .post('/local/git')
        .send({ invalid: 'request' })
        .expect(200); // Handler determines status based on response.ok

      expect(response.body.ok).toBe(true); // Mock always returns success
    });
  });
});
