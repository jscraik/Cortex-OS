/**
 * @file MCP Handlers Tests
 * @description TDD tests for MCP protocol handlers implementation
 * Tests tools/list, tools/call, resources/*, prompts/* methods
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleInitialize,
  handlePromptGet,
  handlePromptsList,
  handleResourceRead,
  handleResourceSubscribe,
  handleResourcesList,
  handleToolCall,
  handleToolsList,
} from '../src/lib/server/mcp-handlers.js';
import type { ServerContext } from '../src/lib/server/types.js';

describe('MCP Protocol Handlers', () => {
  let mockContext: ServerContext;

  beforeEach(() => {
    mockContext = {
      options: { name: 'test-server', version: '1.0.0' },
      tools: new Map(),
      resources: new Map(),
      prompts: new Map(),
      subscriptions: new Map(),
      templates: new Map(),
    };
  });

  describe('Tools Handlers', () => {
    describe('tools/list', () => {
      it('should return empty tools list when no tools registered', async () => {
        const response = await handleToolsList('test-id', {}, mockContext);

        expect(response).toEqual({
          jsonrpc: '2.0',
          id: 'test-id',
          result: { tools: [] },
        });
      });

      it('should return all registered tools with MCP compliance', async () => {
        // Register test tools
        mockContext.tools.set('calculator', {
          def: {
            name: 'calculator',
            description: 'Perform calculations',
            inputSchema: {
              type: 'object',
              properties: { expression: { type: 'string' } },
              required: ['expression'],
              additionalProperties: false,
            },
          },
          handler: vi.fn(),
        });

        mockContext.tools.set('search', {
          def: {
            name: 'search',
            description: 'Search the web',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query'],
              additionalProperties: false,
            },
          },
          handler: vi.fn(),
        });

        const response = await handleToolsList('test-id', {}, mockContext);

        expect(response.jsonrpc).toBe('2.0');
        expect(response.id).toBe('test-id');
        expect(response.result?.tools).toHaveLength(2);
        expect(response.result?.tools).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'calculator',
              description: 'Perform calculations',
              inputSchema: expect.objectContaining({
                type: 'object',
                properties: { expression: { type: 'string' } },
              }),
            }),
            expect.objectContaining({
              name: 'search',
              description: 'Search the web',
            }),
          ]),
        );
      });

      it('should handle tools with missing inputSchema', async () => {
        mockContext.tools.set('simple', {
          def: { name: 'simple', description: 'Simple tool' },
          handler: vi.fn(),
        });

        const response = await handleToolsList('test-id', {}, mockContext);

        expect(response.result?.tools[0].inputSchema).toEqual({
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false,
        });
      });
    });

    describe('tools/call', () => {
      beforeEach(() => {
        mockContext.tools.set('calculator', {
          def: {
            name: 'calculator',
            description: 'Perform calculations',
            inputSchema: {
              type: 'object',
              properties: { expression: { type: 'string' } },
              required: ['expression'],
              additionalProperties: false,
            },
          },
          handler: vi.fn().mockResolvedValue('42'),
        });
      });

      it('should execute tool with valid arguments', async () => {
        const response = await handleToolCall(
          'test-id',
          { name: 'calculator', arguments: { expression: '2+2' } },
          mockContext,
        );

        expect(response).toEqual({
          jsonrpc: '2.0',
          id: 'test-id',
          result: {
            content: [{ type: 'text', text: '42' }],
            isError: false,
          },
        });

        const handler = mockContext.tools.get('calculator')?.handler;
        expect(handler).toHaveBeenCalledWith({ expression: '2+2' });
      });

      it('should return error for non-existent tool', async () => {
        const response = await handleToolCall(
          'test-id',
          { name: 'nonexistent', arguments: {} },
          mockContext,
        );

        expect(response).toEqual({
          jsonrpc: '2.0',
          id: 'test-id',
          error: {
            code: -32601,
            message: 'Tool not found: nonexistent',
          },
        });
      });

      it('should validate tool arguments against schema', async () => {
        const response = await handleToolCall(
          'test-id',
          { name: 'calculator', arguments: {} }, // missing required expression
          mockContext,
        );

        expect(response.error?.code).toBe(-32602);
        expect(response.error?.message).toBe('Invalid tool arguments');
      });

      it('should handle tool execution errors gracefully', async () => {
        const errorHandler = vi.fn().mockRejectedValue(new Error('Tool failed'));
        mockContext.tools.set('failing-tool', {
          def: { name: 'failing-tool' },
          handler: errorHandler,
        });

        const response = await handleToolCall(
          'test-id',
          { name: 'failing-tool', arguments: {} },
          mockContext,
        );

        expect(response.result?.isError).toBe(true);
        expect(response.result?.content[0].text).toContain('Tool execution failed');
      });
    });
  });

  describe('Resources Handlers', () => {
    describe('resources/list', () => {
      it('should return empty resources list when no resources registered', async () => {
        const response = await handleResourcesList('test-id', {}, mockContext);

        expect(response).toEqual({
          jsonrpc: '2.0',
          id: 'test-id',
          result: { resources: [] },
        });
      });

      it('should return all registered resources', async () => {
        mockContext.resources.set('file:///data.json', {
          def: {
            uri: 'file:///data.json',
            name: 'Data File',
            description: 'JSON data file',
            mimeType: 'application/json',
          },
          handler: vi.fn(),
        });

        const response = await handleResourcesList('test-id', {}, mockContext);

        expect(response.result?.resources).toEqual([
          {
            uri: 'file:///data.json',
            name: 'Data File',
            description: 'JSON data file',
            mimeType: 'application/json',
          },
        ]);
      });
    });

    describe('resources/read', () => {
      beforeEach(() => {
        mockContext.resources.set('file:///data.json', {
          def: {
            uri: 'file:///data.json',
            mimeType: 'application/json',
          },
          handler: vi.fn().mockResolvedValue({ users: ['alice', 'bob'] }),
        });
      });

      it('should read resource content successfully', async () => {
        const response = await handleResourceRead(
          'test-id',
          { uri: 'file:///data.json' },
          mockContext,
        );

        expect(response).toEqual({
          jsonrpc: '2.0',
          id: 'test-id',
          result: {
            contents: [
              {
                uri: 'file:///data.json',
                mimeType: 'application/json',
                text: JSON.stringify({ users: ['alice', 'bob'] }),
              },
            ],
          },
        });
      });

      it('should return error for non-existent resource', async () => {
        const response = await handleResourceRead(
          'test-id',
          { uri: 'file:///nonexistent.json' },
          mockContext,
        );

        expect(response.error?.code).toBe(-32601);
        expect(response.error?.message).toContain('Resource not found');
      });

      it('should handle resource read errors', async () => {
        const errorHandler = vi.fn().mockRejectedValue(new Error('Read failed'));
        mockContext.resources.set('file:///error.json', {
          def: { uri: 'file:///error.json' },
          handler: errorHandler,
        });

        const response = await handleResourceRead(
          'test-id',
          { uri: 'file:///error.json' },
          mockContext,
        );

        expect(response.error?.code).toBe(-32603);
        expect(response.error?.message).toBe('Error reading resource');
      });
    });

    describe('resources/subscribe', () => {
      beforeEach(() => {
        mockContext.resources.set('file:///live-data.json', {
          def: { uri: 'file:///live-data.json' },
          handler: vi.fn(),
        });
      });

      it('should subscribe to resource changes', async () => {
        const response = await handleResourceSubscribe(
          'test-id',
          { uri: 'file:///live-data.json' },
          mockContext,
        );

        expect(response).toEqual({
          jsonrpc: '2.0',
          id: 'test-id',
          result: { subscribed: true },
        });

        expect(mockContext.subscriptions.has('resource:file:///live-data.json')).toBe(true);
      });

      it('should return error for non-existent resource', async () => {
        const response = await handleResourceSubscribe(
          'test-id',
          { uri: 'file:///nonexistent.json' },
          mockContext,
        );

        expect(response.error?.code).toBe(-32601);
        expect(response.error?.message).toContain('Resource not found');
      });
    });
  });

  describe('Prompts Handlers', () => {
    describe('prompts/list', () => {
      it('should return empty prompts list when no prompts registered', async () => {
        const response = await handlePromptsList('test-id', {}, mockContext);

        expect(response).toEqual({
          jsonrpc: '2.0',
          id: 'test-id',
          result: { prompts: [] },
        });
      });

      it('should return all registered prompts', async () => {
        mockContext.prompts.set('vacation-planner', {
          def: {
            name: 'vacation-planner',
            description: 'Plan a vacation',
          },
          handler: vi.fn(),
        });

        const response = await handlePromptsList('test-id', {}, mockContext);

        expect(response.result?.prompts).toEqual([
          {
            name: 'vacation-planner',
            description: 'Plan a vacation',
            arguments: [],
          },
        ]);
      });
    });

    describe('prompts/get', () => {
      beforeEach(() => {
        mockContext.prompts.set('greeting', {
          def: {
            name: 'greeting',
            description: 'Generate greeting',
          },
          handler: vi
            .fn()
            .mockResolvedValue([{ role: 'user', content: { type: 'text', text: 'Hello there!' } }]),
        });
      });

      it('should execute prompt and return messages', async () => {
        const response = await handlePromptGet(
          'test-id',
          { name: 'greeting', arguments: {} },
          mockContext,
        );

        expect(response).toEqual({
          jsonrpc: '2.0',
          id: 'test-id',
          result: {
            description: 'Generate greeting',
            messages: [
              {
                role: 'user',
                content: { type: 'text', text: 'Hello there!' },
              },
            ],
          },
        });
      });

      it('should return error for non-existent prompt', async () => {
        const response = await handlePromptGet(
          'test-id',
          { name: 'nonexistent', arguments: {} },
          mockContext,
        );

        expect(response.error?.code).toBe(-32601);
        expect(response.error?.message).toContain('Prompt not found');
      });

      it('should handle string result from prompt handler', async () => {
        mockContext.prompts.set('simple', {
          def: { name: 'simple' },
          handler: vi.fn().mockResolvedValue('Simple response'),
        });

        const response = await handlePromptGet(
          'test-id',
          { name: 'simple', arguments: {} },
          mockContext,
        );

        expect(response.result?.messages).toEqual([
          {
            role: 'user',
            content: { type: 'text', text: 'Simple response' },
          },
        ]);
      });
    });
  });

  describe('Initialize Handler', () => {
    it('should handle initialization with protocol version negotiation', async () => {
      const response = await handleInitialize(
        'test-id',
        {
          protocolVersion: '2025-06-18',
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
        mockContext,
      );

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 'test-id',
        result: {
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: true, listChanged: true },
            prompts: { listChanged: true },
            logging: {},
          },
          serverInfo: {
            name: 'test-server',
            version: '1.0.0',
          },
        },
      });
    });

    it('should handle initialization without protocol version', async () => {
      const response = await handleInitialize('test-id', {}, mockContext);

      expect(response.result?.protocolVersion).toBe('2025-06-18');
    });

    it('should handle version compatibility gracefully', async () => {
      const response = await handleInitialize(
        'test-id',
        { protocolVersion: '2024-01-01' },
        mockContext,
      );

      expect(response.result?.protocolVersion).toBe('2024-01-01');
    });
  });

  describe('Error Handling', () => {
    it('should return JSON-RPC 2.0 compliant error responses', async () => {
      const errorResponse = await handleToolCall('test-id', { name: 'nonexistent' }, mockContext);

      expect(errorResponse.jsonrpc).toBe('2.0');
      expect(errorResponse.id).toBe('test-id');
      expect(errorResponse.error).toMatchObject({
        code: expect.any(Number),
        message: expect.any(String),
      });
    });

    it('should handle malformed request parameters', async () => {
      const response = await handleToolCall('test-id', 'invalid-params', mockContext);

      // Should return tool execution error since the handler catches all errors
      expect(response.result?.isError).toBe(true);
      expect(response.result?.content[0].text).toContain('Tool execution failed');
    });
  });
});
