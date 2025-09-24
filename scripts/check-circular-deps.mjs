#!/usr/bin/env node
import madge from 'madge';
import path from 'node:path';

// Scope cycle checks to A2A subtree to keep the signal focused and actionable.
const roots = [path.resolve('packages/a2a')];
const ROOT_FILTER = roots[0];

const main = async () => {
	let hasCycles = false;
	for (const root of roots) {
		try {
			const res = await madge(root, {
				tsConfig: path.resolve('tsconfig.base.json'),
				fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
				detectiveOptions: { es6: { mixedImports: true } },
				includeNpm: false,
			});
			const cycles = res.circular();
			const scoped = cycles.filter((cycle) =>
				cycle.every((p) => path.resolve(p).startsWith(ROOT_FILTER)),
			);
			if (scoped.length > 0) {
				hasCycles = true;
				console.error(`\n[circular-deps] Detected cycles in ${ROOT_FILTER}:`);
				for (const cycle of scoped) {
					console.error(' - ' + cycle.join(' -> '));
				}
			}
		} catch (e) {
			console.error(`[circular-deps] Failed to analyze ${root}:`, e?.message || e);
			process.exit(2);
		}
	}
	if (hasCycles) {
		console.error('\n[circular-deps] Circular dependencies found. Failing.');
		process.exit(1);
	}
	console.log('[circular-deps] No circular dependencies detected.');
};

await main();
