import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import { withSpan, logWithSpan } from '@cortex-os/telemetry';

/**
 * @file Enhanced Dead Letter Queue Implementation
 * @description Advanced DLQ with error classification, quarantine flows, and recovery strategies
 */

export enum ErrorCategory {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  POISON_MESSAGE = 'POISON_MESSAGE',
  UNKNOWN = 'UNKNOWN',
}

export enum QuarantineLevel {
  SOFT = 'SOFT', // Temporary failures, can be retried immediately
  MEDIUM = 'MEDIUM', // Moderate failures, delayed retry
  HARD = 'HARD', // Severe failures, manual intervention required
  PERMANENT = 'PERMANENT', // Never retry, permanently quarantined
}

export interface ErrorClassification {
  category: ErrorCategory;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recoverable: boolean;
  quarantineLevel: QuarantineLevel;
  suggestedAction: string;
}

export interface QuarantinePolicy {
  maxRetries: number;
  quarantineDurationMs: number;
  circuitBreakerThreshold: number;
  recoveryStrategy: 'IMMEDIATE' | 'DELAYED' | 'MANUAL' | 'EXPONENTIAL_BACKOFF';
}

export interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  nextAttemptTime: number;
}

export interface DeadLetterEnvelope extends Envelope {
  error: {
    message: string;
    stack?: string;
    code?: string;
    category: ErrorCategory;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  retryCount: number;
  firstFailureAt: string;
  lastFailureAt: string;
  failureReasons: string[];
  quarantineLevel: QuarantineLevel;
  nextRetryAt?: string;
  circuitBreakerState?: CircuitBreakerState;
  metadata: {
    processingAttempts: number;
    totalProcessingTime: number;
    lastProcessorId?: string;
    relatedMessageIds: string[];
  };
}

export interface DeadLetterStore {
  enqueue: (envelope: DeadLetterEnvelope) => Promise<void>;
  dequeueBatch: (n: number) => Promise<DeadLetterEnvelope[]>;
  requeue: (ids: string[]) => Promise<void>;
  remove: (ids: string[]) => Promise<void>;
  findByCorrelationId: (correlationId: string) => Promise<DeadLetterEnvelope[]>;
  findByQuarantineLevel: (level: QuarantineLevel) => Promise<DeadLetterEnvelope[]>;
  findByErrorCategory: (category: ErrorCategory) => Promise<DeadLetterEnvelope[]>;
  findExpiredQuarantine: (currentTime: Date) => Promise<DeadLetterEnvelope[]>;
  getStats: () => Promise<{
    total: number;
    byType: Record<string, number>;
    byError: Record<string, number>;
    byQuarantineLevel: Record<QuarantineLevel, number>;
    byErrorCategory: Record<ErrorCategory, number>;
    circuitBreakerStates: Record<string, CircuitBreakerState>;
  }>;
  updateCircuitBreaker: (messageType: string, state: CircuitBreakerState) => Promise<void>;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

export const defaultRetryPolicy: RetryPolicy = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
};

export const defaultQuarantinePolicy: QuarantinePolicy = {
  maxRetries: 5,
  quarantineDurationMs: 300000, // 5 minutes
  circuitBreakerThreshold: 10,
  recoveryStrategy: 'EXPONENTIAL_BACKOFF',
};

/**
 * Classify error and determine handling strategy
 */
export function classifyError(error: Error): ErrorClassification {
  const message = error.message.toLowerCase();
  const code = (error as any).code;

  // Network errors
  if (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timeout')
  ) {
    return {
      category: ErrorCategory.NETWORK,
      severity: 'MEDIUM',
      recoverable: true,
      quarantineLevel: QuarantineLevel.SOFT,
      suggestedAction: 'Retry with exponential backoff',
    };
  }

  // Authentication/Authorization
  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    code === '401' ||
    code === '403'
  ) {
    return {
      category: ErrorCategory.AUTHENTICATION,
      severity: 'HIGH',
      recoverable: false,
      quarantineLevel: QuarantineLevel.HARD,
      suggestedAction: 'Check credentials and permissions',
    };
  }

