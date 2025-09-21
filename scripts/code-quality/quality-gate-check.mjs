#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const metricsPath = path.resolve('reports/badges/metrics.json');
if (!fs.existsSync(metricsPath)) {
	console.error('[quality-gate] metrics.json not found. Run pnpm badges:generate first.');
	process.exit(1);
}

try {
	const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
	if (!metrics.qualityGate) {
		console.error('[quality-gate] qualityGate field missing in metrics.json');
		process.exit(1);
	}
	const { pass, branchMin, mutationMin } = metrics.qualityGate;
	const b = metrics.branchCoverage;
	const m = metrics.mutationScore;
	if (!pass) {
		console.error(
			`[quality-gate] FAIL branch=${b}% (min ${branchMin}%) mutation=${m}% (min ${mutationMin}%)`,
		);
		process.exit(2);
	}
	console.log(
		`[quality-gate] PASS branch=${b}% >= ${branchMin}% & mutation=${m}% >= ${mutationMin}%`,
	);
} catch (e) {
	console.error('[quality-gate] Error parsing metrics.json', e);
	process.exit(1);
}
