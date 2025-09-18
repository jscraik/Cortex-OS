import { describe, expect, expectTypeOf, it } from 'vitest';

import { A11yUtils } from '../../libs/typescript/accessibility/src';
import { TOKENS, type Token } from '../../libs/typescript/contracts/src';
import { tracer } from '../../libs/typescript/telemetry/src';
import type { Json } from '../../libs/typescript/types/src';
import { cosine, dot, noop, norm, uuid, withTimeout } from '../../libs/typescript/utils/src';

describe('TypeScript libs barrel exports', () => {
	it('accessibility exports A11yUtils with contrast helpers', () => {
		expect(A11yUtils.meetsAaContrast('#000000', '#FFFFFF')).toBe(true);
	});

	it('contracts exports TOKENS and Token type', () => {
		expect(Object.keys(TOKENS)).toContain('Memories');
		expectTypeOf(Symbol.for('Memories')).toMatchTypeOf<Token>();
	});

	it('telemetry tracer creates span with name', () => {
		const span = tracer.startSpan('test-span');
		expect(span).toHaveProperty('name', 'test-span');
		span.end();
	});

	it('types exports Json type', () => {
		const payload: Json = { ok: true };
		expect(payload.ok).toBe(true);
	});

	it('utils exports vector math and helpers', async () => {
		expect(dot([1, 2], [3, 4])).toBe(11);
		expect(norm([3, 4])).toBe(5);
		expect(cosine([1, 0], [0, 1])).toBe(0);
		expect(typeof uuid()).toBe('string');
		await expect(withTimeout(Promise.resolve(42), 10)).resolves.toBe(42);
		expect(noop()).toBeUndefined();
	});
});
