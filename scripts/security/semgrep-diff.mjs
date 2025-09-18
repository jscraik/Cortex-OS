#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const reportsDir = path.resolve('reports');
const baselinePath = path.join(reportsDir, 'semgrep-baseline.json');
const currentPath = path.join(reportsDir, 'semgrep-current.json');

if (!fs.existsSync(currentPath)) {
	console.error('[semgrep-diff] current report missing');
	process.exit(1);
}

let baselineFindings = [];
if (fs.existsSync(baselinePath)) {
	try {
		const raw = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
		baselineFindings = raw.results || raw.findings || [];
	} catch (_e) {
		console.warn(
			'[semgrep-diff] failed to parse baseline, continuing as empty',
		);
	}
}

const currentRaw = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
const currentFindings = currentRaw.results || currentRaw.findings || [];

const sig = (r) => `${r.check_id}::${r.path}::${r.start?.line}`;
const baselineSet = new Set(baselineFindings.map(sig));

const newFindings = currentFindings.filter((r) => !baselineSet.has(sig(r)));

if (newFindings.length) {
	console.error(`❌ New Semgrep findings introduced: ${newFindings.length}`);
	newFindings.slice(0, 50).forEach((f) => {
		console.error(`- ${f.check_id} @ ${f.path}:${f.start?.line}`);
	});
	if (newFindings.length > 50) console.error('... truncated');
	process.exit(1);
}

console.log('✅ No new Semgrep findings beyond baseline');
