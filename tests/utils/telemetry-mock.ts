import { vi } from 'vitest';

const mockSpan = {
  spanContext: () => ({ traceId: 'trace-id', spanId: 'span-id' }),
  setAttributes: vi.fn(),
  setStatus: vi.fn(),
  recordException: vi.fn(),
};

export const withSpan = vi.fn(async (name: string, fn: (span: any) => Promise<any>) => {
  try {
    const result = await fn(mockSpan);
    mockSpan.setStatus({ code: 1 }); // OK status
    return result;
  } catch (err) {
    mockSpan.recordException(err as Error);
    mockSpan.setStatus({ code: 2, message: (err as Error).message }); // ERROR status
    throw err;
  }
});

export const logWithSpan = vi.fn(
  (_level: string, _message: string, _attributes: any, _span: any) => {
    // Mock implementation that just stores the call
  },
);
