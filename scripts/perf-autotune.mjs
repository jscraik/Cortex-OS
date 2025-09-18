#!/usr/bin/env node
import fs from 'node:fs';

function usage() {
	console.error(
		'Usage: perf-autotune.mjs <baseline.json> <history.json> [--window N] [--headroom PCT]',
	);
	process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) usage();
const baselinePath = args[0];
const historyPath = args[1];
let windowSize = 10; // default last N entries per target
let headroomPct = 25; // default +25% headroom over median
for (let i = 2; i < args.length; i++) {
	if (args[i] === '--window') windowSize = parseInt(args[++i], 10);
	else if (args[i] === '--headroom') headroomPct = parseFloat(args[++i]);
}

if (!fs.existsSync(baselinePath)) usage();
if (!fs.existsSync(historyPath)) usage();

let baseline, history;
try {
	baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
} catch (e) {
	console.error('Invalid baseline JSON:', e.message);
	process.exit(1);
}
try {
	history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
} catch (e) {
	console.error('Invalid history JSON:', e.message);
	process.exit(1);
}

if (!Array.isArray(history)) {
	console.error('History file must be an array of entries');
	process.exit(1);
}

const grouped = new Map();
history.forEach((h) => {
	if (!h || typeof h !== 'object') return;
	if (!h.target || typeof h.durationMs !== 'number') return;
	if (!grouped.has(h.target)) grouped.set(h.target, []);
	grouped.get(h.target).push(h);
});

function median(values) {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[mid - 1] + sorted[mid]) / 2
		: sorted[mid];
}

const report = [];
for (const [target, entries] of grouped.entries()) {
	const slice = entries.slice(-windowSize);
	const durations = slice.map((e) => e.durationMs);
	const med = median(durations);
	if (!baseline.targets) baseline.targets = {};
	const old = baseline.targets[target]?.maxMs;
	const proposed = Math.round(med * (1 + headroomPct / 100));
	// Only update if baseline missing or proposed differs by >5%
	if (typeof old !== 'number' || Math.abs(proposed - old) / old > 0.05) {
		baseline.targets[target] = { maxMs: proposed };
		report.push({ target, median: med, oldMax: old, newMax: proposed });
	}
}

fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
console.log('[perf-autotune] Updated baseline written. Changes:');
report.forEach((r) =>
	console.log(
		`  - ${r.target}: median=${r.median} oldMax=${r.oldMax} newMax=${r.newMax}`,
	),
);
if (report.length === 0) console.log('  (no changes)');
