import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { StreamingMemoryStore } from '../../src/adapters/store.streaming.js';
import { RealtimeMemoryServer } from '../../src/adapters/server.realtime.js';
import { createMemory } from '../test-utils.js';
import type { Memory } from '../../src/domain/types.js';
import { WebSocket } from 'ws';

// Mock WebSocket
const createMockWebSocket = () => {
  const eventHandlers: Record<string, Function[]> = {};
  let readyState = 1; // WebSocket.OPEN by default

  return {
    get readyState() { return readyState; },
    set readyState(state: number) { readyState = state; },
    send: vi.fn(),
    close: vi.fn((code?: number, reason?: string) => {
      readyState = 3; // WebSocket.CLOSED
      // Trigger close event
      const closeHandler = eventHandlers.close?.[0];
      if (closeHandler) {
        closeHandler({ code, reason, wasClean: true });
      }
    }),
    addEventListener: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),
    removeEventListener: vi.fn(),
    ping: vi.fn(),
    terminate: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn((event: string, ...args: any[]) => {
      if (eventHandlers[event]) {
        eventHandlers[event].forEach(handler => handler(...args));
      }
    }),
    _getHandlers: () => eventHandlers,
    _simulateMessage: (data: string) => {
      const messageHandler = eventHandlers.message?.[0];
      if (messageHandler) {
        messageHandler({ data });
      }
    },
    _simulateClose: (event: { code: number; reason: string }) => {
      const closeHandler = eventHandlers.close?.[0];
      if (closeHandler) {
        closeHandler(event);
      }
    }
  };
};

let mockWebSocket = createMockWebSocket();

vi.mock('ws', () => ({
  WebSocket: vi.fn(() => {
    const ws = createMockWebSocket();
    // Track all created WebSockets for testing
    if (!global._mockWebSockets) {
      global._mockWebSockets = [];
    }
    global._mockWebSockets.push(ws);
    return ws;
  }),
  Server: vi.fn().mockImplementation(function() {
    const mockServer = {
      on: vi.fn(),
      emit: vi.fn(),
      close: vi.fn((callback?: () => void) => {
        callback?.();
      }),
      clients: new Set()
    };

    // Store reference to server for connection simulation
    if (!global._mockServer) {
      global._mockServer = mockServer;
    }

    return mockServer;
  })
}));

