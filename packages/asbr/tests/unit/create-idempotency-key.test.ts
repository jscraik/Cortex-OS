// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createIdempotencyKey } from '../../src/sdk/index.js';

function makeInput(overrides: Partial<any> = {}): any {
	return {
		title: 'Test Task',
		brief: 'A test task',
		inputs: [],
		scopes: ['test'],
		schema: 'cortex.task.input@1',
		...overrides,
	};
}

describe('createIdempotencyKey', () => {
	it('returns the same key for identical inputs', () => {
		const input = makeInput();
		const key1 = createIdempotencyKey(input);
		const key2 = createIdempotencyKey(input);
		expect(key1).toBe(key2);
		expect(key1).toHaveLength(32);
	});

	it('returns different keys for different inputs', () => {
		const input1 = makeInput({ title: 'Task A' });
		const input2 = makeInput({ title: 'Task B' });
		const key1 = createIdempotencyKey(input1);
		const key2 = createIdempotencyKey(input2);
		expect(key1).not.toBe(key2);
	});
});
