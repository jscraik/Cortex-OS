import { describe, expect, it } from 'vitest';
import { validatePrompt } from '../schema.js';

describe('Prompt schema', () => {
	it('rejects undeclared variables', () => {
		expect(() =>
			validatePrompt({
				id: 'sys.base',
				name: 'Base',
				version: '1',
				role: 'system',
				template: 'Hello {{user}}',
				variables: [],
				riskLevel: 'L2',
				owners: ['owner@example.com'],
			} as any),
		).toThrow(/undeclared/i);
	});

	it('accepts declared variables', () => {
		const p = validatePrompt({
			id: 'sys.base',
			name: 'Base',
			version: '1',
			role: 'system',
			template: 'Hello {{user}}',
			variables: ['user'],
			riskLevel: 'L2',
			owners: ['owner@example.com'],
		} as any);
		expect(p.id).toBe('sys.base');
	});
});
