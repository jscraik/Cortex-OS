import { describe, expect, it } from 'vitest';
import { withSpan, getCurrentTraceContext } from '../src/tracing/index.js';
import { isValidULID } from '../src/ulids.js';

describe('tracing', () => {
  it('getCurrentTraceContext returns null without active span', () => {
    expect(getCurrentTraceContext()).toBeNull();
  });

  it('withSpan provides trace context', async () => {
    let captured;
    await withSpan('test', async (runId, ctx) => {
      expect(isValidULID(runId)).toBe(true);
      expect(getCurrentTraceContext()?.runId).toBe(runId);
      captured = ctx;
    });
    expect(captured?.traceId).toBeTruthy();
  });
});
