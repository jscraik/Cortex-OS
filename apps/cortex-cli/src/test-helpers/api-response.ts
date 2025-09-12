/**
 * Shared test helpers for ApiResponse style objects
 */
interface SuccessShape<T> { success: true; data: T; meta?: Record<string, unknown>; }
interface FailureShape { success: false; error: { code: string; message: string; details?: unknown }; }

function isSuccess<T>(v: unknown): v is SuccessShape<T> {
  if (typeof v !== 'object' || v === null) return false;
  return (v as { success?: unknown }).success === true;
}

function isFailure(v: unknown): v is FailureShape {
  if (typeof v !== 'object' || v === null) return false;
  return (v as { success?: unknown }).success === false;
}

export function assertSuccess<T>(res: unknown): asserts res is SuccessShape<T> {
  if (!isSuccess<T>(res)) {
    throw new Error(`Expected success response, got: ${JSON.stringify(res)}`);
  }
}

export function assertFailure(res: unknown): asserts res is FailureShape {
  if (!isFailure(res)) {
    throw new Error(`Expected failure response, got: ${JSON.stringify(res)}`);
  }
}
