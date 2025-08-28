import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import { getCurrentTraceContext } from './trace-context-manager';
import {
  OutboxMessageStatus,
  type OutboxMessage,
  type OutboxConfig,
  type OutboxProcessingResult,
  type OutboxRepository,
  type OutboxPublisher,
  type OutboxProcessor,
} from '../../a2a-contracts/src/outbox-types';
import { createTraceParent } from '../../a2a-contracts/src/trace-context';

/**
 * Enhanced Transactional Outbox Pattern Implementation
 * Ensures reliable event publishing with database transaction consistency
 * Implements ASBR best practices for reliability and observability
 */
/**
 * Enhanced Outbox Publisher with reliability features
 */
export class ReliableOutboxPublisher implements OutboxPublisher {
  constructor(
    private readonly transport: { publish: (envelope: Envelope) => Promise<void> },
    private readonly config: OutboxConfig = {},
  ) {}
  async publish(message: OutboxMessage): Promise<void> {
    // Inject current trace context if available
    const traceContext = getCurrentTraceContext();
    if (traceContext) {
      message.traceparent = createTraceParent(traceContext);
      message.tracestate = traceContext.traceState;
      message.baggage = traceContext.baggage;
    }

    const envelope: Envelope = {
      id: message.id,
      type: message.eventType,
      source: '/outbox-publisher',
      specversion: '1.0',
      time: message.createdAt.toISOString(),
      data: message.payload,
      correlationId: message.correlationId,
      causationId: message.causationId,
      traceparent: message.traceparent,
      tracestate: message.tracestate,
      baggage: message.baggage,
    };

    await this.transport.publish(envelope);
  }

  async publishBatch(messages: OutboxMessage[]): Promise<void> {
    // Publish messages in parallel with concurrency control
    const concurrency = this.config.batchSize || 10;
    const chunks = this.chunkArray(messages, concurrency);

    for (const chunk of chunks) {
      await Promise.allSettled(chunk.map((msg) => this.publish(msg)));
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Enhanced Outbox Processor with retry logic and DLQ support
 */
export class ReliableOutboxProcessor implements OutboxProcessor {
  private isRunning = false;
  private processingTimer?: NodeJS.Timeout;

  constructor(
    private readonly repository: OutboxRepository,
    private readonly publisher: OutboxPublisher,
    private readonly config: Required<OutboxConfig>,
  ) {}

  async processPending(): Promise<OutboxProcessingResult> {
    const startTime = Date.now();
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let deadLettered = 0;

    try {
      // Get pending messages
      const messages = await this.repository.findByStatus(
        OutboxMessageStatus.PENDING,
        this.config.batchSize,
      );

      if (messages.length === 0) {
        return { processed: 0, successful: 0, failed: 0, deadLettered: 0, duration: 0 };
      }

      processed = messages.length;

      // Mark messages as processing
      await Promise.all(
        messages.map((msg) => this.repository.updateStatus(msg.id, OutboxMessageStatus.PROCESSING)),
      );

      // Process messages
      const results = await Promise.allSettled(messages.map((msg) => this.processMessage(msg)));

      // Count results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const message = messages[i];

        if (result.status === 'fulfilled') {
          successful++;
          await this.repository.markProcessed(message.id, new Date());
        } else {
          failed++;
          const error = result.reason instanceof Error ? result.reason.message : 'Unknown error';
          await this.handleProcessingError(message, error);
        }
      }

      // Check for dead letter candidates
      const failedMessages = messages.filter((_, i) => results[i].status === 'rejected');
      for (const message of failedMessages) {
        if (message.retryCount >= this.config.dlqThreshold) {
          deadLettered++;
          await this.repository.moveToDeadLetter(message.id, 'Max retries exceeded');
        }
      }
    } catch (error) {
      console.error('Outbox processing error:', error);
    }

    const duration = Date.now() - startTime;
    return { processed, successful, failed, deadLettered, duration };
  }

  async processRetries(): Promise<OutboxProcessingResult> {
    const startTime = Date.now();
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let deadLettered = 0;

    try {
      const messages = await this.repository.findReadyForRetry(this.config.batchSize);
      if (messages.length === 0) {
        return { processed: 0, successful: 0, failed: 0, deadLettered: 0, duration: 0 };
      }

      processed = messages.length;

      const results = await Promise.allSettled(messages.map((msg) => this.processMessage(msg)));

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const message = messages[i];

        if (result.status === 'fulfilled') {
          successful++;
          await this.repository.markProcessed(message.id, new Date());
        } else {
          failed++;
          const error = result.reason instanceof Error ? result.reason.message : 'Unknown error';
          await this.handleProcessingError(message, error);
        }
      }
    } catch (error) {
      console.error('Outbox retry processing error:', error);
    }

    const duration = Date.now() - startTime;
    return { processed, successful, failed, deadLettered, duration };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('Starting outbox processor...');

    // Start background processing
    this.processingTimer = setInterval(async () => {
      try {
        await this.processPending();
        await this.processRetries();
      } catch (error) {
        console.error('Background processing error:', error);
      }
    }, this.config.processingIntervalMs);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
    }
    console.log('Stopped outbox processor');
  }

