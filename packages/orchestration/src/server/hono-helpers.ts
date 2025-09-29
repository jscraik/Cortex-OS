import type { Context } from 'hono';

export type UserContext = { id: string; role?: string;[key: string]: unknown } | undefined;

export function getUser(c: Context): UserContext {
  const u = c.get('user');
  return (u as UserContext) ?? undefined;
}
