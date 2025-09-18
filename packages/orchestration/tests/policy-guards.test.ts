import { describe, expect, it } from 'vitest';
import { createCerebrumGraph } from '../src/index.js';

// The repo persona file includes WCAG and security checks/rules.
// Guard node should pass without throwing.

describe('Policy guard enforcement', () => {
	it('passes when persona includes WCAG and security rules', async () => {
		const graph = createCerebrumGraph();
		const res = await graph.invoke({ input: 'ok' });
		expect(res.output).toBe('ok');
	});
});
