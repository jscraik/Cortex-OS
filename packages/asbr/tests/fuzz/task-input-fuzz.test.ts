import { describe, expect, it } from 'vitest';
import { validateTaskInput } from '../../src/lib/validate-task-input.js';
import { ValidationError } from '../../src/types/index.js';

function randomString(len: number) {
	// NOTE: Math.random acceptable here (non-crypto, test-only fuzz variety)
	return Array.from({ length: len }, () =>
		String.fromCharCode(97 + Math.floor(Math.random() * 26)),
	).join('');
}

function validBase() {
	return {
		title: `T${randomString(4)}`,
		brief: `B${randomString(8)}`,
		inputs: [{ kind: 'text', value: `v${randomString(5)}` }],
		scopes: ['tasks:create'],
		schema: 'cortex.task.input@1',
	};
}

describe('TaskInputSchema fuzz (lightweight)', () => {
	it('accepts varied valid inputs', () => {
		for (let i = 0; i < 25; i++) {
			const v = validBase();
			if (i % 5 === 0) {
				v.inputs = [{ kind: 'text', value: randomString(10) }];
			} else if (i % 5 === 1) {
				v.inputs = [{ kind: 'repo', path: `/tmp/${randomString(3)}` } as any];
			} else if (i % 5 === 2) {
				v.inputs = [{ kind: 'doc', path: `docs/${randomString(2)}.md` } as any];
			}
			expect(() => validateTaskInput(v)).not.toThrow();
		}
	});

	it('rejects missing scopes / empty scopes', () => {
		const base = validBase();
		(base as any).scopes = [];
		expect(() => validateTaskInput(base)).toThrow(ValidationError);
	});

	it('rejects wrong schema literal', () => {
		const base = validBase();
		(base as any).schema = 'cortex.task.input@2';
		expect(() => validateTaskInput(base)).toThrow(ValidationError);
	});

	it('rejects invalid input variant', () => {
		const base: any = validBase();
		base.inputs = [{ kind: 'text', value: 123 }];
		expect(() => validateTaskInput(base)).toThrow(ValidationError);
	});
});
