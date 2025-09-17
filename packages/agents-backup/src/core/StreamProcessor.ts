/**
 * StreamProcessor for token-level streaming responses
 * Handles real-time token streaming, tool calls, and event emission
 */

import { EventEmitter } from 'node:events';
import type {
  AgentInput,
  StreamProcessor as IStreamProcessor, 
  ModelProvider,
  StreamEvent,
  TokenUsage,
  ToolCall,
} from '../types';

export interface StreamProcessorConfig {
  bufferSize?: number;
  flushInterval?: number;
  enableMetrics?: boolean;
  maxStreamDuration?: number;
  onToken?: (token: string) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onError?: (error: Error) => void;
}

export interface StreamMetrics {
  tokensEmitted: number;
  toolCallsMade: number;
  eventsEmitted: number;
  startTime: number;
  endTime?: number;
  averageTokenRate?: number;
}

/**
 * StreamProcessor for handling real-time streaming responses
 */
export class StreamProcessor extends EventEmitter implements IStreamProcessor {
  private config: StreamProcessorConfig;
  private metrics: StreamMetrics;
  private isActive = false;
  private timeoutId?: NodeJS.Timeout;
  private buffer: string[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: StreamProcessorConfig = {}) {
    super();
    this.config = {
      bufferSize: config.bufferSize || 1,
      flushInterval: config.flushInterval || 50,
      enableMetrics: config.enableMetrics ?? true,
      maxStreamDuration: config.maxStreamDuration || 300000, // 5 minutes
      ...config
    };

    this.metrics = {
      tokensEmitted: 0,
      toolCallsMade: 0,
      eventsEmitted: 0,
      startTime: 0
    };
  }