  // Validation errors
  if (message.includes('validation') || message.includes('invalid') || message.includes('schema')) {
    return {
      category: ErrorCategory.VALIDATION,
      severity: 'HIGH',
      recoverable: false,
      quarantineLevel: QuarantineLevel.PERMANENT,
      suggestedAction: 'Fix message format or schema',
    };
  }

  // Resource exhausted
  if (
    message.includes('rate limit') ||
    message.includes('quota') ||
    message.includes('exhausted')
  ) {
    return {
      category: ErrorCategory.RESOURCE_EXHAUSTED,
      severity: 'MEDIUM',
      recoverable: true,
      quarantineLevel: QuarantineLevel.MEDIUM,
      suggestedAction: 'Retry after delay',
    };
  }

  // External service errors
  if (
    message.includes('service unavailable') ||
    message.includes('bad gateway') ||
    code === '502' ||
    code === '503'
  ) {
    return {
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: 'MEDIUM',
      recoverable: true,
      quarantineLevel: QuarantineLevel.MEDIUM,
      suggestedAction: 'Retry with circuit breaker',
    };
  }

  // Poison messages (repeated validation failures)
  if (message.includes('poison') || message.includes('malformed')) {
    return {
      category: ErrorCategory.POISON_MESSAGE,
      severity: 'CRITICAL',
      recoverable: false,
      quarantineLevel: QuarantineLevel.PERMANENT,
      suggestedAction: 'Quarantine permanently, manual review required',
    };
  }

  // Default to internal error
  return {
    category: ErrorCategory.INTERNAL_ERROR,
    severity: 'HIGH',
    recoverable: true,
    quarantineLevel: QuarantineLevel.MEDIUM,
    suggestedAction: 'Retry with backoff, investigate root cause',
  };
}

export class DeadLetterQueue {
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();

  constructor(
    private readonly store: DeadLetterStore,
    private readonly retryPolicy: RetryPolicy = defaultRetryPolicy,
    private readonly quarantinePolicy: QuarantinePolicy = defaultQuarantinePolicy,
  ) {}

  /**
   * Check circuit breaker state for a message type
   */
  private async checkCircuitBreaker(messageType: string): Promise<CircuitBreakerState> {
    const state = this.circuitBreakers.get(messageType);
    if (!state) {
      return {
        failureCount: 0,
        lastFailureTime: 0,
        state: 'CLOSED',
        nextAttemptTime: 0,
      };
    }

    const now = Date.now();

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (state.state === 'OPEN' && now >= state.nextAttemptTime) {
      state.state = 'HALF_OPEN';
    }

    return state;
  }

