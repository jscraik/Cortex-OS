/**
 * @file_path packages/mcp/src/__tests__/mcp-client.test.ts
 * @description Tests for MCP client with JSON-RPC 2.0 compliance
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-15
 * @version 1.0.0
 * @status active
 */

import { afterEach, beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';
import WebSocket from 'ws';
import { ConnectionState, createMcpClient, type McpClient } from '../mcp-client';

// Mock WebSocket
vi.mock('ws', () => {
  return {
    default: vi.fn(),
    WebSocket: {
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    },
  };
});

const MockWebSocket = WebSocket as MockedFunction<typeof WebSocket>;

describe('McpClient', () => {
  let client: McpClient;
  let mockWs: any;
  const defaultOptions = {
    url: 'ws://localhost:8080',
    timeout: 5000,
    retryAttempts: 0,
    retryDelay: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Track event handlers for later triggering
    const eventHandlers: Record<string, ((...args: any[]) => void)[]> = {};

    // Create a mock WebSocket instance with proper event handling
    mockWs = {
      readyState: WebSocket.CONNECTING,
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      url: defaultOptions.url,
      protocol: '',
      extensions: '',
      bufferedAmount: 0,
      binaryType: 'blob' as BinaryType,
      onopen: null,
      onerror: null,
      onclose: null,
      onmessage: null,
      // Event emitter functionality for Node.js EventEmitter style events
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        if (!eventHandlers[event]) {
          eventHandlers[event] = [];
        }
        eventHandlers[event].push(handler);
      }),
      off: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
      // Helper to trigger events in tests
      _trigger: (event: string, ...args: any[]) => {
        if (eventHandlers[event]) {
          eventHandlers[event].forEach((handler) => handler(...args));
        }
      },
      _setReady: () => {
        mockWs.readyState = WebSocket.OPEN;
        mockWs._trigger('open');
      },
      _setError: (error: Error) => {
        mockWs.readyState = WebSocket.CLOSED;
        mockWs._trigger('error', error);
      },
    };

    MockWebSocket.mockReturnValue(mockWs);
    client = createMcpClient(defaultOptions.url, defaultOptions);
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should start in disconnected state', () => {
      expect(client.getState()).toBe(ConnectionState.Disconnected);
    });

    it('should connect successfully', async () => {
      // Simulate successful connection
      const connectPromise = client.connect();

      // Trigger the 'open' event
      const openHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'open')?.[1];
      if (openHandler) openHandler();

      await connectPromise;

      expect(client.getState()).toBe(ConnectionState.Connected);
      expect(MockWebSocket).toHaveBeenCalledWith(defaultOptions.url);
    });

    it('should handle connection errors with retry', async () => {
      const error = new Error('Connection failed');

      const failingMockWs = {
        ...mockWs,
        on: vi.fn((event: string, handler: (...args: any[]) => void) => {
          if (event === 'error') {
            setTimeout(() => handler(error), 0);
          }
        }),
      };

      MockWebSocket.mockReturnValue(failingMockWs);

      const retryClient = createMcpClient(defaultOptions.url, {
        ...defaultOptions,
        retryAttempts: 3,
      });
      const connectPromise = retryClient.connect();

      await expect(connectPromise).rejects.toThrow('Failed to connect after 4 attempts');
      expect(retryClient.getState()).toBe(ConnectionState.Error);
    }, 15000);

    it('should disconnect cleanly', async () => {
      // Connect first
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'open')?.[1];
      if (openHandler) openHandler();
      await connectPromise;

      // Disconnect
      await client.disconnect();

      expect(mockWs.close).toHaveBeenCalled();
      expect(client.getState()).toBe(ConnectionState.Disconnected);
    });
  });

  describe('JSON-RPC 2.0 Protocol', () => {
    beforeEach(async () => {
      // Connect first
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'open')?.[1];
      if (openHandler) openHandler();
      await connectPromise;
    });

    it('should initialize with proper JSON-RPC message', async () => {
      const initPromise = client.initialize();

      // Check that initialize request was sent
      expect(mockWs.send).toHaveBeenCalled();
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);

      expect(sentMessage).toMatchObject({
        jsonrpc: '2.0',
        method: 'initialize',
        id: expect.any(String),
        params: expect.objectContaining({
          protocolVersion: '2024-11-05',
          clientInfo: expect.objectContaining({
            name: 'cortex-cli',
            version: '1.0.0',
          }),
        }),
      });

      // Simulate server response
      const messageHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')?.[1];

      if (messageHandler) {
        const response = {
          jsonrpc: '2.0',
          id: sentMessage.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'test-server', version: '1.0.0' },
          },
        };
        messageHandler(Buffer.from(JSON.stringify(response)));
      }

      const result = await initPromise;

      expect(result).toMatchObject({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'test-server', version: '1.0.0' },
      });
      expect(client.getState()).toBe(ConnectionState.Initialized);
    });

    it('should handle JSON-RPC errors correctly', async () => {
      const initPromise = client.initialize();

      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      const messageHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')?.[1];

      if (messageHandler) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: sentMessage.id,
          error: {
            code: -32600,
            message: 'Invalid Request',
            data: 'Test error',
          },
        };
        messageHandler(Buffer.from(JSON.stringify(errorResponse)));
      }

      await expect(initPromise).rejects.toThrow('MCP Error: Invalid Request');
    });

    it('should handle request timeouts', async () => {
      vi.useFakeTimers();

      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'open')?.[1];
      if (openHandler) openHandler();
      await connectPromise;

      const initPromise = client.initialize();

      vi.advanceTimersByTime(6000);

      await expect(initPromise).rejects.toThrow('Request timeout for method: initialize');
      expect((client as any).pendingRequests.size()).toBe(0);

      vi.useRealTimers();
    }, 10000);

    it('retries requests before failing', async () => {
      const clientWithRetry = createMcpClient(defaultOptions.url, {
        timeout: 50,
        retryAttempts: 2,
        retryDelay: 10,
      });

      const connectPromise = clientWithRetry.connect();
      const openHandler = mockWs.on.mock.calls
        .filter((call: any[]) => call[0] === 'open')
        .pop()?.[1];
      if (openHandler) openHandler();
      await connectPromise;

      const initPromise = clientWithRetry.initialize();
      await expect(initPromise).rejects.toThrow('Request timeout for method: initialize');
      expect(mockWs.send).toHaveBeenCalledTimes(3);
      expect(clientWithRetry.getMetrics().requestCount).toBe(1);
      await clientWithRetry.disconnect();
    }, 5000);

    it('updates metrics on successful request', async () => {
      vi.useFakeTimers();
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'open')?.[1];
      if (openHandler) openHandler();
      await connectPromise;

      const initPromise = client.initialize();
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      vi.advanceTimersByTime(50);
      const messageHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')?.[1];
      if (messageHandler) {
        const response = {
          jsonrpc: '2.0',
          id: sentMessage.id,
          result: { ok: true },
        };
        messageHandler(Buffer.from(JSON.stringify(response)));
      }
      await initPromise;

      const metrics = client.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.responseCount).toBe(1);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      vi.useRealTimers();
    });
  });

  describe('Tool Operations', () => {
    let messageHandler: any;

    beforeEach(async () => {
      // Connect and initialize
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'open')?.[1];
      if (openHandler) openHandler();
      await connectPromise;

      const initPromise = client.initialize();
      messageHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')?.[1];

      if (messageHandler) {
        const initMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
        const response = {
          jsonrpc: '2.0',
          id: initMessage.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'test-server', version: '1.0.0' },
          },
        };
        messageHandler(Buffer.from(JSON.stringify(response)));
      }

      await initPromise;
      // Clear send calls but keep the handler
      mockWs.send.mockClear();
    });

    it('should list tools correctly', async () => {
      const listPromise = client.listTools();

      // Wait a bit for the message to be sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage).toMatchObject({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: expect.any(String),
      });

      if (messageHandler) {
        const response = {
          jsonrpc: '2.0',
          id: sentMessage.id,
          result: {
            tools: [
              {
                name: 'config-validator',
                description: 'Validates configurations',
              },
              {
                name: 'generate-guide',
                description: 'Generates documentation',
              },
            ],
          },
        };
        messageHandler(Buffer.from(JSON.stringify(response)));
      }

      const result = await listPromise;

      expect(result.tools).toHaveLength(2);
      expect(result.tools[0]).toMatchObject({
        name: 'config-validator',
        description: 'Validates configurations',
      });
    }, 10000);

    it('should call tools with parameters', async () => {
      const toolArgs = {
        configType: 'cortex',
        config: { mode: 'simple' },
        options: { strictMode: true },
      };

      const callPromise = client.callTool('config-validator', toolArgs);

      // Wait a bit for the message to be sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage).toMatchObject({
        jsonrpc: '2.0',
        method: 'tools/call',
        id: expect.any(String),
        params: {
          name: 'config-validator',
          arguments: toolArgs,
        },
      });

      if (messageHandler) {
        const response = {
          jsonrpc: '2.0',
          id: sentMessage.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  valid: true,
                  errors: [],
                  warnings: [],
                  metadata: { configType: 'cortex' },
                }),
              },
            ],
          },
        };
        messageHandler(Buffer.from(JSON.stringify(response)));
      }

      const result = await callPromise;
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    }, 10000);
  });

  describe('Metrics and Performance', () => {
    it('should track connection metrics', () => {
      const metrics = client.getMetrics();

      expect(metrics).toMatchObject({
        connectionAttempts: expect.any(Number),
        successfulConnections: expect.any(Number),
        failedConnections: expect.any(Number),
        requestCount: expect.any(Number),
        responseCount: expect.any(Number),
        averageResponseTime: expect.any(Number),
        errors: expect.any(Array),
        uptime: expect.any(Number),
      });
    });

    it('should track request/response times', async () => {
      // Connect and initialize first
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'open')?.[1];
      if (openHandler) openHandler();
      await connectPromise;

      const initPromise = client.initialize();
      const messageHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')?.[1];

      if (messageHandler) {
        const initMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
        const response = {
          jsonrpc: '2.0',
          id: initMessage.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            serverInfo: { name: 'test', version: '1.0.0' },
          },
        };
        messageHandler(Buffer.from(JSON.stringify(response)));
      }

      await initPromise;

      const initialMetrics = client.getMetrics();
      expect(initialMetrics.requestCount).toBeGreaterThan(0);
      expect(initialMetrics.responseCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON messages', async () => {
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'open')?.[1];
      if (openHandler) openHandler();
      await connectPromise;

      const messageHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')?.[1];

      const errorSpy = vi.fn();
      client.on('error', errorSpy);

      if (messageHandler) {
        messageHandler(Buffer.from('invalid json'));
      }

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should enforce initialization requirement', async () => {
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'open')?.[1];
      if (openHandler) openHandler();
      await connectPromise;

      // Try to call tool before initialization
      await expect(client.listTools()).rejects.toThrow('MCP client not initialized');
    });

    it('should handle WebSocket closure gracefully', async () => {
      const connectPromise = client.connect();
      const openHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'open')?.[1];
      if (openHandler) openHandler();
      await connectPromise;

      const disconnectedSpy = vi.fn();
      client.on('disconnected', disconnectedSpy);

      const closeHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'close')?.[1];
      if (closeHandler) closeHandler();

      expect(disconnectedSpy).toHaveBeenCalled();
      expect(client.getState()).toBe(ConnectionState.Disconnected);
    });
  });
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
