#!/usr/bin/env -S node
import { readFileSync } from 'node:fs';

const paths = [
	'.cortex/indexes/mcp.index.json',
	'.cortex/indexes/a2a.index.json',
	'.cortex/indexes/rag.index.json',
	'.cortex/indexes/simlab.index.json',
];

for (const p of paths) {
	const j = JSON.parse(readFileSync(p, 'utf8'));
	if (!Array.isArray(j?.packages)) {
		console.error(`${p}: missing packages[]`);
		process.exit(1);
	}
	for (const e of j.packages) {
		if (!e.name || !e.path) {
			console.error(`${p}: invalid entry`);
			process.exit(1);
		}
		if (!e.path.startsWith('apps/cortex-os/packages/')) {
			console.error(`${p}: path must be under apps/cortex-os/packages`);
			process.exit(1);
		}
	}
}
console.log('indexes OK');
