import { describe, expect, it } from 'vitest';
import {
  withSpan,
  getCurrentTraceContext,
  addRunIdToSpan,
  addRequestIdToSpan,
} from '../src/tracing/index.js';
import { isValidULID } from '../src/ulids.js';

describe('tracing', () => {
  it('getCurrentTraceContext returns null without active span', () => {
    expect(getCurrentTraceContext()).toBeNull();
  });

  it('withSpan provides trace context', async () => {
    let captured;
    await withSpan('test', async (runId, ctx) => {
      expect(isValidULID(runId)).toBe(true);
      expect(ctx.requestId).toBe('req1');
      addRunIdToSpan(runId);
      addRequestIdToSpan('req2');
      captured = ctx;
    }, { requestId: 'req1' });
    expect(captured?.traceId).toBeTruthy();
  });
});
