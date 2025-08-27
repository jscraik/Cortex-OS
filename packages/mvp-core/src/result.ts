export type Ok<T> = { ok: true; value: T };
export type Err<E extends { problem?: unknown } = Error> = { ok: false; error: E };
export type Result<T, E extends { problem?: unknown } = Error> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E extends { problem?: unknown }>(error: E): Err<E> => ({ ok: false, error });

export async function wrap<T>(f: () => Promise<T>): Promise<Result<T>> {
  try { return ok(await f()); } catch (e: any) { return err(e); }
}