  /**
   * Update circuit breaker state
   */
  private async updateCircuitBreaker(messageType: string, isFailure: boolean): Promise<void> {
    let state = this.circuitBreakers.get(messageType);
    const now = Date.now();

    if (!state) {
      state = {
        failureCount: 0,
        lastFailureTime: 0,
        state: 'CLOSED',
        nextAttemptTime: 0,
      };
      this.circuitBreakers.set(messageType, state);
    }

    if (isFailure) {
      state.failureCount++;
      state.lastFailureTime = now;

      if (state.failureCount >= this.quarantinePolicy.circuitBreakerThreshold) {
        state.state = 'OPEN';
        state.nextAttemptTime = now + this.quarantinePolicy.quarantineDurationMs;
      }
    } else {
      // Success - reset circuit breaker
      state.state = 'CLOSED';
      state.failureCount = 0;
    }

    await this.store.updateCircuitBreaker(messageType, state);
  }
  async handleFailed(
    envelope: Envelope,
    error: Error,
    retryCount: number = 0,
    processingTime: number = 0,
    processorId?: string,
  ): Promise<'retry' | 'dlq' | 'circuit_open'> {
    return withSpan('dlq.handleFailed', async (span) => {
      span.setAttributes({
        'envelope.id': envelope.id,
        'envelope.type': envelope.type,
        'error.message': error.message,
        'retry.count': retryCount,
      });

      // Classify the error
      const classification = classifyError(error);
      const now = new Date().toISOString();

      // Check circuit breaker
      const circuitState = await this.checkCircuitBreaker(envelope.type);
      if (circuitState.state === 'OPEN') {
        logWithSpan(
          'warn',
          'Circuit breaker open, rejecting message',
          {
            envelopeId: envelope.id,
            messageType: envelope.type,
          },
          span,
        );
        return 'circuit_open';
      }

      // Determine if we should retry
      if (retryCount < this.retryPolicy.maxRetries && classification.recoverable) {
        // Update circuit breaker on failure
        await this.updateCircuitBreaker(envelope.type, true);

        logWithSpan(
          'info',
          `Retrying message`,
          {
            envelopeId: envelope.id,
            retryCount: retryCount + 1,
            maxRetries: this.retryPolicy.maxRetries,
            errorCategory: classification.category,
            quarantineLevel: classification.quarantineLevel,
          },
          span,
        );

        return 'retry';
      }

      // Move to DLQ with enhanced metadata
      const dlqEnvelope: DeadLetterEnvelope = {
        ...envelope,
        error: {
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
          category: classification.category,
          severity: classification.severity,
        },
        retryCount,
        firstFailureAt: envelope.headers['first-failure-at'] || now,
        lastFailureAt: now,
        failureReasons: [
          ...(envelope.headers['failure-reasons']
            ? JSON.parse(envelope.headers['failure-reasons'])
            : []),
          error.message,
        ],
        quarantineLevel: classification.quarantineLevel,
        nextRetryAt: classification.recoverable
          ? new Date(Date.now() + this.quarantinePolicy.quarantineDurationMs).toISOString()
          : undefined,
        circuitBreakerState: circuitState,
        metadata: {
          processingAttempts: retryCount + 1,
          totalProcessingTime:
            (envelope.headers['processing-time']
              ? parseInt(envelope.headers['processing-time'])
              : 0) + processingTime,
          lastProcessorId: processorId,
          relatedMessageIds: envelope.correlationId ? [envelope.correlationId] : [],
        },
      };

      await this.store.enqueue(dlqEnvelope);

      // Update circuit breaker on DLQ entry
      await this.updateCircuitBreaker(envelope.type, true);

      logWithSpan(
        'error',
        `Message moved to DLQ`,
        {
          envelopeId: envelope.id,
          error: error.message,
          retryCount,
          totalFailures: dlqEnvelope.failureReasons.length,
          quarantineLevel: classification.quarantineLevel,
          errorCategory: classification.category,
        },
        span,
      );

      return 'dlq';
    });
  }

  /**
   * Requeue messages from DLQ for retry
   */
  async requeueMessages(ids: string[]): Promise<void> {
    return withSpan('dlq.requeueMessages', async (span) => {
      span.setAttributes({
        'message.count': ids.length,
      });

      await this.store.requeue(ids);

      logWithSpan(
        'info',
        `Requeued messages from DLQ`,
        {
          count: ids.length,
        },
        span,
      );
    });
  }

  /**
   * Remove messages from DLQ (successful reprocessing)
   */
  async removeMessages(ids: string[]): Promise<void> {
    return withSpan('dlq.removeMessages', async (span) => {
      span.setAttributes({
        'message.count': ids.length,
      });

      await this.store.remove(ids);

      logWithSpan(
        'info',
        `Removed messages from DLQ`,
        {
          count: ids.length,
        },
        span,
      );
    });
  }

  /**
   * Get DLQ statistics
   */
  async getStats() {
    return withSpan('dlq.getStats', async (span) => {
      const stats = await this.store.getStats();

      span.setAttributes({
        'dlq.total': stats.total,
        'dlq.types': Object.keys(stats.byType).length,
        'dlq.errors': Object.keys(stats.byError).length,
      });

      return stats;
    });
  }

