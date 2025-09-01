import { describe, it, expect, afterEach, vi } from 'vitest';
import request from 'supertest';
import { ErrorCode } from '@modelcontextprotocol/sdk';
import { app } from '../src/server.js';

describe('MCP Protocol Compliance Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('JSON-RPC 2.0 Protocol Compliance', () => {
    it('should implement proper JSON-RPC 2.0 request/response format', async () => {
      const response = await request(app)
        .post('/sse')
        .set('Authorization', 'Bearer test-token')
        .send({
          jsonrpc: '2.0',
          id: 'test-001',
          method: 'tools/list',
          params: {},
        })
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jsonrpc', '2.0');
      expect(response.body).toHaveProperty('id', 'test-001');
      expect(response.body).toHaveProperty('result');
    });
  });

  describe('Tool Registration and Discovery', () => {
    it('should register all required tools', async () => {
      const response = await request(app)
        .post('/sse')
        .set('Authorization', 'Bearer test-token')
        .send({
          jsonrpc: '2.0',
          id: 'tools-list',
          method: 'tools/list',
        })
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.result.tools).toHaveLength(3);

      const toolNames = response.body.result.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('ping');
      expect(toolNames).toContain('http_get');
      expect(toolNames).toContain('repo_file');
    });

    it('should handle unknown tool calls with MethodNotFound error', async () => {
      const response = await request(app)
        .post('/sse')
        .set('Authorization', 'Bearer test-token')
        .send({
          jsonrpc: '2.0',
          id: 'unknown-tool',
          method: 'tools/call',
          params: { name: 'nonexistent_tool', arguments: {} },
        })
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.error.code).toBe(ErrorCode.MethodNotFound);
      expect(response.body.error.message).toContain('Unknown tool: nonexistent_tool');
    });
  });

  describe('Security and Authentication', () => {
    it('should enforce hostname allowlist for http_get tool', async () => {
      const disallowedUrls = [
        'https://malicious.com/api',
        'http://localhost:8080/admin',
        'https://internal.company.com/secrets',
      ];

      for (const url of disallowedUrls) {
        const response = await request(app)
          .post('/sse')
          .set('Authorization', 'Bearer test-token')
          .send({
            jsonrpc: '2.0',
            id: 'security-test',
            method: 'tools/call',
            params: { name: 'http_get', arguments: { url } },
          })
          .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body.error.code).toBe(ErrorCode.InvalidParams);
        expect(response.body.error.message).toContain('not in allowlist');
      }
    });

    it('should prevent path traversal in repo_file tool', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\Windows\\System32\\config\\SAM',
        '/etc/shadow',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        '../../../../root/.ssh/id_rsa',
        './../../secrets/api_keys.txt',
      ];

      for (const maliciousPath of maliciousPaths) {
        const response = await request(app)
          .post('/sse')
          .set('Authorization', 'Bearer test-token')
          .send({
            jsonrpc: '2.0',
            id: 'path-traversal-test',
            method: 'tools/call',
            params: { name: 'repo_file', arguments: { relpath: maliciousPath } },
          })
          .set('Accept', 'application/json');

        expect(response.status).toBe(200);
        expect(response.body.error.code).toBe(ErrorCode.InvalidParams);
        expect(response.body.error.message).toContain('Path escapes repository root');
      }
    });
  });
});
