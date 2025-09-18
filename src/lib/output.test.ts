import { describe, expect, it } from 'vitest';
import { createJsonOutput, createStdOutput, withTimestamp } from './output';

describe('output', () => {
	it('adds ISO timestamp', () => {
		const wrapped = withTimestamp({ ok: true });
		expect(wrapped.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});
	it('formats std output', () => {
		const text = createStdOutput('hello');
		expect(text).toContain('hello');
	});
	it('formats json output', () => {
		const json = createJsonOutput({ x: 1 });
		const obj = JSON.parse(json);
		expect(obj.data.x).toBe(1);
		expect(obj.meta.timestamp).toBeTruthy();
	});
});
