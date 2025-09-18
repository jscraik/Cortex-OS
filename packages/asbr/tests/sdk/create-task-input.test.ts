import { describe, expect, it } from 'vitest';

import { createTaskInput } from '../../src/sdk/index.js';

describe('createTaskInput helper', () => {
	it('provides a default tasks:create scope when none supplied', () => {
		const input = createTaskInput('Title', 'Brief');

		expect(input.scopes).toContain('tasks:create');
		expect(new Set(input.scopes).size).toBe(input.scopes.length);
	});

	it('preserves provided scopes while ensuring uniqueness', () => {
		const input = createTaskInput('Title', 'Brief', {
			scopes: ['tasks:create', 'events:stream', 'tasks:create'],
		});

		expect(input.scopes).toEqual(['tasks:create', 'events:stream']);
	});
});
