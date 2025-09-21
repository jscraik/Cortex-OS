#!/usr/bin/env node
// Ensures overall branch coverage >= 65% (adjustable via BRANCH_MIN env)
import fs from 'node:fs';

const min = Number(process.env.BRANCH_MIN || 65);
try {
	const summary = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
	const pct = summary.total?.branches?.pct;
	if (typeof pct !== 'number') {
		console.error('Branch percentage not found in coverage-summary.json');
		process.exit(1);
	}
	if (pct + 0.0001 < min) {
		// epsilon
		console.error(`Branch coverage ${pct.toFixed(2)}% is below minimum ${min}%`);
		process.exit(1);
	}
	console.log(`[ensure-branch-threshold] OK ${pct.toFixed(2)}% >= ${min}%`);
} catch (e) {
	console.error('Failed to enforce branch threshold:', e instanceof Error ? e.message : e);
	process.exit(1);
}
