#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const sparkFile = path.resolve('reports/badges/branch-trend.svg');
const readmePath = path.resolve('README.md');
const START = '<!-- BRANCH_TREND_INLINE_START -->';
const END = '<!-- BRANCH_TREND_INLINE_END -->';

if (!fs.existsSync(sparkFile)) {
	console.warn(
		'[sparkline-inline] Skipping inline embed: reports/badges/branch-trend.svg not found (generate badges first)',
	);
	process.exit(0); // graceful no-op for early pipelines
}
const svg = fs
	.readFileSync(sparkFile, 'utf8')
	.replace(/\n+/g, ' ') // collapse whitespace
	.replace(/"/g, "'"); // avoid JSON-ish quoting issues in README renderers

const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

if (!fs.existsSync(readmePath)) {
	console.error('[sparkline-inline] README.md not found');
	process.exit(1);
}
let content = fs.readFileSync(readmePath, 'utf8');

const block = `${START}\n<img alt="Branch Trend Inline" height="20" src="${dataUri}" />\n${END}`;

if (content.includes(START) && content.includes(END)) {
	// manual locate & replace to avoid regex escape lint noise
	const startIdx = content.indexOf(START);
	const endIdx = content.indexOf(END, startIdx);
	if (endIdx !== -1) {
		const after = endIdx + END.length;
		content = content.slice(0, startIdx) + block + content.slice(after);
	}
} else {
	// append near top after first heading
	const idx = content.indexOf('\n');
	content = `${content.slice(0, idx + 1)}\n${block}\n${content.slice(idx + 1)}`;
}

fs.writeFileSync(readmePath, content);
console.log('[sparkline-inline] Embedded inline sparkline into README.md');