  /**
   * Bulk requeue messages from DLQ for retry
   */
  async bulkRequeueMessages(ids: string[]): Promise<void> {
    return withSpan('dlq.bulkRequeueMessages', async (span) => {
      span.setAttributes({
        'message.count': ids.length,
      });

      await this.store.requeue(ids);

      // Reset circuit breakers for recovered messages
      const messages = await Promise.all(ids.map((id) => this.store.findByCorrelationId(id)));
      const messageTypes = new Set<string>();

      messages.flat().forEach((msg) => {
        if (msg) messageTypes.add(msg.type);
      });

      for (const type of messageTypes) {
        await this.updateCircuitBreaker(type, false);
      }

      logWithSpan(
        'info',
        `Bulk requeued messages from DLQ`,
        {
          count: ids.length,
          affectedTypes: Array.from(messageTypes),
        },
        span,
      );
    });
  }

  /**
   * Process expired quarantine messages based on recovery strategy
   */
  async processExpiredQuarantine(): Promise<void> {
    return withSpan('dlq.processExpiredQuarantine', async (span) => {
      const now = new Date();
      const expiredMessages = await this.store.findExpiredQuarantine(now);

      span.setAttributes({
        'expired.count': expiredMessages.length,
      });

      const recoverableMessages = expiredMessages.filter(
        (msg) =>
          msg.quarantineLevel !== QuarantineLevel.PERMANENT &&
          msg.error.category !== ErrorCategory.POISON_MESSAGE,
      );

      if (recoverableMessages.length > 0) {
        const ids = recoverableMessages.map((msg) => msg.id);
        await this.bulkRequeueMessages(ids);

        logWithSpan(
          'info',
          `Processed expired quarantine messages`,
          {
            expiredCount: expiredMessages.length,
            recoverableCount: recoverableMessages.length,
            requeuedCount: ids.length,
          },
          span,
        );
      }
    });
  }

  /**
   * Get messages by quarantine level
   */
  async getMessagesByQuarantineLevel(level: QuarantineLevel): Promise<DeadLetterEnvelope[]> {
    return withSpan('dlq.getMessagesByQuarantineLevel', async (span) => {
      span.setAttributes({
        'quarantine.level': level,
      });

      return this.store.findByQuarantineLevel(level);
    });
  }

  /**
   * Get messages by error category
   */
  async getMessagesByErrorCategory(category: ErrorCategory): Promise<DeadLetterEnvelope[]> {
    return withSpan('dlq.getMessagesByErrorCategory', async (span) => {
      span.setAttributes({
        'error.category': category,
      });

      return this.store.findByErrorCategory(category);
    });
  }

  /**
   * Force circuit breaker state change (for manual intervention)
   */
  async forceCircuitBreakerState(messageType: string, state: 'CLOSED' | 'OPEN'): Promise<void> {
    return withSpan('dlq.forceCircuitBreakerState', async (span) => {
      span.setAttributes({
        'message.type': messageType,
        'circuit.state': state,
      });

      const circuitState: CircuitBreakerState = {
        failureCount: state === 'OPEN' ? this.quarantinePolicy.circuitBreakerThreshold : 0,
        lastFailureTime: state === 'OPEN' ? Date.now() : 0,
        state,
        nextAttemptTime:
          state === 'OPEN' ? Date.now() + this.quarantinePolicy.quarantineDurationMs : 0,
      };

      this.circuitBreakers.set(messageType, circuitState);
      await this.store.updateCircuitBreaker(messageType, circuitState);

      logWithSpan(
        'info',
        `Forced circuit breaker state change`,
        {
          messageType,
          newState: state,
        },
        span,
      );
    });
  }

  /**
   * Get circuit breaker status for all message types
   */
  async getCircuitBreakerStatus(): Promise<Record<string, CircuitBreakerState>> {
    return withSpan('dlq.getCircuitBreakerStatus', async (span) => {
      const status: Record<string, CircuitBreakerState> = {};

      for (const messageType of this.circuitBreakers.keys()) {
        status[messageType] = await this.checkCircuitBreaker(messageType);
      }

      span.setAttributes({
        'circuit.breakers': Object.keys(status).length,
      });

      return status;
    });
  }
}