  /**
   * Process input and return stream of events
   */
  async *process(
    input: AgentInput,
    modelProvider: ModelProvider,
    options?: {
      signal?: AbortSignal;
      onToken?: (token: string) => void;
      onToolCall?: (toolCall: ToolCall) => void;
    }
  ): AsyncIterable<StreamEvent> {
    if (!modelProvider.stream) {
      // Fallback to non-streaming response
      yield* this.handleNonStreaming(input, modelProvider);
      return;
    }

    this.isActive = true;
    this.metrics.startTime = Date.now();

    // Set up timeout
    if (this.config.maxStreamDuration) {
      this.timeoutId = setTimeout(() => {
        this.emit('timeout', { duration: this.config.maxStreamDuration });
        this.cancel();
      }, this.config.maxStreamDuration);
    }

    try {
      // Create stream request
      const streamRequest = {
        prompt: this.buildPrompt(input),
        maxTokens: input.options?.maxTokens,
        temperature: input.options?.temperature,
        tools: input.options?.tools,
        seed: input.options?.seed
      };

      // Start streaming from model provider
      const stream = modelProvider.stream(streamRequest);

      // Process stream chunks
      for await (const chunk of stream) {
        if (!this.isActive) break;

        if (options?.signal?.aborted) {
          this.cancel();
          break;
        }

        yield* this.processChunk(chunk, options);
      }

      // Signal completion
      yield {
        type: 'done',
        data: {
          usage: this.calculateUsage(),
          metrics: this.getMetrics()
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      yield {
        type: 'error',
        data: {
          error: error instanceof Error ? error.message : String(error),
          code: 'STREAM_ERROR'
        },
        timestamp: new Date().toISOString()
      };

      this.config.onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.cleanup();
    }
  }

  /**
   * Cancel the current stream
   */
  cancel(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.emit('cancelled', { timestamp: Date.now() });

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // Flush any remaining buffer
    if (this.buffer.length > 0) {
      this.flushBuffer();
    }
  }

  /**
   * Get current stream metrics
   */
  getMetrics(): StreamMetrics {
    const endTime = this.isActive ? undefined : Date.now();
    const duration = endTime ? endTime - this.metrics.startTime : Date.now() - this.metrics.startTime;

    return {
      ...this.metrics,
      endTime,
      averageTokenRate: this.metrics.tokensEmitted > 0
        ? (this.metrics.tokensEmitted / duration) * 1000 // tokens per second
        : undefined
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      tokensEmitted: 0,
      toolCallsMade: 0,
      eventsEmitted: 0,
      startTime: Date.now()
    };
  }

  // ===== Private Methods =====

  private async *handleNonStreaming(
    input: AgentInput,
    modelProvider: ModelProvider
  ): AsyncIterable<StreamEvent> {
    try {
      const response = await modelProvider.generate({
        prompt: this.buildPrompt(input),
        maxTokens: input.options?.maxTokens,
        temperature: input.options?.temperature,
        tools: input.options?.tools,
        seed: input.options?.seed
      });

      // Stream the content token by token (simulate streaming)
      const tokens = this.tokenize(response.content);
      for (const token of tokens) {
        yield {
          type: 'token',
          data: token,
          timestamp: new Date().toISOString()
        };

        this.metrics.tokensEmitted++;
        this.config.onToken?.(token);
      }

      // Handle tool calls if any
      if (response.toolCalls) {
        for (const toolCall of response.toolCalls) {
          yield {
            type: 'tool_call',
            data: toolCall,
            timestamp: new Date().toISOString()
          };

          this.metrics.toolCallsMade++;
          this.config.onToolCall?.(toolCall);
        }
      }

      // Signal completion
      yield {
        type: 'done',
        data: {
          usage: response.usage,
          metrics: this.getMetrics()
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      yield {
        type: 'error',
        data: {
          error: error instanceof Error ? error.message : String(error),
          code: 'NON_STREAMING_ERROR'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async *processChunk(
    chunk: any,
    options?: {
      onToken?: (token: string) => void;
      onToolCall?: (toolCall: ToolCall) => void;
    }
  ): AsyncIterable<StreamEvent> {
    switch (chunk.type) {
      case 'content':
        // Buffer tokens for efficient emission
        this.buffer.push(chunk.content);

        if (this.buffer.length >= this.config.bufferSize) {
          yield* this.flushBuffer();
        }

        // Set up flush timer
        if (!this.flushTimer) {
          this.flushTimer = setTimeout(async () => {
            await this.flushBuffer();
          }, this.config.flushInterval);
        }

        this.metrics.tokensEmitted++;
        options?.onToken?.(chunk.content);
        break;

      case 'tool_call':
        // Flush any pending tokens first
        yield* this.flushBuffer();

        yield {
          type: 'tool_call',
          data: chunk.toolCall,
          timestamp: new Date().toISOString()
        };

        this.metrics.toolCallsMade++;
        options?.onToolCall?.(chunk.toolCall);
        break;

      case 'usage':
        // Update token usage metrics
        if (chunk.usage) {
          this.emit('usage', chunk.usage);
        }
        break;

      default:
        // Unknown chunk type, emit as generic event
        yield {
          type: 'event',
          data: chunk,
          timestamp: new Date().toISOString()
        };
    }

    this.metrics.eventsEmitted++;
  }

  private async *flushBuffer(): AsyncIterable<StreamEvent> {
    if (this.buffer.length === 0) return;

    const content = this.buffer.join('');
    this.buffer = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    yield {
      type: 'token',
      data: content,
      timestamp: new Date().toISOString()
    };

    this.config.onToken?.(content);
  }

  private buildPrompt(input: AgentInput): string {
    // Combine all text inputs into a single prompt
    const textInputs = input.inputs.filter(i => i.type === 'text') as any[];
    return textInputs.map(ti => ti.content).join('\n');
  }

  private tokenize(text: string): string[] {
    // Simple tokenization for non-streaming fallback
    // In a real implementation, this would use proper tokenization
    return text.split(/(\s+|\b)/).filter(t => t.trim());
  }

  private calculateUsage(): TokenUsage {
    // Estimate token usage based on emitted tokens
    return {
      promptTokens: Math.floor(this.metrics.tokensEmitted * 0.7), // Rough estimate
      completionTokens: this.metrics.tokensEmitted,
      totalTokens: Math.floor(this.metrics.tokensEmitted * 1.7)
    };
  }

  private cleanup(): void {
    this.isActive = false;

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.metrics.endTime = Date.now();
    this.emit('stream_end', { metrics: this.getMetrics() });
  }
}

/**
 * Stream manager for handling multiple concurrent streams
 */
export class StreamManager {
  private streams: Map<string, StreamProcessor> = new Map();
  private maxConcurrentStreams: number;

  constructor(maxConcurrentStreams = 10) {
    this.maxConcurrentStreams = maxConcurrentStreams;
  }

  /**
   * Create a new stream processor
   */
  createStream(id: string, config?: StreamProcessorConfig): StreamProcessor {
    if (this.streams.size >= this.maxConcurrentStreams) {
      throw new Error(`Maximum concurrent streams (${this.maxConcurrentStreams}) exceeded`);
    }

    const processor = new StreamProcessor(config);
    this.streams.set(id, processor);

    // Clean up when stream ends
    processor.on('stream_end', () => {
      this.streams.delete(id);
    });

    processor.on('cancelled', () => {
      this.streams.delete(id);
    });

    return processor;
  }

  /**
   * Get a stream by ID
   */
  getStream(id: string): StreamProcessor | undefined {
    return this.streams.get(id);
  }

  /**
   * Cancel a stream by ID
   */
  cancelStream(id: string): boolean {
    const stream = this.streams.get(id);
    if (stream) {
      stream.cancel();
      return true;
    }
    return false;
  }

  /**
   * Cancel all streams
   */
  cancelAll(): void {
    for (const stream of this.streams.values()) {
      stream.cancel();
    }
    this.streams.clear();
  }

  /**
   * Get stream statistics
   */
  getStats() {
    return {
      activeStreams: this.streams.size,
      maxConcurrentStreams: this.maxConcurrentStreams,
      streams: Array.from(this.streams.entries()).map(([id, processor]) => ({
        id,
        metrics: processor.getMetrics()
      }))
    };
  }
}