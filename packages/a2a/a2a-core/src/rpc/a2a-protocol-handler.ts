import type { ConversationStore } from './conversation-store.js';
import type { JsonRpcRequest, JsonRpcResponse } from './schemas.js';
import {
  ConversationContinueSchema,
  ConversationStartSchema,
  JsonRpcError,
  JsonRpcErrorCodes,
  StreamRequestSchema,
  TaskCancelSchema,
  TaskGetSchema,
  TaskSendSchema,
} from './schemas.js';
import type { ServerSentEvent, TaskManager } from './task-manager.js';

export interface JsonRpcHandler {
  handle(request: JsonRpcRequest): Promise<JsonRpcResponse>;
  stream?(request: JsonRpcRequest): AsyncGenerator<ServerSentEvent>;
}

export class A2AProtocolHandler implements JsonRpcHandler {
  constructor(
    private readonly taskManager: TaskManager,
    private readonly conversationStore: ConversationStore,
  ) { }

  async handle(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    try {
      switch (request.method) {
        case 'tasks/send':
          return await this.handleTaskSend(request);

        case 'tasks/get':
          return await this.handleTaskGet(request);

        case 'tasks/cancel':
          return await this.handleTaskCancel(request);

        case 'conversations/start':
          return await this.handleConversationStart(request);

        case 'conversations/continue':
          return await this.handleConversationContinue(request);

        default:
          throw new JsonRpcError(
            JsonRpcErrorCodes.METHOD_NOT_FOUND,
            `Method not found: ${request.method}`,
          );
      }
    } catch (error) {
      return this.createErrorResponse(request.id, error);
    }
  }

  async *stream(request: JsonRpcRequest): AsyncGenerator<ServerSentEvent> {
    if (request.method !== 'tasks/stream') {
      throw new JsonRpcError(
        JsonRpcErrorCodes.METHOD_NOT_FOUND,
        'Streaming only supported for tasks/stream method',
      );
    }

    try {
      const params = StreamRequestSchema.parse(request.params);
      const eventStream = this.taskManager.subscribeToTask(params.taskId, params.events);

      for await (const event of eventStream) {
        yield {
          id: this.generateEventId(),
          type: event.type,
          data: event.data,
          retry: 1000,
        };
      }
    } catch (error) {
      yield {
        type: 'error',
        data: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      };
    }
  }

  private async handleTaskSend(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const params = TaskSendSchema.parse(request.params);

    const task = await this.taskManager.sendTask({
      id: String(request.id),
      message: params.message,
      context: params.context,
      streaming: params.streaming,
    });

    return {
      jsonrpc: '2.0',
      result: {
        id: task.id,
        status: task.status,
        message: task.result?.message,
        metadata: {
          createdAt: task.createdAt,
          estimatedCompletion: task.estimatedCompletion,
        },
      },
      id: request.id,
    };
  }

  private async handleTaskGet(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const params = TaskGetSchema.parse(request.params);

    const task = await this.taskManager.getTask(params.taskId);

    if (!task) {
      throw new JsonRpcError(JsonRpcErrorCodes.INVALID_PARAMS, `Task not found: ${params.taskId}`);
    }

    return {
      jsonrpc: '2.0',
      result: {
        id: task.id,
        status: task.status,
        message: task.message,
        result: task.result,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        error: task.error,
      },
      id: request.id,
    };
  }

  private async handleTaskCancel(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const params = TaskCancelSchema.parse(request.params);

    const cancelled = await this.taskManager.cancelTask(params.taskId, params.reason);

    return {
      jsonrpc: '2.0',
      result: {
        taskId: params.taskId,
        cancelled,
      },
      id: request.id,
    };
  }

  private async handleConversationStart(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const params = ConversationStartSchema.parse(request.params);

    const sessionId = await this.conversationStore.startConversation(
      params.agentId,
      params.context,
    );

    return {
      jsonrpc: '2.0',
      result: {
        sessionId,
        agentId: params.agentId,
        createdAt: new Date().toISOString(),
      },
      id: request.id,
    };
  }

  private async handleConversationContinue(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const params = ConversationContinueSchema.parse(request.params);

    const conversation = await this.conversationStore.continueConversation(params.sessionId, {
      ...params.message,
      timestamp: new Date().toISOString(),
    });

    if (!conversation) {
      throw new JsonRpcError(
        JsonRpcErrorCodes.INVALID_PARAMS,
        `Conversation not found: ${params.sessionId}`,
      );
    }

    return {
      jsonrpc: '2.0',
      result: {
        sessionId: conversation.sessionId,
        messages: conversation.messages,
        context: conversation.context,
        updatedAt: conversation.updatedAt,
      },
      id: request.id,
    };
  }

  private createErrorResponse(id: JsonRpcRequest['id'], error: unknown): JsonRpcResponse {
    if (error instanceof JsonRpcError) {
      return {
        jsonrpc: '2.0',
        error: {
          code: error.code,
          message: error.message,
          data: error.data,
        },
        id,
      };
    }

    return {
      jsonrpc: '2.0',
      error: {
        code: JsonRpcErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Internal error',
      },
      id,
    };
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const createA2AProtocolHandler = (
  taskManager: TaskManager,
  conversationStore: ConversationStore,
): A2AProtocolHandler => {
  return new A2AProtocolHandler(taskManager, conversationStore);
};
