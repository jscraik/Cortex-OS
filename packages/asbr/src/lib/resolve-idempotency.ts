import { createHash } from 'crypto';
import { Task, TaskInput } from '../types/index.js';

/**
 * Determine idempotency key and check for existing tasks
 */
export function resolveIdempotency(
  input: TaskInput,
  providedKey: string | undefined,
  cache: Map<string, string>,
  tasks: Map<string, Task>,
): { key: string; existingTask?: Task } {
  let key = providedKey;
  if (!key) {
    const base = JSON.stringify({
      title: input.title,
      brief: input.brief,
      inputs: input.inputs,
      scopes: input.scopes.sort(),
    });
    key = createHash('sha256').update(base).digest('hex').substring(0, 16);
  }

  const existingId = cache.get(key);
  if (existingId) {
    const existingTask = tasks.get(existingId);
    if (existingTask) {
      return { key, existingTask };
    }
  }
  return { key };
}
