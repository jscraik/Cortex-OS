import { createHash } from 'node:crypto';
import type { Task, TaskInput } from '../types/index.js';

/**
 * Determine idempotency key and check for existing tasks
 */
export function resolveIdempotency(
	input: TaskInput,
	providedKey: string | undefined,
	cache: Map<string, { taskId: string; expiry: number }>,
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

	const cacheEntry = cache.get(key);
	if (cacheEntry && cacheEntry.expiry > Date.now()) {
		const existingTask = tasks.get(cacheEntry.taskId);
		if (existingTask) {
			return { key, existingTask };
		}
	}
	return { key };
}
