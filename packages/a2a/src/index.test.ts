/**
 * A2A Protocol Implementation Tests
 * Comprehensive test suite following TDD principles
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  handleA2A,
  TaskManager,
  InMemoryTaskStore,
  EchoTaskProcessor,
  A2ARpcHandler,
  A2A_ERROR_CODES,
} from './index';
import type { JsonRpcRequest, JsonRpcResponse } from './index';

describe('A2A Protocol Implementation', () => {
  let taskManager: TaskManager;
  let rpcHandler: A2ARpcHandler;

  beforeEach(() => {
    taskManager = new TaskManager(new InMemoryTaskStore(), new EchoTaskProcessor());
    rpcHandler = new A2ARpcHandler(taskManager);
  });

  describe('JSON-RPC Request Validation', () => {
    it('should reject invalid JSON-RPC requests', async () => {
      const response = await handleA2A({ invalid: 'request' });
      const parsed = JSON.parse(response) as JsonRpcResponse;
      
      expect(parsed.error?.code).toBe(A2A_ERROR_CODES.INVALID_REQUEST);
      expect(parsed.error?.message).toContain('Invalid JSON-RPC request');
    });

    it('should handle valid JSON-RPC structure', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: '1',
        method: 'tasks/send',
        params: {
          message: {
            role: 'user',
            parts: [{ text: 'Hello, world!' }],
          },
        },
      };

      const response = await handleA2A(request);
      const parsed = JSON.parse(response) as JsonRpcResponse;
      
      expect(parsed.jsonrpc).toBe('2.0');
      expect(parsed.id).toBe('1');
      expect(parsed.result).toBeDefined();
      expect(parsed.error).toBeUndefined();
    });
  });

  describe('A2A Protocol Methods', () => {
    describe('tasks/send', () => {
      it('should create and process a task', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            message: {
              role: 'user',
              parts: [{ text: 'Hello, A2A!' }],
            },
          },
        };

        const response = await rpcHandler.handle(request);
        
        expect(response.error).toBeUndefined();
        expect(response.result).toBeDefined();
        
        const result = response.result as any;
        expect(result.id).toBeDefined();
        expect(result.status).toBe('completed');
        expect(result.message?.role).toBe('assistant');
        expect(result.message?.parts?.[0]?.text).toContain('Echo: Hello, A2A!');
      });

      it('should handle tasks with custom IDs', async () => {
        const customId = 'custom-task-id-123';
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            id: customId,
            message: {
              role: 'user',
              parts: [{ text: 'Custom ID task' }],
            },
          },
        };

        const response = await rpcHandler.handle(request);
        const result = response.result as any;
        
        expect(result.id).toBe(customId);
      });

      it('should validate required parameters', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            // Missing required message field
          },
        };

        const response = await rpcHandler.handle(request);
        
        expect(response.error?.code).toBe(A2A_ERROR_CODES.INVALID_PARAMS);
        expect(response.error?.message).toBe('Invalid parameters');
      });
    });

    describe('tasks/get', () => {
      it('should retrieve task status', async () => {
        // First, create a task
        const sendRequest: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            id: 'test-task-123',
            message: {
              role: 'user',
              parts: [{ text: 'Test message' }],
            },
          },
        };

        await rpcHandler.handle(sendRequest);

        // Then, get the task
        const getRequest: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '2',
          method: 'tasks/get',
          params: {
            id: 'test-task-123',
          },
        };

        const response = await rpcHandler.handle(getRequest);
        const result = response.result as any;
        
        expect(result.id).toBe('test-task-123');
        expect(result.status).toBe('completed');
      });

      it('should return task not found error', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/get',
          params: {
            id: 'nonexistent-task',
          },
        };

        const response = await rpcHandler.handle(request);
        
        expect(response.error?.code).toBe(A2A_ERROR_CODES.TASK_NOT_FOUND);
        expect(response.error?.message).toContain('not found');
      });
    });

    describe('tasks/cancel', () => {
      it('should cancel a pending task', async () => {
        // Create a task (it processes immediately in our test implementation)
        const sendRequest: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/send',
          params: {
            id: 'cancel-test-task',
            message: {
              role: 'user',
              parts: [{ text: 'This will be cancelled' }],
            },
          },
        };

        await rpcHandler.handle(sendRequest);

        // Try to cancel (will fail since task is already completed)
        const cancelRequest: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '2',
          method: 'tasks/cancel',
          params: {
            id: 'cancel-test-task',
          },
        };

        const response = await rpcHandler.handle(cancelRequest);
        
        // Should fail because task is already completed
        expect(response.error?.message).toContain('already completed');
      });

      it('should return task not found for nonexistent task', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'tasks/cancel',
          params: {
            id: 'nonexistent-task',
          },
        };

        const response = await rpcHandler.handle(request);
        
        expect(response.error?.code).toBe(A2A_ERROR_CODES.TASK_NOT_FOUND);
      });
    });

    describe('Unsupported methods', () => {
      it('should return method not found error', async () => {
        const request: JsonRpcRequest = {
          jsonrpc: '2.0',
          id: '1',
          method: 'unsupported/method',
          params: {},
        };

        const response = await rpcHandler.handle(request);
        
        expect(response.error?.code).toBe(A2A_ERROR_CODES.METHOD_NOT_FOUND);
        expect(response.error?.message).toContain('not found');
      });
    });
  });

  describe('Task Management', () => {
    it('should manage task lifecycle', async () => {
      const store = new InMemoryTaskStore();
      const processor = new EchoTaskProcessor();
      const manager = new TaskManager(store, processor);

      const params = {
        id: 'lifecycle-test',
        message: {
          role: 'user' as const,
          parts: [{ text: 'Lifecycle test' }],
        },
      };

      // Send task
      const result = await manager.sendTask(params);
      expect(result.status).toBe('completed');

      // Get task
      const retrieved = await manager.getTask({ id: 'lifecycle-test' });
      expect(retrieved.status).toBe('completed');

      // List tasks
      const tasks = await manager.listTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('lifecycle-test');
    });

    it('should handle processor errors gracefully', async () => {
      const store = new InMemoryTaskStore();
      const processor = {
        async process() {
          throw new Error('Processor error');
        }
      };
      const manager = new TaskManager(store, processor);

      const params = {
        message: {
          role: 'user' as const,
          parts: [{ text: 'This will fail' }],
        },
      };

      await expect(manager.sendTask(params)).rejects.toThrow(/Task .* failed/);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed input gracefully', async () => {
      const response = await handleA2A('not-json');
      const parsed = JSON.parse(response) as JsonRpcResponse;
      
      expect(parsed.error?.code).toBe(A2A_ERROR_CODES.INVALID_REQUEST);
    });

    it('should handle null input', async () => {
      const response = await handleA2A(null);
      const parsed = JSON.parse(response) as JsonRpcResponse;
      
      expect(parsed.error?.code).toBe(A2A_ERROR_CODES.INVALID_REQUEST);
    });

    it('should handle unexpected errors', async () => {
      const handler = new A2ARpcHandler(taskManager);
      
      // Mock the task manager to throw an unexpected error
      vi.spyOn(taskManager, 'sendTask').mockRejectedValue(new Error('Unexpected error'));

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: '1',
        method: 'tasks/send',
        params: {
          message: {
            role: 'user',
            parts: [{ text: 'This will cause an error' }],
          },
        },
      };

      const response = await handler.handle(request);
      
      expect(response.error?.code).toBe(A2A_ERROR_CODES.INTERNAL_ERROR);
      expect(response.error?.message).toMatch(/Task .* failed|Unexpected error/);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete A2A workflow', async () => {
      // 1. Send a task
      const sendResponse = await handleA2A({
        jsonrpc: '2.0',
        id: 'workflow-1',
        method: 'tasks/send',
        params: {
          id: 'workflow-task',
          message: {
            role: 'user',
            parts: [{ text: 'Complete workflow test' }],
          },
        },
      });

      const sendResult = JSON.parse(sendResponse) as JsonRpcResponse;
      expect(sendResult.error).toBeUndefined();
      expect((sendResult.result as any).status).toBe('completed');

      // 2. Get the task status
      const getResponse = await handleA2A({
        jsonrpc: '2.0',
        id: 'workflow-2',
        method: 'tasks/get',
        params: {
          id: 'workflow-task',
        },
      });

      const getResult = JSON.parse(getResponse) as JsonRpcResponse;
      expect(getResult.error).toBeUndefined();
      expect((getResult.result as any).id).toBe('workflow-task');
    });
  });
});