  private async processMessage(message: OutboxMessage): Promise<void> {
    // Check idempotency if enabled
    if (this.config.enableIdempotency && message.idempotencyKey) {
      const exists = await this.repository.existsByIdempotencyKey(message.idempotencyKey);
      if (exists) {
        console.log(`Skipping duplicate message with idempotency key: ${message.idempotencyKey}`);
        return;
      }
    }

    await this.publisher.publish(message);
  }

  private async handleProcessingError(message: OutboxMessage, error: string): Promise<void> {
    if (message.retryCount >= this.config.maxRetries) {
      await this.repository.moveToDeadLetter(message.id, error);
    } else {
      await this.repository.incrementRetry(message.id, error);
    }
  }
}

/**
 * Enhanced Outbox with transactional guarantees
 */
export class EnhancedOutbox {
  constructor(
    private readonly repository: OutboxRepository,
    private readonly publisher: OutboxPublisher,
    private readonly processor: OutboxProcessor,
  ) {}

  /**
   * Add message to outbox within a database transaction
   */
  async addToOutbox(message: Omit<OutboxMessage, 'id' | 'createdAt'>): Promise<OutboxMessage> {
    // Generate idempotency key if not provided
    const idempotencyKey = message.idempotencyKey || this.generateIdempotencyKey(message);

    const outboxMessage: Omit<OutboxMessage, 'id' | 'createdAt'> = {
      ...message,
      idempotencyKey,
      status: OutboxMessageStatus.PENDING,
      retryCount: 0,
      maxRetries: 3,
      ...this.extractTraceContext(),
    };

    return await this.repository.save(outboxMessage);
  }

  /**
   * Add multiple messages to outbox in a single transaction
   */
  async addBatchToOutbox(
    messages: Array<Omit<OutboxMessage, 'id' | 'createdAt'>>,
  ): Promise<OutboxMessage[]> {
    const outboxMessages = messages.map((message) => ({
      ...message,
      idempotencyKey: message.idempotencyKey || this.generateIdempotencyKey(message),
      status: OutboxMessageStatus.PENDING,
      retryCount: 0,
      maxRetries: 3,
      ...this.extractTraceContext(),
    }));

    return await this.repository.saveBatch(outboxMessages);
  }

  /**
   * Process pending messages manually
   */
  async processPending(): Promise<OutboxProcessingResult> {
    return await this.processor.processPending();
  }

  /**
   * Process retry messages manually
   */
  async processRetries(): Promise<OutboxProcessingResult> {
    return await this.processor.processRetries();
  }

  /**
   * Start background processing
   */
  async start(): Promise<void> {
    await this.processor.start();
  }

  /**
   * Stop background processing
   */
  async stop(): Promise<void> {
    await this.processor.stop();
  }

  /**
   * Clean up old processed messages
   */
  async cleanup(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    return await this.repository.cleanup(cutoffDate);
  }

  private generateIdempotencyKey(message: Omit<OutboxMessage, 'id' | 'createdAt'>): string {
    // Generate deterministic idempotency key based on aggregate and event
    const components = [
      message.aggregateType,
      message.aggregateId,
      message.eventType,
      message.correlationId || 'no-correlation',
    ];
    return components.join(':');
  }

  private extractTraceContext(): {
    traceparent?: string;
    tracestate?: string;
    baggage?: string;
  } {
    const traceContext = getCurrentTraceContext();
    if (!traceContext) {
      return {};
    }

    return {
      traceparent: `00-${traceContext.traceId}-${traceContext.spanId}-${traceContext.traceFlags.toString(16).padStart(2, '0')}`,
      tracestate: traceContext.traceState,
      baggage: traceContext.baggage,
    };
  }
}
