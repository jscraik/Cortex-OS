import { describe, it, expect } from 'vitest';
import {
  withTraceContext,
  getCurrentTraceContext,
  ensureTraceContext,
} from '../src/trace-context-manager';
import { createTraceContext, type TraceContext } from '@cortex-os/a2a-contracts/trace-context';

describe('trace-context-manager', () => {
  it('propagates context across async boundaries', async () => {
    const context = createTraceContext();
    await withTraceContext(context, async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(getCurrentTraceContext()).toEqual(context);
    });
  });

  it('reuses existing context in ensureTraceContext', async () => {
    const context = createTraceContext();
    await withTraceContext(context, async () => {
      await ensureTraceContext(async () => {
        expect(getCurrentTraceContext()).toEqual(context);
      });
    });
  });

  it('creates and propagates context when absent', async () => {
    let captured: TraceContext | undefined;
    await ensureTraceContext(async () => {
      captured = getCurrentTraceContext();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(getCurrentTraceContext()).toEqual(captured);
    });
    expect(captured).toBeDefined();
  });
});
