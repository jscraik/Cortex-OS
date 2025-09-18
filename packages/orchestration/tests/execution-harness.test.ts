import { describe, expect, it } from 'vitest';
import { runOnce } from '../src/langgraph/executor.js';

describe('Execution harness', () => {
	it('runs graph once and returns output', async () => {
		const out = await runOnce({ input: 'ping' });
		expect(out.output).toBe('ping');
	});
});
