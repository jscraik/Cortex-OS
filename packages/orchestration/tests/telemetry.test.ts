import { afterEach, describe, expect, it, vi } from 'vitest';
import { withEnhancedSpan, workflowMetrics } from '../src/observability/otel.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withEnhancedSpan metrics', () => {
  it('records success metrics', async () => {
    const durationSpy = vi.spyOn(workflowMetrics.stepDuration, 'record');
    const execSpy = vi.spyOn(workflowMetrics.stepExecutions, 'add');

    await withEnhancedSpan('test step', async () => {}, { stepKind: 'compute' });

    expect(durationSpy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        step_kind: 'compute',
        success: 'true',
      }),
    );
    expect(execSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        step_kind: 'compute',
        result: 'success',
      }),
    );
  });

  it('records failure metrics', async () => {
    const durationSpy = vi.spyOn(workflowMetrics.stepDuration, 'record');
    const execSpy = vi.spyOn(workflowMetrics.stepExecutions, 'add');

    await expect(
      withEnhancedSpan(
        'test step',
        async () => {
          const err: any = new Error('boom');
          err.code = 'BOOM';
          throw err;
        },
        { stepKind: 'compute' },
      ),
    ).rejects.toThrow('boom');

    expect(durationSpy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        step_kind: 'compute',
        success: 'false',
      }),
    );
    expect(execSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        step_kind: 'compute',
        result: 'failure',
      }),
    );
  });
});
