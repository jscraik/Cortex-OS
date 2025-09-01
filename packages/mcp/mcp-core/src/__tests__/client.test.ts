import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redactSensitiveData } from '../../../src/lib/security.js';
import { createEnhancedClient } from '../client';
import type { ServerInfo } from '../contracts';

// Mock the SDK
const mockConnect = vi.fn();
const mockCallTool = vi.fn();
const mockSendRequest = vi.fn();
const mockClose = vi.fn();

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => {
  return {
    Client: vi.fn(() => ({
      connect: mockConnect,
      callTool: mockCallTool,
      sendRequest: mockSendRequest,
      close: mockClose,
    })),
  };
});

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => {
  return { StdioClientTransport: vi.fn(() => ({ close: vi.fn() })) };
});

vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => {
  return { SSEClientTransport: vi.fn(() => ({ close: vi.fn() })) };
});

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => {
  return { StreamableHTTPClientTransport: vi.fn(() => ({ close: vi.fn() })) };
});

// Import the mocked modules
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Get the mocked constructors
const MockClient = vi.mocked(Client);
const MockStdioClientTransport = vi.mocked(StdioClientTransport);
const MockSSEClientTransport = vi.mocked(SSEClientTransport);
const MockStreamableHTTPClientTransport = vi.mocked(StreamableHTTPClientTransport);

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
      // eslint-disable-next-line sonarjs/no-hardcoded-passwords
      const dirty = { config: { user: { password: 'value' } } };
      // eslint-disable-next-line sonarjs/no-hardcoded-passwords
      const clean = { config: { user: { password: '[REDACTED]' } } };
      expect(redactSensitiveData(dirty)).toEqual(clean);
    });

    it('should handle arrays of objects', () => {
      const dirty = [{ secret: 'value' }, { credentials: { token: 'token-value' } }];
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

    it('should create a streamableHttp client', async () => {
      const serverInfo: ServerInfo = {
        name: 'test-stream',
        transport: 'streamableHttp',
        endpoint: 'http://localhost:8080',
      };
      await createEnhancedClient(serverInfo);
      expect(MockStreamableHTTPClientTransport).toHaveBeenCalledWith(new URL('http://localhost:8080'));
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should expose rate limit info', async () => {
      const serverInfo: ServerInfo = {
        name: 'test-info',
        transport: 'stdio',
        command: 'echo',
      };
      const client = await createEnhancedClient(serverInfo);
      const info = await client.getRateLimitInfo('tool');
      expect(info.remainingPoints).toBe(60);
    });

    it('should close transport and client', async () => {
      const serverInfo: ServerInfo = {
        name: 'test-close',
        transport: 'stdio',
        command: 'echo',
      };
      const client = await createEnhancedClient(serverInfo);
      await client.close();
      expect(mockClose).toHaveBeenCalled();
      const transport = MockStdioClientTransport.mock.results[0].value;
      expect(transport.close).toHaveBeenCalled();
    });

    it('should throw on unsupported transport', async () => {
      await expect(
        createEnhancedClient({ name: 'bad', transport: 'ws' } as unknown as ServerInfo),
      ).rejects.toThrow('Unsupported transport: ws');
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
      // @ts-expect-error - private property
      client.rateLimiter = {
        consume: vi
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Rate limit exceeded')),
      };

      await client.callTool('test', {});
      await expect(client.callTool('test', {})).rejects.toThrow(
        'Rate limit exceeded for tool test',
      );
    });

    it('should allow calling tools without args', async () => {
      const serverInfo: ServerInfo = {
        name: 'test-noargs',
        transport: 'stdio',
        command: 'echo',
      };
      const client = await createEnhancedClient(serverInfo);
      await client.callTool('ping');
      expect(mockCallTool).toHaveBeenCalledWith({ name: 'ping', arguments: undefined });
    });

    it('should redact object data on sendRequest', async () => {
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

    it('should redact string data on sendRequest', async () => {
      const serverInfo: ServerInfo = {
        name: 'test-redaction-string',
        transport: 'stdio',
        command: 'echo',
      };
      const client = await createEnhancedClient(serverInfo);
      const message = '{"apiKey": "123"}';
      await client.sendRequest(message);
      expect(mockSendRequest).toHaveBeenCalledWith('{"apiKey": "[REDACTED]"}');
    });
  });
});
