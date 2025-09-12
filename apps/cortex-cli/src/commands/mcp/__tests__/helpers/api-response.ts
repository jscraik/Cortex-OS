/**
 * Shared API response assertion helpers for Marketplace/MCP tests.
 * Keeps individual test files DRY and provides strong type narrowing.
 */
export interface SuccessResponse<T, M = Record<string, unknown>> {
    success: true;
    data: T;
    meta?: M;
}

export interface FailureResponse {
    success: false;
    error: { code: string; message: string };
}

export function assertSuccess<T, M = Record<string, unknown>>(res: unknown): asserts res is SuccessResponse<T, M> {
    if (
        !res ||
        typeof res !== 'object' ||
        // use optional chaining with index signature to avoid any cast
        (res as Record<string, unknown>)?.['success'] !== true
    ) {
        throw new Error(`Expected success response, got ${JSON.stringify(res)}`);
    }
}

export function assertFailure(res: unknown): asserts res is FailureResponse {
    if (
        !res ||
        typeof res !== 'object' ||
        (res as Record<string, unknown>)?.['success'] !== false
    ) {
        throw new Error(`Expected failure response, got ${JSON.stringify(res)}`);
    }
}
