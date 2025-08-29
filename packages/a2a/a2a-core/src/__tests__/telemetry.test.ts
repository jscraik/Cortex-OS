import { describe, it, expect, vi, beforeEach } from 'vitest';

const SpanStatusCode = { OK: 1, ERROR: 2 } as const;

const spans: Array<{
  setStatus: ReturnType<typeof vi.fn>;
  recordException: ReturnType<typeof vi.fn>;
  setAttributes: ReturnType<typeof vi.fn>;
}> = [];

vi.mock('@cortex-os/telemetry');

import { withSpan, logWithSpan } from '@cortex-os/telemetry';
import { DeadLetterQueue } from '../dlq';
import type { DeadLetterStore } from '../dlq';
import { SagaOrchestrator } from '../saga';

beforeEach(() => {
  spans.length = 0;
  (withSpan as any).mockImplementation(async (_name: string, fn: (span: any) => Promise<any>) => {
    const span = {
      setStatus: vi.fn(),
      recordException: vi.fn(),
      setAttributes: vi.fn(),
    };
    spans.push(span);
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
      throw err;
    }
  });
  (withSpan as any).mockClear();
  (logWithSpan as any).mockClear();
});

describe('DeadLetterQueue telemetry', () => {
  it('creates span and logs when handling failed message', async () => {
    const store: DeadLetterStore = {
      enqueue: vi.fn(),
      dequeueBatch: vi.fn(),
      requeue: vi.fn(),
      remove: vi.fn(),
      findByCorrelationId: vi.fn(),
      findByQuarantineLevel: vi.fn(),
      findByErrorCategory: vi.fn(),
      findExpiredQuarantine: vi.fn(),
      getStats: vi.fn(),
      updateCircuitBreaker: vi.fn(),
    };

    const dlq = new DeadLetterQueue(store);
    const result = await dlq.handleFailed(
      { id: '1', type: 'test', payload: {}, headers: {} } as any,
      new Error('network timeout'),
    );

    expect(result).toBe('retry');
    expect(withSpan).toHaveBeenCalledWith('dlq.handleFailed', expect.any(Function));
    const span = spans[0];
    expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(span.recordException).not.toHaveBeenCalled();
    expect(logWithSpan).toHaveBeenCalledWith(
      'info',
      'Retrying message',
      expect.objectContaining({ envelopeId: '1', retryCount: 1 }),
      span,
    );
  });
});

describe('SagaOrchestrator telemetry', () => {
  it('records error span and logs when step fails', async () => {
    const orchestrator = new SagaOrchestrator<{ count: number }>();
    orchestrator.addStep({
      id: 's1',
      name: 'step1',
      execute: async () => {
        throw new Error('boom');
      },
    });

    const result = await orchestrator.execute({ count: 0 });

    expect(result.success).toBe(false);
    expect(withSpan).toHaveBeenCalledWith('saga.step.step1', expect.any(Function));
    const span = spans[0];
    expect(span.setStatus).toHaveBeenCalledWith(
      expect.objectContaining({ code: SpanStatusCode.ERROR }),
    );
    expect(span.recordException).toHaveBeenCalled();
    expect(logWithSpan).toHaveBeenCalledWith(
      'error',
      'Saga step failed',
      expect.objectContaining({ step: 'step1' }),
      span,
    );
  });
});
