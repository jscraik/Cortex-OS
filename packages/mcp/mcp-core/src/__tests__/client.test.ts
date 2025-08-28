import { describe, it, expect, vi } from 'vitest';
import { redactSensitiveData, createEnhancedClient } from '../client';
import type { ServerInfo } from '../contracts';

// Mock the SDK
const mockConnect = vi.fn();
const mockCallTool = vi.fn();
const mockSendRequest = vi.fn();
const mockClose = vi.fn();

const MockClient = vi.fn(() => ({
  connect: mockConnect,
  callTool: mockCallTool,
  sendRequest: mockSendRequest,
  close: mockClose,
}));

const MockStdioClientTransport = vi.fn();
const MockSSEClientTransport = vi.fn();
const MockStreamableHTTPClientTransport = vi.fn();

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: MockClient,
}));
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: MockStdioClientTransport,
}));
vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: MockSSEClientTransport,
}));
vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: MockStreamableHTTPClientTransport,
}));

describe('mcp-core client', () => {
  describe('redactSensitiveData', () => {
    it('should redact api keys from a string', () => {
      const dirty = '{"apiKey": "12345"}';
      const clean = '{"apiKey": "[REDACTED]"}';
      expect(redactSensitiveData(dirty)).toBe(clean);
    });

    it('should redact tokens from an object', () => {
      const dirty = { headers: { authorization: 'Bearer abcde' } };
      const clean = { headers: { authorization: 'bearer [REDACTED]' } };
      expect(redactSensitiveData(dirty)).toEqual(clean);
    });

    it('should redact passwords from a nested object', () => {
      const dirty = { config: { user: { password: 'supersecret' } } };
      const clean = { config: { user: { password: '[REDACTED]' } } };
      expect(redactSensitiveData(dirty)).toEqual(clean);
    });

    it('should handle arrays of objects', () => {
      const dirty = [{ secret: '123' }, { credentials: { token: 'abc' } }];
      const clean = [{ secret: '[REDACTED]' }, { credentials: { token: '[REDACTED]' } }];
      expect(redactSensitiveData(dirty)).toEqual(clean);
    });

    it('should not change a clean string', () => {
      const clean = 'this is a clean string';
      expect(redactSensitiveData(clean)).toBe(clean);
    });

    it('should handle null and undefined values', () => {
      expect(redactSensitiveData(null)).toBeNull();
      expect(redactSensitiveData(undefined)).toBeUndefined();
    });
  });

  describe('createEnhancedClient', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create a stdio client', async () => {
      const serverInfo: ServerInfo = {
        name: 'test-stdio',
        transport: 'stdio',
        command: 'echo',
      };
      await createEnhancedClient(serverInfo);
      expect(MockStdioClientTransport).toHaveBeenCalledWith({
        command: 'echo',
        args: undefined,
        env: undefined,
      });
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should create an sse client', async () => {
      const serverInfo: ServerInfo = {
        name: 'test-sse',
        transport: 'sse',
        endpoint: 'http://localhost:8080',
      };
      await createEnhancedClient(serverInfo);
      expect(MockSSEClientTransport).toHaveBeenCalledWith(new URL('http://localhost:8080'));
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should rate limit tool calls', async () => {
      const serverInfo: ServerInfo = {
        name: 'test-limiter',
        transport: 'stdio',
        command: 'echo',
      };
      const client = await createEnhancedClient(serverInfo);

      // This is a bit of a hack to test the rate limiter.
      // We'll set the points to 1 to easily test the limit.
      // @ts-ignore - private property
      client.rateLimiter = {
        consume: vi
          .fn()
          .mockResolvedValue(undefined)
          .mockRejectedValueOnce(new Error('Rate limit exceeded')),
      };

      await expect(client.callTool('test', {})).rejects.toThrow(
        'Rate limit exceeded for tool test',
      );
    });

    it('should redact data on sendRequest', async () => {
      const serverInfo: ServerInfo = {
        name: 'test-redaction',
        transport: 'stdio',
        command: 'echo',
      };
      const client = await createEnhancedClient(serverInfo);
      const message = { apiKey: '123' };
      await client.sendRequest(message);
      expect(mockSendRequest).toHaveBeenCalledWith({ apiKey: '[REDACTED]' });
    });
  });
});
