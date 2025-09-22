import { beforeEach, describe, expect, it } from 'vitest';
import {
  type A2AProtocolHandler,
  createA2AProtocolHandler,
} from '../src/rpc/a2a-protocol-handler.js';
import { type ConversationStore, createConversationStore } from '../src/rpc/conversation-store.js';
import { JsonRpcErrorCodes } from '../src/rpc/schemas.js';
import { createTaskManager, type TaskManager } from '../src/rpc/task-manager.js';

describe('A2A Protocol Compliance', () => {
  let handler: A2AProtocolHandler;
  let taskManager: TaskManager;
  let conversationStore: ConversationStore;

  beforeEach(() => {
    taskManager = createTaskManager();
    conversationStore = createConversationStore();
    handler = createA2AProtocolHandler(taskManager, conversationStore);
  });

  describe('RPC Method Support', () => {
    it('should handle tasks/send RPC method', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        method: 'tasks/send',
        params: {
          message: {
            role: 'user' as const,
            parts: [{ text: 'Process this data' }],
          },
          context: [],
        },
        id: 'req-1',
      };

      const response = await handler.handle(request);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        result: expect.objectContaining({
          id: expect.stringMatching(/^req-1$/),
          status: expect.stringMatching(/^(pending|processing|completed)$/),
          metadata: expect.objectContaining({
            createdAt: expect.any(String),
            estimatedCompletion: expect.any(String),
          }),
        }),
        id: 'req-1',
      });
    });

    it('should handle tasks/get RPC method', async () => {
      // First create a task
      const createRequest = {
        jsonrpc: '2.0' as const,
        method: 'tasks/send',
        params: {
          message: {
            role: 'user' as const,
            parts: [{ text: 'Test task' }],
          },
          context: [],
        },
        id: 'create-1',
      };

      await handler.handle(createRequest);

      // Then get the task
      const getRequest = {
        jsonrpc: '2.0' as const,
        method: 'tasks/get',
        params: {
          taskId: 'create-1',
        },
        id: 'get-1',
      };

      const response = await handler.handle(getRequest);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        result: expect.objectContaining({
          id: 'create-1',
          status: expect.any(String),
          message: expect.objectContaining({
            role: 'user',
            parts: [{ text: 'Test task' }],
          }),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
        id: 'get-1',
      });
    });

    it('should handle tasks/cancel RPC method', async () => {
      // First create a task
      const createRequest = {
        jsonrpc: '2.0' as const,
        method: 'tasks/send',
        params: {
          message: {
            role: 'user' as const,
            parts: [{ text: 'Task to cancel' }],
          },
          context: [],
        },
        id: 'cancel-task-1',
      };

      await handler.handle(createRequest);

      // Then cancel it
      const cancelRequest = {
        jsonrpc: '2.0' as const,
        method: 'tasks/cancel',
        params: {
          taskId: 'cancel-task-1',
          reason: 'User requested cancellation',
        },
        id: 'cancel-1',
      };

      const response = await handler.handle(cancelRequest);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        result: {
          taskId: 'cancel-task-1',
          cancelled: expect.any(Boolean),
        },
        id: 'cancel-1',
      });
    });

    it('should return method not found for unknown methods', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        method: 'unknown/method',
        params: {},
        id: 'unknown-1',
      };

      const response = await handler.handle(request);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCodes.METHOD_NOT_FOUND,
          message: 'Method not found: unknown/method',
        },
        id: 'unknown-1',
      });
    });
  });

  describe('Streaming Support', () => {
    it('should support streaming responses via SSE', async () => {
      // Create a task first
      const task = await taskManager.sendTask({
        id: 'stream-task-1',
        message: {
          role: 'user',
          parts: [{ text: 'Streaming task' }],
        },
        context: [],
      });

      const streamRequest = {
        jsonrpc: '2.0' as const,
        method: 'tasks/stream',
        params: {
          taskId: task.id,
          events: ['progress', 'completion'],
        },
        id: 'stream-1',
      };

      const eventStream = handler.stream?.(streamRequest);
      expect(eventStream).toBeDefined();

      if (eventStream) {
        const events = [];
        let count = 0;
        const maxEvents = 3; // Limit to prevent infinite loop in tests

        for await (const event of eventStream) {
          events.push(event);
          count++;
          if (count >= maxEvents) break;
        }

        expect(events.length).toBeGreaterThan(0);
        expect(events[0]).toMatchObject({
          type: expect.any(String),
          data: expect.any(String),
          retry: expect.any(Number),
        });
      }
    });

    it('should handle streaming errors gracefully', async () => {
      const invalidStreamRequest = {
        jsonrpc: '2.0' as const,
        method: 'tasks/stream',
        params: {
          taskId: 'non-existent-task',
          events: ['progress'],
        },
        id: 'invalid-stream-1',
      };

      const eventStream = handler.stream?.(invalidStreamRequest);
      expect(eventStream).toBeDefined();

      if (eventStream) {
        const events = [];
        for await (const event of eventStream) {
          events.push(event);
          if (event.type === 'error') break;
        }

        expect(events.some((e) => e.type === 'error')).toBe(true);
      }
    });
  });

  describe('Conversation Management', () => {
    it('should start new conversations', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        method: 'conversations/start',
        params: {
          agentId: 'agent-1',
          context: [],
        },
        id: 'conv-start-1',
      };

      const response = await handler.handle(request);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        result: expect.objectContaining({
          sessionId: expect.stringMatching(/^session-/),
          agentId: 'agent-1',
          createdAt: expect.any(String),
        }),
        id: 'conv-start-1',
      });
    });

    it('should maintain conversation state', async () => {
      // Start conversation
      const startRequest = {
        jsonrpc: '2.0' as const,
        method: 'conversations/start',
        params: { agentId: 'agent-1' },
        id: '1',
      };

      const startResponse = await handler.handle(startRequest);
      const sessionId = (startResponse.result as { sessionId: string }).sessionId;

      // Continue conversation
      const continueRequest = {
        jsonrpc: '2.0' as const,
        method: 'conversations/continue',
        params: {
          sessionId,
          message: {
            role: 'user' as const,
            parts: [{ text: 'Continue from before' }],
          },
        },
        id: '2',
      };

      const continueResponse = await handler.handle(continueRequest);

      expect(continueResponse).toMatchObject({
        jsonrpc: '2.0',
        result: expect.objectContaining({
          sessionId,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              parts: [{ text: 'Continue from before' }],
            }),
          ]),
          updatedAt: expect.any(String),
        }),
        id: '2',
      });
    });

    it('should handle invalid conversation sessions', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        method: 'conversations/continue',
        params: {
          sessionId: 'non-existent-session',
          message: {
            role: 'user' as const,
            parts: [{ text: 'Test message' }],
          },
        },
        id: 'invalid-conv-1',
      };

      const response = await handler.handle(request);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCodes.INVALID_PARAMS,
          message: 'Conversation not found: non-existent-session',
        },
        id: 'invalid-conv-1',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid request parameters', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        method: 'tasks/send',
        params: {
          // Missing required 'message' field
          context: [],
        },
        id: 'invalid-params-1',
      };

      const response = await handler.handle(request);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        error: expect.objectContaining({
          code: expect.any(Number),
          message: expect.any(String),
        }),
        id: 'invalid-params-1',
      });
    });

    it('should handle internal errors gracefully', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        method: 'tasks/get',
        params: {
          taskId: 'non-existent-task',
        },
        id: 'not-found-1',
      };

      const response = await handler.handle(request);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCodes.INVALID_PARAMS,
          message: 'Task not found: non-existent-task',
        },
        id: 'not-found-1',
      });
    });
  });
});
