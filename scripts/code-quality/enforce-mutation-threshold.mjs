#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('reports/mutation/mutation.json');
// Raised default minimum mutation score from 70 -> 75 as quality gate hardening step.
const min = Number(process.env.MUTATION_MIN || 75);
if (!fs.existsSync(file)) {
	console.error(
		'[mutation-threshold] mutation.json not found – run Stryker first.',
	);
	process.exit(1);
}
try {
	const data = JSON.parse(fs.readFileSync(file, 'utf8'));
	const score = data.mutationScore;
	if (typeof score !== 'number') {
		console.error(
			'[mutation-threshold] mutationScore missing in mutation.json',
		);
		process.exit(1);
	}
	if (score + 0.0001 < min) {
		console.error(
			`[mutation-threshold] FAIL ${score.toFixed(2)}% < required ${min}%`,
		);
		process.exit(1);
	}
	console.log(`[mutation-threshold] OK ${score.toFixed(2)}% >= ${min}%`);
} catch (e) {
	console.error('[mutation-threshold] Error parsing mutation.json', e);
	process.exit(1);
}
