import { vi } from 'vitest';

export const withSpan = vi.fn(async (_name: string, fn: (span: any) => Promise<any>) => {
  const span = {
    spanContext: () => ({ traceId: 'trace-id', spanId: 'span-id' }),
    setAttributes: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
  };
  return fn(span);
});

export const logWithSpan = vi.fn();