describe('RealtimeMemoryServer', () => {
  let baseStore: InMemoryStore;
  let streamingStore: StreamingMemoryStore;
  let server: RealtimeMemoryServer;
  let namespace: string;

  // Helper function to simulate WebSocket connection
  const simulateConnection = (url: string = '/?id=test-client') => {
    const ws = new WebSocket('ws://localhost:3001');
    const mockReq = {
      url,
      headers: {
        host: 'localhost:3001',
        'user-agent': 'test'
      },
      socket: {
        remoteAddress: '127.0.0.1'
      }
    };

    // Get the latest WebSocket created
    const latestWs = global._mockWebSockets[global._mockWebSockets.length - 1];

    // Find and call the connection handler
    if (global._mockServer) {
      const connectionHandler = global._mockServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];

      if (connectionHandler) {
        connectionHandler(latestWs, mockReq);
        // Simulate the WebSocket being ready
        latestWs.readyState = 1;
      }
    }

    return latestWs;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up global mocks
    global._mockWebSockets = [];
    global._mockServer = undefined;

    baseStore = new InMemoryStore();
    streamingStore = new StreamingMemoryStore(baseStore);
    server = new RealtimeMemoryServer(streamingStore);
    namespace = 'test-' + Math.random().toString(36).substring(7);
  });

  afterEach(async () => {
    try {
      await Promise.race([
        server.stop(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Server stop timeout')), 5000))
      ]);
    } catch (error) {
      // Ignore timeout errors during cleanup
    }
    // Clean up
    const allMemories = await baseStore.list(namespace);
    for (const memory of allMemories) {
      await baseStore.delete(memory.id, namespace);
    }
  });

  describe('WebSocket Connections', () => {
    it('should handle new WebSocket connections', async () => {
      // Start server
      await server.start(3001);

      // Simulate new connection
      const ws = simulateConnection();

      // Wait for connection to be processed
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should send welcome message
      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"connected"')
      );

      // Should store connection
      expect(server.getConnectionCount()).toBe(1);
    });

    it('should handle connection authentication', async () => {
      await server.start(3001);

      // Connect with auth token
      const ws = simulateConnection('/?id=test-client&token=test-token');

      expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('"type":"connected"'));
    });

    it('should reject connections without valid token when auth is enabled', async () => {
      // Enable auth
      server = new RealtimeMemoryServer(streamingStore, {
        enableAuth: true,
        authToken: 'secret-token'
      });

      await server.start(3001);

      // Connect without token
      const ws = simulateConnection();

      // Should close connection
      expect(ws.close).toHaveBeenCalledWith(1008, 'Authentication required');
    });

    it('should handle multiple concurrent connections', async () => {
      await server.start(3001);

      // Create multiple connections
      const connections = [];
      for (let i = 0; i < 5; i++) {
        const ws = simulateConnection(`/?id=client-${i}`);
        connections.push(ws);
      }

      expect(server.getConnectionCount()).toBe(5);
    });

    it('should handle connection limits', async () => {
      // Set max connections to 2
      server = new RealtimeMemoryServer(streamingStore, {
        maxConnections: 2
      });

      await server.start(3001);

      // First two connections should succeed
      const ws1 = simulateConnection();
      const ws2 = simulateConnection();

      // Third connection should be rejected
      const ws3 = simulateConnection();
      expect(ws3.close).toHaveBeenCalledWith(1008, 'Connection limit reached');
    });

    it('should track connection metrics', async () => {
      await server.start(3001);

      // Connect and disconnect
      const ws = simulateConnection();
      ws.readyState = 3; // WebSocket.CLOSED
      // Trigger disconnect event
      const handlers = ws._getHandlers();
      if (handlers.close) {
        handlers.close[0]({ code: 1000, reason: 'Disconnect' });
      }

      const metrics = server.getConnectionMetrics();
      expect(metrics.totalConnections).toBe(1);
      expect(metrics.activeConnections).toBe(0);
    });
  });

  describe('Subscription Management', () => {
    it('should handle namespace subscriptions', async () => {
      await server.start(3001);

      const ws = simulateConnection();

      // Send subscription message
      const subscriptionMsg = {
        type: 'subscribe',
        namespace
      };

      // Simulate message event
      ws._simulateMessage(JSON.stringify(subscriptionMsg));

      // Should confirm subscription
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'subscribed',
        namespace,
        timestamp: expect.any(String)
      }));
    });

    it('should handle multiple namespace subscriptions', async () => {
      await server.start(3001);

      const ws = simulateConnection();
      const namespace2 = namespace + '-2';

      // Subscribe to first namespace
      ws._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      // Subscribe to second namespace
      ws._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace: namespace2
      }));

      // Should have both subscriptions
      const subscriptions = server.getSubscriptions(ws);
      expect(subscriptions).toContain(namespace);
      expect(subscriptions).toContain(namespace2);
    });

    it('should handle unsubscribe requests', async () => {
      await server.start(3001);

      const ws = simulateConnection();

      // Subscribe then unsubscribe
      // Subscribe
      ws._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      // Unsubscribe
      ws._simulateMessage(JSON.stringify({
        type: 'unsubscribe',
        namespace
      }));

      // Should confirm unsubscription
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'unsubscribed',
        namespace,
        timestamp: expect.any(String)
      }));
    });

    it('should validate subscription format', async () => {
      await server.start(3001);

      const ws = simulateConnection();

      // Send invalid subscription
      ws._simulateMessage(JSON.stringify({
        type: 'subscribe'
        // Missing namespace
      }));

      // Should send error
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'error',
        message: 'Invalid subscription format',
        timestamp: expect.any(String)
      }));
    });

    it('should prevent duplicate subscriptions', async () => {
      await server.start(3001);

      const ws = simulateConnection();

      // Subscribe twice to same namespace
      ws._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      ws._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      // Should send warning
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'warning',
        message: 'Already subscribed to namespace',
        timestamp: expect.any(String)
      }));
    });

    it('should handle connection cleanup on disconnect', async () => {
      await server.start(3001);

      const ws = simulateConnection();

      // Subscribe
      ws._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      // Simulate disconnect
      ws._simulateClose({ code: 1000, reason: 'Normal closure' });

      // Should clean up subscriptions
      expect(server.getSubscriptions(ws)).toHaveLength(0);
    });
  });

  describe('Message Broadcasting', () => {
    it('should broadcast memory changes to subscribers', async () => {
      await server.start(3001);

      const ws1 = simulateConnection('/?id=client1');
      const ws2 = simulateConnection('/?id=client2');

      // Both subscribe to namespace
      ws1._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      ws2._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      // Create memory (should trigger broadcast)
      const memory = createMemory({ text: 'Test memory' });
      await streamingStore.upsert(memory, namespace);

      // Both connections should receive the change
      expect(ws1.send).toHaveBeenCalledTimes(3); // welcome + subscribed + change
      expect(ws2.send).toHaveBeenCalledTimes(3); // welcome + subscribed + change
    });

    it('should only broadcast to relevant namespace subscribers', async () => {
      await server.start(3001);

      const ws1 = simulateConnection('/?id=client1');
      const ws2 = simulateConnection('/?id=client2');
      const otherNamespace = namespace + '-other';

      // Subscribe to different namespaces
      ws1._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      ws2._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace: otherNamespace
      }));

      // Create memory in first namespace
      const memory = createMemory({ text: 'Test memory' });
      await streamingStore.upsert(memory, namespace);

      // Only first connection should receive change
      expect(ws1.send).toHaveBeenCalledWith(expect.stringContaining(`"namespace":"${namespace}"`));
      expect(ws2.send).not.toHaveBeenCalledWith(expect.stringContaining(`"namespace":"${namespace}"`));
    });

    it('should handle broadcast failures gracefully', async () => {
      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Make send fail
      ws.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      // Subscribe
      ws._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      // Create memory (should not throw)
      const memory = createMemory({ text: 'Test memory' });
      await expect(streamingStore.upsert(memory, namespace)).resolves.not.toThrow();
    });

    it('should support selective message types', async () => {
      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Subscribe only to create events
      ws._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace,
        eventTypes: ['create']
      }));

      // Create and update memory
      const memory = createMemory({ text: 'Test memory' });
      await streamingStore.upsert(memory, namespace);
      await streamingStore.upsert({ ...memory, text: 'Updated' }, namespace);

      // Should only receive create event
      const createCalls = ws.send.mock.calls.filter(
        call => call[0].includes('"type":"create"')
      );
      const updateCalls = ws.send.mock.calls.filter(
        call => call[0].includes('"type":"update"')
      );

      expect(createCalls).toHaveLength(1);
      expect(updateCalls).toHaveLength(0);
    });

    it('should broadcast system events', async () => {
      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Subscribe to system events
      ws._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace: '$system'
      }));

      // Trigger system event (e.g., server shutdown)
      await server.stop();

      // Should receive system event
      expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('"type":"system"'));
    });

    it('should handle high-frequency broadcasts', async () => {
      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Subscribe
      ws._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      // Create many memories rapidly
      const promises = [];
      for (let i = 0; i < 100; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        promises.push(streamingStore.upsert(memory, namespace));
      }

      await Promise.all(promises);

      // Should handle all broadcasts
      expect(ws.send).toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    it('should ping connections periodically', async () => {
      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Wait for ping interval
      await new Promise(resolve => setTimeout(resolve, 35000));

      // Should have sent ping
      expect(ws.ping).toHaveBeenCalled();
    });

    it('should handle pong responses', async () => {
      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Simulate pong
      ws.emit('pong');

      // Should update last activity
      const metrics = server.getConnectionMetrics();
      expect(metrics.lastActivity).toBeDefined();
    });

    it('should close stale connections', async () => {
      // Set short timeout
      server = new RealtimeMemoryServer(streamingStore, {
        connectionTimeout: 1000
      });

      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Should close stale connection
      expect(ws.close).toHaveBeenCalledWith(1000, 'Connection timeout');
    });

    it('should handle connection errors gracefully', async () => {
      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Simulate error
      ws.emit('error', new Error('Connection error'));

      // Should log error and close connection
      expect(ws.close).toHaveBeenCalled();
    });

    it('should track connection lifecycle metrics', async () => {
      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Get metrics
      const metrics = server.getConnectionMetrics();

      expect(metrics.totalConnections).toBe(1);
      expect(metrics.activeConnections).toBe(1);
      expect(metrics.connectionTimestamps).toHaveLength(1);
    });

    it('should handle graceful shutdown', async () => {
      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Stop server
      await server.stop();

      // Should close all connections
      expect(ws.close).toHaveBeenCalledWith(1000, 'Server shutting down');
    });
  });

  describe('Reconnection Logic', () => {
    it('should handle reconnection with same client ID', async () => {
      await server.start(3001);

      const clientId = 'test-client';

      // First connection
      const ws1 = simulateConnection(`/?id=${clientId}`);

      // Simulate disconnect
      ws1._simulateClose({ code: 1000, reason: 'Normal closure' });

      // Reconnect with same ID
      const ws2 = simulateConnection(`/?id=${clientId}`);

      // Should restore previous subscriptions
      expect(ws2.send).toHaveBeenCalledWith(expect.stringContaining('"type":"subscriptions_restored"'));
    });

    it('should queue messages during reconnection', async () => {
      await server.start(3001);

      const clientId = 'test-client';

      // Connect and subscribe
      const ws1 = simulateConnection(`/?id=${clientId}`);

      ws1._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      // Disconnect
      ws1.close();

      // Create changes while disconnected
      const memory = createMemory({ text: 'Queued memory' });
      await streamingStore.upsert(memory, namespace);

      // Reconnect
      const ws2 = simulateConnection(`/?id=${clientId}`);

      // Should receive queued messages
      expect(ws2.send).toHaveBeenCalledWith(expect.stringContaining('"type":"create"'));
    });

    it('should expire queued messages', async () => {
      server = new RealtimeMemoryServer(streamingStore, {
        messageQueueTimeout: 1000
      });

      await server.start(3001);

      const clientId = 'test-client';

      // Connect and subscribe
      const ws1 = simulateConnection(`/?id=${clientId}`);

      ws1._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      // Disconnect
      ws1.close();

      // Create changes and wait for timeout
      const memory = createMemory({ text: 'Expired memory' });
      await streamingStore.upsert(memory, namespace);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Reconnect
      const ws2 = simulateConnection(`/?id=${clientId}`);

      // Should not receive expired messages
      const createCalls = ws2.send.mock.calls.filter(
        call => call[0].includes('"type":"create"')
      );
      expect(createCalls).toHaveLength(0);
    });

    it('should limit message queue size', async () => {
      server = new RealtimeMemoryServer(streamingStore, {
        maxQueueSize: 2
      });

      await server.start(3001);

      const clientId = 'test-client';

      // Connect and subscribe
      const ws1 = simulateConnection(`/?id=${clientId}`);

      ws1._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      // Disconnect
      ws1.close();

      // Create many changes
      for (let i = 0; i < 5; i++) {
        const memory = createMemory({ text: `Memory ${i}` });
        await streamingStore.upsert(memory, namespace);
      }

      // Reconnect
      const ws2 = simulateConnection(`/?id=${clientId}`);

      // Should only receive latest 2 messages
      const createCalls = ws2.send.mock.calls.filter(
        call => call[0].includes('"type":"create"')
      );
      expect(createCalls).toHaveLength(2);
    });

    it('should track reconnection metrics', async () => {
      await server.start(3001);

      const clientId = 'test-client';

      // Connect, disconnect, reconnect
      const ws1 = simulateConnection(`/?id=${clientId}`);

      ws1.close();

      const ws2 = simulateConnection(`/?id=${clientId}`);

      const metrics = server.getConnectionMetrics();
      expect(metrics.reconnections).toBe(1);
    });

    it('should handle reconnection with different namespaces', async () => {
      await server.start(3001);

      const clientId = 'test-client';
      const namespace2 = namespace + '-2';

      // Connect and subscribe to multiple namespaces
      const ws1 = simulateConnection(`/?id=${clientId}`);

      ws1._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace
      }));

      ws1._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace: namespace2
      }));

      // Disconnect and reconnect
      if (handlers1.close && handlers1.close[0]) {
        handlers1.close[0]({ code: 1000, reason: 'Normal closure' });
      }

      const ws2 = simulateConnection(`/?id=${clientId}`);

      // Should restore all namespace subscriptions
      const subscriptions = server.getSubscriptions(ws2);
      expect(subscriptions).toContain(namespace);
      expect(subscriptions).toContain(namespace2);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed messages', async () => {
      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Send malformed JSON
      ws._simulateMessage('invalid json');

      // Should send error response
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: expect.any(String)
      }));
    });

    it('should handle unknown message types', async () => {
      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Send unknown message type
      ws._simulateMessage(JSON.stringify({
        type: 'unknown_type'
      }));

      // Should send error response
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'error',
        message: 'Unknown message type',
        timestamp: expect.any(String)
      }));
    });

    it('should handle server errors gracefully', async () => {
      // Mock server to throw error
      vi.spyOn(server, 'broadcast').mockImplementation(() => {
        throw new Error('Broadcast error');
      });

      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Should not crash
      expect(ws.send).toHaveBeenCalled();
    });

    it('should validate subscription namespace format', async () => {
      await server.start(3001);

      const ws = simulateConnection('/?id=client1');

      // Send invalid namespace
      ws._simulateMessage(JSON.stringify({
        type: 'subscribe',
        namespace: '../invalid'
      }));

      // Should send error
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'error',
        message: 'Invalid namespace format',
        timestamp: expect.any(String)
      }));
    });
  });
});