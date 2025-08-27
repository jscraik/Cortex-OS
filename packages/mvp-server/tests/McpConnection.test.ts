/**
 * @file_path packages/mcp-server/tests/McpConnection.test.ts
 * @description Tests for McpConnection WebSocket handler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { McpConnection } from '../src/McpConnection';
import { ToolRegistry } from '../src/ToolRegistry.js';

// Mock WebSocket
class MockWebSocket extends WebSocket {
  messages: string[] = [];
  readyState = WebSocket.OPEN;

  constructor() {
    super('ws://localhost');
    this.readyState = WebSocket.OPEN;
  }

  send(data: string) {
    this.messages.push(data);
  }

  getLastMessage() {
    return this.messages[this.messages.length - 1];
  }

  simulateMessage(message: any) {
    this.emit('message', Buffer.from(JSON.stringify(message)));
  }
}

describe('McpConnection', () => {
  let mockWs: MockWebSocket;
  let toolRegistry: ToolRegistry;
  let connection: McpConnection;

  beforeEach(() => {
    mockWs = new MockWebSocket();
    toolRegistry = new ToolRegistry();

    // Register a test tool
    const testTool = {
      name: 'test_tool',
      description: 'A test tool',
      async run(args: any) {
        return { result: 'success', args };
      },
    };
    toolRegistry.register(testTool);

    connection = new McpConnection(mockWs, toolRegistry);
  });

  describe('Connection Initialization', () => {
    it('should create connection with unique ID', () => {
      expect(connection.getConnectionId()).toMatch(/^conn-\d+$/);
    });

    it('should send capabilities on connection', () => {
      expect(mockWs.messages).toHaveLength(1);
      const message = JSON.parse(mockWs.getLastMessage());
      expect(message.type).toBe('notification');
      expect(message.method).toBe('capabilities');
      expect(message.params.tools).toHaveLength(1);
      expect(message.params.tools[0].name).toBe('test_tool');
    });
  });

  describe('Message Handling', () => {
    it('should handle initialize request', () => {
      const initMessage = {
        id: '1',
        type: 'request',
        method: 'initialize',
        params: {
          clientInfo: { name: 'test-client', version: '1.0.0' },
          capabilities: {},
        },
      };

      mockWs.simulateMessage(initMessage);

      const response = JSON.parse(mockWs.getLastMessage());
      expect(response.id).toBe('1');
      expect(response.type).toBe('response');
      expect(response.result.protocolVersion).toBe('2024-11-05');
      expect(response.result.serverInfo.name).toBe('cortex-mcp-server');
    });

    it('should handle tools/list request', () => {
      const listMessage = {
        id: '2',
        type: 'request',
        method: 'tools/list',
      };

      mockWs.simulateMessage(listMessage);

      const response = JSON.parse(mockWs.getLastMessage());
      expect(response.id).toBe('2');
      expect(response.type).toBe('response');
      expect(response.result.tools).toHaveLength(1);
      expect(response.result.tools[0].name).toBe('test_tool');
    });

    it('should handle ping request', () => {
      const pingMessage = {
        id: '5',
        type: 'request',
        method: 'ping',
      };

      mockWs.simulateMessage(pingMessage);

      const response = JSON.parse(mockWs.getLastMessage());
      expect(response.id).toBe('5');
      expect(response.type).toBe('response');
      expect(response.result.pong).toBe(true);
      expect(response.result.timestamp).toBeDefined();
    });
  });
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
