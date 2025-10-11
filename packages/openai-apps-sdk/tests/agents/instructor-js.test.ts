import { describe, expect, it } from 'vitest';
import { createInstructorAdapter } from '../../src/agents/instructor-js-adapter.js';

describe('instructor-js-adapter', () => {
	it('parses valid output', async () => {
		const adapter = createInstructorAdapter<{ x: number }>({
			validate: (t) => ({ ok: true, data: { x: t.length } }),
		});
		const out = await adapter.parse('abc');
		expect(out.x).toBe(3);
	});

	it('throws branded error on invalid', async () => {
		const adapter = createInstructorAdapter<{ x: number }>({
			validate: () => ({ ok: false, error: new Error('bad') }),
		});
		await expect(adapter.parse('')).rejects.toThrow(/brAInwav Cortex-OS/);
	});
});
