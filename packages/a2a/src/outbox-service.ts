import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import type { OutboxConfig, OutboxProcessingResult, OutboxRepository } from '@cortex-os/a2a-contracts/outbox-types';
import { InMemoryOutboxRepository } from './in-memory-outbox-repository.js';
import { createA2AOutboxIntegration } from './outbox-integration.js';

export interface ProcessResultMetrics {
  processed: number;
  successful: number;
  failed: number;
  deadLettered: number;
}

export interface CleanupResultMetrics {
  cleanupDeleted: number;
}

export interface DlqStatsMetrics {
  size: number;
  details?: Record<string, unknown>;
}

export type OutboxSyncAction = 'processPending' | 'processRetries' | 'cleanup' | 'dlqStats';

export interface OutboxMetricsPayload {
  outcome: 'success' | 'error';
  durationMs: number;
  timestamp: string;
  metrics?: Record<string, unknown>;
  error?: { message: string; name?: string };
}

export interface OutboxMetricsRecorder {
  record(action: OutboxSyncAction, payload: OutboxMetricsPayload): void;
}

export interface OutboxService {
  processPending(): Promise<ProcessResultMetrics>;
  processRetries(): Promise<ProcessResultMetrics>;
  cleanup(olderThanDays?: number): Promise<CleanupResultMetrics>;
  dlqStats(): Promise<DlqStatsMetrics>;
}

export interface CreateInMemoryOutboxServiceOptions {
  repository?: OutboxRepository;
  transport?: { publish: (envelope: Envelope) => Promise<void> };
  config?: OutboxConfig;
  metricsRecorder?: OutboxMetricsRecorder;
  onDispatch?: (envelope: Envelope) => void;
}

const defaultMetricsRecorder: OutboxMetricsRecorder = {
  record(action, payload) {
    // Only log non-sensitive metadata; omit metrics and error details
    const safeLog = {
      action,
      outcome: payload.outcome,
      durationMs: payload.durationMs,
      timestamp: payload.timestamp,
      // Optionally, indicate if there was an error without logging details
      error: payload.error ? { message: '[REDACTED]' } : undefined,
    };
    console.info(
      '[brAInwav OutboxService]',
      JSON.stringify(safeLog),
    );
  },
};

function toProcessMetrics(result: OutboxProcessingResult): ProcessResultMetrics {
  return {
    processed: result.processed,
    successful: result.successful,
    failed: result.failed,
    deadLettered: result.deadLettered,
  };
}

function toCleanupMetrics(count: number): CleanupResultMetrics {
  return { cleanupDeleted: count };
}

function toDlqMetrics(stats: { size: number; details: Record<string, unknown> }): DlqStatsMetrics {
  return { size: stats.size, details: stats.details };
}

export function createInMemoryOutboxService(
  options: CreateInMemoryOutboxServiceOptions = {},
): OutboxService {
  const repository = options.repository ?? new InMemoryOutboxRepository();
  const transport = options.transport ?? {
    async publish(envelope: Envelope) {
      options.onDispatch?.(envelope);
    },
  };
  const integration = createA2AOutboxIntegration(transport, repository, options.config);
  const recorder = options.metricsRecorder ?? defaultMetricsRecorder;

  const instrument = async <T, R>(
    action: OutboxSyncAction,
    runner: () => Promise<T>,
    mapper: (result: T) => R,
  ): Promise<R> => {
    const started = performance.now();
    try {
      const raw = await runner();
      const metrics = mapper(raw);
      recorder.record(action, {
        outcome: 'success',
        durationMs: Math.round(performance.now() - started),
        timestamp: new Date().toISOString(),
        metrics: metrics as Record<string, unknown>,
      });
      return metrics;
    } catch (error) {
      recorder.record(action, {
        outcome: 'error',
        durationMs: Math.round(performance.now() - started),
        timestamp: new Date().toISOString(),
        error: {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : 'Error',
        },
      });
      throw error;
    }
  };

  return {
    async processPending() {
      return instrument('processPending', () => integration.processPending(), toProcessMetrics);
    },
    async processRetries() {
      return instrument('processRetries', () => integration.processRetries(), toProcessMetrics);
    },
    async cleanup(olderThanDays?: number) {
      return instrument(
        'cleanup',
        () => integration.cleanup(olderThanDays),
        toCleanupMetrics,
      );
    },
    async dlqStats() {
      return instrument('dlqStats', () => integration.getDlqStats(), toDlqMetrics);
    },
  };
}
