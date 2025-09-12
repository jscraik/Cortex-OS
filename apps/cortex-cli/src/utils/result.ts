/**
 * @file result.ts
 * @description Minimal Result type helper (functional-style) for consistent success/error returns.
 * Non-breaking introduction: not yet widely adopted; future refactors can leverage.
 */

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
    return { ok: false, error };
}

export async function toResult<T>(p: Promise<T>): Promise<Result<T>> {
    try {
        return ok(await p);
    } catch (e) {
        return err(e instanceof Error ? e : new Error(String(e)));
    }
}
