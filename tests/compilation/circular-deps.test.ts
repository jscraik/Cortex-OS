import path from 'node:path';
import madge from 'madge';
import { describe, expect, it } from 'vitest';

const roots = [path.resolve('packages/a2a')];

describe('circular dependency guard', () => {
	for (const root of roots) {
		it(`has no cycles under ${root}`, async () => {
			const res = await madge(root, {
				tsConfig: path.resolve('tsconfig.base.json'),
				fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
				detectiveOptions: { es6: { mixedImports: true } },
				includeNpm: false,
			});
			const cycles: string[][] = res.circular();
			if (cycles.length > 0) {
				// Show up to a few cycles for readability
				const sample = cycles
					.slice(0, 5)
					.map((c: string[]) => c.join(' -> '))
					.join('\n');
				throw new Error(
					`Circular dependencies detected under ${root}:\n${sample}${cycles.length > 5 ? `\n... (+${cycles.length - 5} more)` : ''}`,
				);
			}
			expect(cycles.length).toBe(0);
		});
	}
});
