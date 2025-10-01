#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const reportPath = process.argv[2] || 'reports/eslint-source.json';
if (!fs.existsSync(reportPath)) {
	console.error(`[rule-summary] Report file not found: ${reportPath}`);
	process.exit(1);
}

/** @typedef {{filePath:string,messages:Array<{ruleId:string|null,severity:number,message:string,line:number,column:number}>}} ESLintResult */

/** @type {ESLintResult[]} */
const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const counts = new Map();
const filesPerRule = new Map();
let total = 0;
for (const res of data) {
	for (const msg of res.messages) {
		const rule = msg.ruleId || 'internal/no-rule';
		total++;
		counts.set(rule, (counts.get(rule) || 0) + 1);
		if (!filesPerRule.has(rule)) filesPerRule.set(rule, new Set());
		filesPerRule.get(rule).add(res.filePath);
	}
}

const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

console.log(`ESLint Rule Frequency Summary (total issues: ${total})`);
console.log('Count  Rule  (unique files)');
for (const [rule, count] of sorted) {
	const fileSet = filesPerRule.get(rule);
	console.log(`${String(count).padStart(5)}  ${rule}  (${fileSet.size})`);
}

// Emit top offenders JSON for tooling
const summaryOut = {
	totalIssues: total,
	rules: sorted.map(([rule, count]) => ({
		rule,
		count,
		files: [...filesPerRule.get(rule)],
	})),
};
const outPath = path.join('reports', 'eslint-rule-summary.json');
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(summaryOut, null, 2));
console.log(`\nDetailed summary written to ${outPath}`);
