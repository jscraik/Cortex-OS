import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import {
  DeadLetterQueue,
  ErrorCategory,
  QuarantineLevel,
  type DeadLetterStore,
} from '@cortex-os/a2a-core/dlq';
import { SagaOrchestrator } from '@cortex-os/a2a-core/saga';
import * as telemetry from '@cortex-os/telemetry';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

describe('Telemetry integration', () => {
  it('creates span and logs in DeadLetterQueue', async () => {
    const store: DeadLetterStore = {
      enqueue: vi.fn().mockResolvedValue(undefined),
      updateCircuitBreaker: vi.fn().mockResolvedValue(undefined),
      dequeueBatch: async () => [],
      requeue: async () => {},
      remove: async () => {},
      findByCorrelationId: async () => [],
      findByQuarantineLevel: async () => [],
      findByErrorCategory: async () => [],
      findExpiredQuarantine: async () => [],
      getStats: async () => ({
        total: 0,
        byType: {},
        byError: {},
        byQuarantineLevel: {
          [QuarantineLevel.SOFT]: 0,
          [QuarantineLevel.MEDIUM]: 0,
          [QuarantineLevel.HARD]: 0,
          [QuarantineLevel.PERMANENT]: 0,
        },
        byErrorCategory: {
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
        },
        circuitBreakerStates: {},
      }),
    };

    const dlq = new DeadLetterQueue(store);
    const envelopeSchema = z.object({
      id: z.string(),
      type: z.string(),
      payload: z.any(),
    });
    const envelope: Envelope = envelopeSchema.parse({
      id: '1',
      type: 'test',
      payload: {},
    });

    await dlq.handleFailed(envelope, new Error('network failure'), 0);

    expect(telemetry.withSpan).toHaveBeenCalledWith('dlq.handleFailed', expect.any(Function));
    expect(telemetry.logWithSpan).toHaveBeenCalled();
    const span = (telemetry.logWithSpan as any).mock.calls[0][3];
    expect(span).toBeDefined();
    expect(span.spanContext().traceId).toBe('trace-id');
  });

  it('creates span and logs in SagaOrchestrator', async () => {
    const orchestrator = new SagaOrchestrator();
    orchestrator.addStep({
      id: 'step1',
      name: 'step1',
      execute: async (ctx) => ctx,
    });

    const ctxSchema = z.object({});
    const initialContext = ctxSchema.parse({});

    await orchestrator.execute(initialContext);

    expect(telemetry.withSpan).toHaveBeenCalledWith('saga.step.step1', expect.any(Function));
    expect(telemetry.logWithSpan).toHaveBeenCalled();
    const span = (telemetry.logWithSpan as any).mock.calls[0][3];
    expect(span).toBeDefined();
    expect(span.spanContext().traceId).toBe('trace-id');
  });
});
