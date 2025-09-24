import { describe, expect, it } from 'vitest';
import { allTools } from '../src/tools/index.js';

const forbiddenSignals: ReadonlyArray<RegExp> = [
	/mock adapter response/i,
	/mock response\b/i,
	/placeholder/i,
	/\bnot yet implemented\b/i,
	/\bTODO\b/,
];

describe('MCP tool production readiness', () => {
	it('ensures every registered tool has a production implementation', () => {
		expect(allTools.length).toBeGreaterThan(0);

		for (const tool of allTools) {
			expect(typeof tool.name).toBe('string');
			expect(tool.name.trim().length).toBeGreaterThan(0);
			expect(typeof tool.execute).toBe('function');
			const serializedSource = `${tool.description ?? ''}\n${tool.execute.toString()}`;

			for (const signal of forbiddenSignals) {
				expect(signal.test(serializedSource)).toBe(false);
			}
		}
	});
});
