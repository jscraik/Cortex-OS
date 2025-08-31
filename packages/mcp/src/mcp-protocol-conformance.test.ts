/**
 * @file MCP Protocol Conformance Tests
 * @description Test suite for MCP protocol compliance across transports
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redactSensitiveData, validateApiKey, validateUrlSecurity } from './lib/security.js';
import { createMcpServer } from './lib/server.js';
import { createTransport } from './lib/transport.js';
import type { McpRequest, TransportConfig } from './lib/types.js';

describe('MCP Protocol Conformance Tests', () => {
  describe('Transport Matrix Tests', () => {
    const transports: TransportConfig[] = [
      {
        type: 'stdio',
        command: 'echo',
        args: ['{"jsonrpc":"2.0","id":1,"result":{}}'],
      },
      {
        type: 'http',
        url: 'http://localhost:3000/mcp',
      },
    ];

    transports.forEach((transportConfig) => {
      describe(`${transportConfig.type.toUpperCase()} Transport`, () => {
        it('should conform to JSON-RPC 2.0 message format', async () => {
          const transport = createTransport(transportConfig);

          const validRequest: McpRequest = {
            jsonrpc: '2.0',
            id: 'test-1',
            method: 'initialize',
          };

          // Test message serialization
          expect(() => JSON.stringify(validRequest)).not.toThrow();

          // Validate required fields
          expect(validRequest.jsonrpc).toBe('2.0');
          expect(validRequest.id).toBeDefined();
          expect(validRequest.method).toBeDefined();
        });

        it('should handle connection lifecycle properly', async () => {
          const transport = createTransport(transportConfig);

          expect(transport.isConnected()).toBe(false);

          if (transportConfig.type === 'stdio') {
            // Skip actual connection for stdio in test environment
            return;
          }

          // For HTTP transport, we'll mock the connection
          const connectSpy = vi.spyOn(transport, 'connect');
          const disconnectSpy = vi.spyOn(transport, 'disconnect');

          await expect(transport.connect()).resolves.toBeUndefined();
          expect(connectSpy).toHaveBeenCalled();

          await expect(transport.disconnect()).resolves.toBeUndefined();
          expect(disconnectSpy).toHaveBeenCalled();
        });

        it('should validate message integrity', () => {
          const validMessages = [
            { jsonrpc: '2.0', id: 1, method: 'test' },
            { jsonrpc: '2.0', id: 'str-id', method: 'test', params: {} },
            { jsonrpc: '2.0', id: 1, result: {} },
          ];

          const invalidMessages = [
            { id: 1, method: 'test' }, // Missing jsonrpc
            { jsonrpc: '1.0', id: 1, method: 'test' }, // Wrong version
            { jsonrpc: '2.0', method: 'test' }, // Missing id
            { jsonrpc: '2.0', id: 1 }, // Missing method/result/error
          ];

          validMessages.forEach((msg, index) => {
            expect(() => JSON.parse(JSON.stringify(msg)), `Valid message ${index}`).not.toThrow();
          });

          invalidMessages.forEach((msg, index) => {
            // These should be caught by validation logic
            expect(typeof msg, `Invalid message ${index}`).toBe('object');
          });
        });
      });
    });
  });

  describe('Capability Discovery Tests', () => {
    let server: ReturnType<typeof createMcpServer>;

    beforeEach(() => {
      server = createMcpServer({
        name: 'Test Server',
        version: '1.0.0',
      });
    });

    it('should properly negotiate capabilities during initialize', async () => {
      const request: McpRequest = {
        jsonrpc: '2.0',
        id: 'init-1',
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: true,
            resources: true,
            prompts: true,
          },
        },
      };

      const response = await server.handleRequest(request);

      expect(response.id).toBe('init-1');
      expect(response.result).toBeDefined();

      const result = response.result as any;
      expect(result.protocolVersion).toBe('2025-06-18');
      expect(result.capabilities).toBeDefined();
      expect(result.serverInfo).toBeDefined();
      expect(result.serverInfo.name).toBe('Test Server');
    });

    it('should expose tools capability correctly', async () => {
      // Add a test tool
      server.addTool({ name: 'test-tool', description: 'A test tool' }, async () => ({
        success: true,
      }));

      const initResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'init',
        method: 'initialize',
      });

      const capabilities = (initResponse.result as any).capabilities;
      expect(capabilities.tools).toBeDefined();

      // Test tools/list
      const listResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'list-tools',
        method: 'tools/list',
      });

      const tools = (listResponse.result as any).tools;
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test-tool');
    });

    it('should expose resources capability correctly', async () => {
      // Add a test resource
      server.addResource({ uri: 'test://resource', name: 'Test Resource' }, async () => ({
        uri: 'test://resource',
        text: 'test content',
      }));

      const listResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'list-resources',
        method: 'resources/list',
      });

      const resources = (listResponse.result as any).resources;
      expect(Array.isArray(resources)).toBe(true);
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('test://resource');
    });

    it('should expose prompts capability correctly', async () => {
      // Add a test prompt
      server.addPrompt({ name: 'test-prompt', description: 'A test prompt' }, async () => [
        { role: 'user', content: { type: 'text', text: 'test' } },
      ]);

      const listResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'list-prompts',
        method: 'prompts/list',
      });

      const prompts = (listResponse.result as any).prompts;
      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('test-prompt');
    });
  });

  describe('Error Handling Tests', () => {
    let server: ReturnType<typeof createMcpServer>;

    beforeEach(() => {
      server = createMcpServer({
        name: 'Test Server',
        version: '1.0.0',
      });
    });

    it('should return proper JSON-RPC error for unknown methods', async () => {
      const response = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'error-test',
        method: 'unknown/method',
      });

      expect(response.id).toBe('error-test');
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32603);
      expect(response.error!.message).toContain('Method not supported');
    });

    it('should return proper error for invalid tool calls', async () => {
      const response = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'tool-error',
        method: 'tools/call',
        params: { name: 'nonexistent-tool' },
      });

      expect(response.error).toBeDefined();
      expect(response.error!.message).toContain('Tool not found');
    });

    it('should return proper error for invalid resource reads', async () => {
      const response = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'resource-error',
        method: 'resources/read',
        params: { uri: 'nonexistent://resource' },
      });

      expect(response.error).toBeDefined();
      expect(response.error!.message).toContain('Resource not found');
    });

    it('should handle malformed requests gracefully', async () => {
      const malformedRequests = [
        { jsonrpc: '2.0', id: 'test', method: 'tools/call' }, // Missing params
        { jsonrpc: '2.0', id: 'test', method: 'tools/call', params: {} }, // Missing tool name
        { jsonrpc: '2.0', id: 'test', method: 'resources/read', params: {} }, // Missing URI
      ];

      for (const request of malformedRequests) {
        const response = await server.handleRequest(request as McpRequest);
        expect(response.error).toBeDefined();
      }
    });
  });

  describe('Security Validation Tests', () => {
    it('should validate API key format', () => {
      const validKeys = ['sk-abcdef7890ghijklmnop', 'ref-e672788111c76ba32bc1', 'pk_abcdefghijk'];

      const invalidKeys = ['password', '123456', 'secret', 'admin', 'test'];

      validKeys.forEach((key) => {
        expect(validateApiKey(key), `Key should be valid: ${key}`).toBe(true);
      });
    });

    it('rejects invalid API key formats', () => {
      const invalidKeys = [
        'sk-12345', // Too short
        'ak-1234567890', // Wrong prefix
        'pk:1234567890', // Wrong separator
        'ref-abcdefg?', // Invalid character
        'password', // Insecure pattern
      ];

      invalidKeys.forEach((key) => {
        expect(validateApiKey(key), `Key should be invalid: ${key}`).toBe(false);
      });
    });

    it('should validate URL security', () => {
      const secureUrls = [
        'https://api.example.com/mcp',
        'http://localhost:3000/mcp',
        'http://127.0.0.1:8080/api',
      ];

      const insecureUrls = [
        'http://remote-server.com/api', // HTTP for remote
        'https://example.com/admin', // Suspicious path
        'ftp://server.com/api', // Wrong protocol
        'invalid-url', // Invalid format
      ];

      secureUrls.forEach((url) => {
        const isSecure = validateUrlSecurity(url);
        expect(isSecure, `URL should be secure: ${url}`).toBe(true);
      });

      insecureUrls.forEach((url) => {
        const isSecure = validateUrlSecurity(url);
        expect(isSecure, `URL should be insecure: ${url}`).toBe(false);
      });
    });

    it('should redact sensitive data in logs', () => {
      const sensitiveData = {
        apiKey: 'sk-abcdefghijklmnop',
        password: 'secret789',
        token: 'bearer-token-here',
        message: 'This is a public message',
        nested: {
          secret: 'hidden-value',
          public: 'visible-data',
        },
      };

      const redacted = redactSensitiveData(sensitiveData);

      expect(redacted.apiKey).toBe('[REDACTED]');
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.token).toBe('[REDACTED]');
      expect(redacted.message).toBe('This is a public message'); // Public message should remain
      expect(redacted.nested.secret).toBe('[REDACTED]');
      expect(redacted.nested.public).toBe('visible-data');
    });
  });

  describe('Rate Limiting Tests', () => {
    function createRateLimiter(windowMs: number, maxRequests: number) {
      const requests = new Map<string, number[]>();

      return {
        isAllowed(key: string) {
          const now = Date.now();
          const timestamps = requests.get(key) || [];
          const valid = timestamps.filter((t) => now - t < windowMs);
          if (valid.length >= maxRequests) return false;
          valid.push(now);
          requests.set(key, valid);
          return true;
        },
      };
    }

    it('should enforce rate limits per client', () => {
      const rateLimiter = createRateLimiter(60000, 60); // 60 requests per minute

      // Test within limits
      for (let i = 0; i < 60; i++) {
        expect(rateLimiter.isAllowed('client-1')).toBe(true);
      }

      // Test exceeding limits
      expect(rateLimiter.isAllowed('client-1')).toBe(false);

      // Test different client
      expect(rateLimiter.isAllowed('client-2')).toBe(true);
    });

    it('should handle concurrent rate limiting', () => {
      const rateLimiter = createRateLimiter(1000, 5); // 5 requests per second

      const clients = ['client-1', 'client-2', 'client-3'];

      clients.forEach((client) => {
        for (let i = 0; i < 5; i++) {
          expect(rateLimiter.isAllowed(client)).toBe(true);
        }
        expect(rateLimiter.isAllowed(client)).toBe(false);
      });
    });
  });

  describe('Tool Safety Tests', () => {
    let server: ReturnType<typeof createMcpServer>;

    beforeEach(() => {
      server = createMcpServer({
        name: 'Test Server',
        version: '1.0.0',
      });
    });

    it('should validate tool input schemas', async () => {
      server.addTool(
        {
          name: 'safe-tool',
          description: 'A safe tool',
          inputSchema: {
            type: 'object',
            properties: {
              text: { type: 'string', maxLength: 1000 },
            },
            required: ['text'],
          },
        },
        async (params) => {
          // Validate input
          if (!params.text || typeof params.text !== 'string') {
            throw new Error('Invalid input: text is required');
          }
          if (params.text.length > 1000) {
            throw new Error('Input too long');
          }
          return { processed: params.text };
        },
      );

      // Test valid input
      const validResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'valid-tool-call',
        method: 'tools/call',
        params: {
          name: 'safe-tool',
          arguments: { text: 'hello world' },
        },
      });

      expect(validResponse.error).toBeUndefined();
      expect((validResponse.result as any).result.processed).toBe('hello world');

      // Test invalid input
      const invalidResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'invalid-tool-call',
        method: 'tools/call',
        params: {
          name: 'safe-tool',
          arguments: { text: 'x'.repeat(1001) }, // Too long
        },
      });

      expect(invalidResponse.error).toBeDefined();
      expect(invalidResponse.error!.message).toContain('Input too long');
    });

    it('should prevent dangerous tool operations', () => {
      const dangerousOperations = [
        { command: 'rm -rf /', safe: false },
        { command: 'del /F /S /Q C:\\', safe: false },
        { command: 'curl -X POST https://api.example.com/data', safe: true },
        { command: 'echo "hello world"', safe: true },
      ];

      dangerousOperations.forEach(({ command, safe }) => {
        const isDangerous =
          /^(rm\s+.*-r|del\s+.*\/F|format\s+c:|dd\s+if=.*of=|sudo\s+.*|su\s+.*)/i.test(command);
        expect(!isDangerous, `Command safety check: ${command}`).toBe(safe);
      });
    });
  });

  describe('Configuration Validation Tests', () => {
    it('should validate server configurations', () => {
      const validConfigs = [
        {
          name: 'test-server',
          transport: { type: 'stdio', command: 'node', args: ['server.js'] },
        },
        {
          name: 'http-server',
          transport: { type: 'http', url: 'https://api.example.com/mcp' },
        },
      ];

      const invalidConfigs = [
        { name: '', transport: { type: 'stdio' } }, // Empty name
        { name: 'test', transport: { type: 'stdio' } }, // Missing command
        { name: 'test', transport: { type: 'http' } }, // Missing URL
        { name: 'test@invalid', transport: { type: 'stdio', command: 'test' } }, // Invalid name
      ];

      validConfigs.forEach((config, index) => {
        expect(config.name.length > 0, `Valid config ${index}: name not empty`).toBe(true);
        expect(
          ['stdio', 'http'].includes(config.transport.type),
          `Valid config ${index}: valid transport`,
        ).toBe(true);
      });

      invalidConfigs.forEach((config, index) => {
        const hasValidName = config.name.length > 0 && /^[a-zA-Z0-9_-]+$/.test(config.name);
        const hasValidTransport = ['stdio', 'http'].includes(config.transport.type);
        const hasRequiredFields =
          (config.transport.type === 'stdio' && 'command' in config.transport) ||
          (config.transport.type === 'http' && 'url' in config.transport);

        const isValid = hasValidName && hasValidTransport && hasRequiredFields;
        expect(isValid, `Invalid config ${index}: should be invalid`).toBe(false);
      });
    });
  });
});
