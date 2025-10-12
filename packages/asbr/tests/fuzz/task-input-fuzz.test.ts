import { describe, expect, it } from 'vitest';
import type { TaskInput } from '../../src/types/index.js';
import { validateTaskInput } from '../../src/lib/validate-task-input.js';
import { ValidationError } from '../../src/types/index.js';

function randomString(len: number) {
	// NOTE: Math.random acceptable here (non-crypto, test-only fuzz variety)
	return Array.from({ length: len }, () =>
		String.fromCharCode(97 + Math.floor(Math.random() * 26)),
	).join('');
}

function validBase(): TaskInput {
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
                                const repoInput: TaskInput['inputs'][number] = {
                                        kind: 'repo',
                                        path: `/tmp/${randomString(3)}`,
                                };
                                v.inputs = [repoInput];
                        } else if (i % 5 === 2) {
                                const docInput: TaskInput['inputs'][number] = {
                                        kind: 'doc',
                                        path: `docs/${randomString(2)}.md`,
                                };
                                v.inputs = [docInput];
                        }
                        expect(() => validateTaskInput(v)).not.toThrow();
                }
        });

        it('rejects missing scopes / empty scopes', () => {
                const missingScopes: unknown = { ...validBase(), scopes: [] };
                expect(() => validateTaskInput(missingScopes)).toThrow(ValidationError);
        });

        it('rejects wrong schema literal', () => {
                const invalidSchema: unknown = { ...validBase(), schema: 'cortex.task.input@2' };
                expect(() => validateTaskInput(invalidSchema)).toThrow(ValidationError);
        });

        it('rejects invalid input variant', () => {
                const invalidInputVariant: unknown = {
                        ...validBase(),
                        inputs: [{ kind: 'text', value: 123 }],
                };
                expect(() => validateTaskInput(invalidInputVariant)).toThrow(ValidationError);
        });
});
