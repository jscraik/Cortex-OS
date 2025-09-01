import { describe, expect, it } from 'vitest';
import { createLogger, createLogEntry, logWithContext, logEvidence } from '../src/logging/index.js';
import { generateRunId } from '../src/ulids.js';
import type { TraceContext } from '../src/types.js';
import { vi } from 'vitest';

const mockLogger = {
  info: vi.fn(),
} as any;

describe('logging', () => {
  it('redacts sensitive fields in log entry', () => {
    const runId = generateRunId();
    createLogger('cmp');
    const entry = createLogEntry('cmp', 'info', 'hello', runId, undefined, { password: 'secret', nest: { token: 't' } });
    expect(entry.extra?.password).toBe('[REDACTED]');
    // Type assertion to inform TypeScript of the nested structure
    expect((entry.extra as { nest: { token: string } })?.nest.token).toBe('[REDACTED]');
  });

  it('logs with context and evidence', () => {
    const runId = generateRunId();
    const ctx: TraceContext = { runId, requestId: 'req1' };
    logWithContext(mockLogger, 'info', 'hi', runId, ctx);
    logEvidence(mockLogger, runId, 'file', { file: 'a.ts', line: 1 });
    expect(mockLogger.info).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ runId, traceContext: ctx }),
      'hi',
    );
    expect(mockLogger.info).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ evidenceType: 'file' }),
      expect.any(String),
    );
  });
});
