#!/usr/bin/env node
import fs from 'node:fs';

function fail(msg) {
	console.error(`[perf-check] ${msg}`);
	process.exit(1);
}

const baselinePath = process.argv[2] || 'performance-baseline.json';
const metricsPath = process.argv[3];
if (!metricsPath) fail('Usage: perf-check.mjs <baseline.json> <metrics.json>');

if (!fs.existsSync(baselinePath)) fail(`Baseline not found: ${baselinePath}`);
if (!fs.existsExists && !fs.existsSync(metricsPath)) fail(`Metrics not found: ${metricsPath}`);

let baseline, metrics;
try {
	baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
} catch (e) {
	fail(`Invalid baseline JSON: ${e.message}`);
}
try {
	metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
} catch (e) {
	fail(`Invalid metrics JSON: ${e.message}`);
}

const target = metrics.target;
if (!target) fail('Metrics missing target');
const baseEntry = baseline.targets?.[target];
if (!baseEntry) {
	console.log(`[perf-check] No baseline entry for target ${target}; skipping gate.`);
	process.exit(0);
}

const maxMs = baseEntry.maxMs;
if (typeof maxMs !== 'number') fail(`Baseline maxMs missing/invalid for ${target}`);
const duration = metrics.durationMs;
if (typeof duration !== 'number') fail('Metrics missing durationMs');

if (duration > maxMs) {
	if (process.env.ALLOW_PERF_DRIFT === '1') {
		console.warn(
			`[perf-check] WARNING: target ${target} duration ${duration}ms exceeds baseline ${maxMs}ms but ALLOW_PERF_DRIFT=1 set.`,
		);
		process.exit(0);
	}
	fail(`Performance regression: ${target} duration ${duration}ms > baseline ${maxMs}ms`);
}
console.log(`[perf-check] OK: ${target} duration ${duration}ms <= ${maxMs}ms baseline.`);

// Append to performance history if enabled
const historyFile = process.env.PERF_HISTORY_FILE || 'performance-history.json';
try {
	const entry = {
		target,
		durationMs: duration,
		timestamp: new Date().toISOString(),
		gitSha: process.env.GITHUB_SHA || process.env.COMMIT_SHA || null,
	};
	let history = [];
	if (fs.existsSync(historyFile)) {
		try {
			history = JSON.parse(fs.readFileSync(historyFile, 'utf8')) || [];
		} catch {
			history = [];
		}
	}
	history.push(entry);
	// Optional limit to avoid unbounded growth
	const limit = parseInt(process.env.PERF_HISTORY_LIMIT || '200', 10);
	if (history.length > limit) history = history.slice(history.length - limit);
	fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
	console.log(`[perf-check] history appended (${history.length} entries, file=${historyFile}).`);
} catch (e) {
	console.warn('[perf-check] failed to append history:', e.message);
}