/**
 * Retry policy with exponential backoff
 */
export function calculateRetryDelay(
  retryCount: number,
  policy: RetryPolicy = defaultRetryPolicy,
): number {
  const delay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, retryCount);
  return Math.min(delay, policy.maxDelayMs);
}

/**
 * In-memory implementation of DeadLetterStore for development/testing
 */
export class InMemoryDeadLetterStore implements DeadLetterStore {
  private readonly messages = new Map<string, DeadLetterEnvelope>();
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();

  async enqueue(envelope: DeadLetterEnvelope): Promise<void> {
    this.messages.set(envelope.id, envelope);
  }

  async dequeueBatch(n: number): Promise<DeadLetterEnvelope[]> {
    const messages = Array.from(this.messages.values());
    return messages.slice(0, n);
  }

  async requeue(ids: string[]): Promise<void> {
    // In a real implementation, this would move messages back to the main queue
    ids.forEach((id) => this.messages.delete(id));
  }

  async remove(ids: string[]): Promise<void> {
    ids.forEach((id) => this.messages.delete(id));
  }

  async findByCorrelationId(correlationId: string): Promise<DeadLetterEnvelope[]> {
    return Array.from(this.messages.values()).filter((msg) => msg.correlationId === correlationId);
  }

  async findByQuarantineLevel(level: QuarantineLevel): Promise<DeadLetterEnvelope[]> {
    return Array.from(this.messages.values()).filter((msg) => msg.quarantineLevel === level);
  }

  async findByErrorCategory(category: ErrorCategory): Promise<DeadLetterEnvelope[]> {
    return Array.from(this.messages.values()).filter((msg) => msg.error.category === category);
  }

  async findExpiredQuarantine(currentTime: Date): Promise<DeadLetterEnvelope[]> {
    const now = currentTime.getTime();
    return Array.from(this.messages.values()).filter(
      (msg) => msg.nextRetryAt && new Date(msg.nextRetryAt).getTime() <= now,
    );
  }

  async updateCircuitBreaker(messageType: string, state: CircuitBreakerState): Promise<void> {
    this.circuitBreakers.set(messageType, state);
  }

  async getStats() {
    const messages = Array.from(this.messages.values());
    const byType: Record<string, number> = {};
    const byError: Record<string, number> = {};
    const byQuarantineLevel: Record<QuarantineLevel, number> = {
      [QuarantineLevel.SOFT]: 0,
      [QuarantineLevel.MEDIUM]: 0,
      [QuarantineLevel.HARD]: 0,
      [QuarantineLevel.PERMANENT]: 0,
    };
    const byErrorCategory: Record<ErrorCategory, number> = {
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.TIMEOUT]: 0,
      [ErrorCategory.AUTHENTICATION]: 0,
      [ErrorCategory.AUTHORIZATION]: 0,
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.BUSINESS_LOGIC]: 0,
      [ErrorCategory.RESOURCE_EXHAUSTED]: 0,
      [ErrorCategory.EXTERNAL_SERVICE]: 0,
      [ErrorCategory.INTERNAL_ERROR]: 0,
      [ErrorCategory.POISON_MESSAGE]: 0,
      [ErrorCategory.UNKNOWN]: 0,
    };

    messages.forEach((msg) => {
      byType[msg.type] = (byType[msg.type] || 0) + 1;
      const errorKey = msg.error.code || msg.error.message;
      byError[errorKey] = (byError[errorKey] || 0) + 1;
      byQuarantineLevel[msg.quarantineLevel]++;
      byErrorCategory[msg.error.category]++;
    });

    return {
      total: messages.length,
      byType,
      byError,
      byQuarantineLevel,
      byErrorCategory,
      circuitBreakerStates: Object.fromEntries(this.circuitBreakers.entries()),
    };
  }
}
