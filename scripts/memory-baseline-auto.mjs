#!/usr/bin/env node
/**
 * memory-baseline-auto.mjs
 *
 * Purpose:
 *   Automated baseline refresh helper. Intended for periodic CI (e.g., scheduled) or
 *   manual invocation when a legitimate memory increase is accepted.
 *
 * Behavior:
 *   - Reads current baseline at reports/memory-baseline.json (if present)
 *   - Reads last guard evaluation at reports/memory-regression-last.json
 *   - If last run status === 'pass' and peakMB within optional safety window, may refresh baseline
 *   - Age policy: if baseline older than --max-age-days (default 14) AND last run passed -> refresh
 *   - Force mode: --force overwrites baseline with last pass regardless of age
 *   - Safety window: --max-allowed-pct PCT (default 50) vs existing baseline to prevent runaway baseline inflation
 *
 * Exit Codes:
 *   0 success/no-op
 *   1 unrecoverable error (bad JSON etc.)
 *   2 safety rejection (attempted refresh outside policy)
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const reportsDir = join(rootDir, 'reports');
const baselinePath = join(reportsDir, 'memory-baseline.json');
const lastPath = join(reportsDir, 'memory-regression-last.json');

function log(level, msg) {
	const ts = new Date().toISOString();
	console.error(`[${ts}] [MEM-AUTO] [${level}] ${msg}`);
}

function parseArgs() {
	const args = process.argv.slice(2);
	const opts = { maxAgeDays: 14, force: false, maxAllowedPct: 50 };
	let i = 0;
	while (i < args.length) {
		const a = args[i];
		if (a === '--max-age-days') {
			const val = args[i + 1];
			if (val) opts.maxAgeDays = parseInt(val, 10);
			i += 2;
			continue;
		}
		if (a === '--force') {
			opts.force = true;
			i += 1;
			continue;
		}
		if (a === '--max-allowed-pct') {
			const val = args[i + 1];
			if (val) opts.maxAllowedPct = parseFloat(val);
			i += 2;
			continue;
		}
		if (a === '--help' || a === '-h') {
			console.log(
				'Usage: node scripts/memory-baseline-auto.mjs [--max-age-days N] [--force] [--max-allowed-pct P]',
			);
			process.exit(0);
		}
		// Unrecognized token -> advance
		i += 1;
	}
	return opts;
}

function readJson(path) {
	try {
		return JSON.parse(readFileSync(path, 'utf8'));
	} catch {
		return null;
	}
}

function fileAgeDays(path) {
	try {
		const m = statSync(path).mtimeMs;
		return (Date.now() - m) / (1000 * 60 * 60 * 24);
	} catch {
		return Infinity;
	}
}

function main() {
	const opts = parseArgs();
	if (!existsSync(lastPath)) {
		log('INFO', 'No last regression summary – run memory:regression first. No-op.');
		return;
	}
	const last = readJson(lastPath);
	if (!last) {
		log('ERROR', 'Unable to parse last regression summary');
		process.exit(1);
	}
	if (last.status !== 'pass') {
		log('INFO', `Last run status=${last.status} – not refreshing baseline.`);
		return;
	}
	const lastPeak = last.peakMB;
	const baseline = readJson(baselinePath);
	if (!baseline) {
		log('INFO', 'Baseline missing – promoting last run as new baseline.');
		promote(lastPeak, 'missing');
		return;
	}
	const age = fileAgeDays(baselinePath);
	const pctIncrease =
		baseline.peakMB > 0 ? ((lastPeak - baseline.peakMB) / baseline.peakMB) * 100 : 0;

	if (!opts.force) {
		if (age < opts.maxAgeDays) {
			log('INFO', `Baseline age ${age.toFixed(1)}d < maxAgeDays ${opts.maxAgeDays} – no refresh.`);
			return;
		}
		if (pctIncrease > opts.maxAllowedPct) {
			log(
				'WARN',
				`Refusing refresh: lastPeak increased ${pctIncrease.toFixed(1)}% (> ${opts.maxAllowedPct}%) vs existing baseline.`,
			);
			process.exit(2);
		}
	} else {
		log('INFO', 'Force mode enabled – bypassing age & pct checks.');
	}

	promote(lastPeak, 'policy');

	function promote(peak, reason) {
		try {
			mkdirSync(reportsDir, { recursive: true });
		} catch {}
		const newBaseline = {
			peakMB: peak,
			updatedAt: new Date().toISOString(),
			reason,
		};
		writeFileSync(baselinePath, JSON.stringify(newBaseline, null, 2));
		log('INFO', `Baseline refreshed (reason=${reason}) peakMB=${peak}`);
	}
}

try {
	main();
} catch (err) {
	log('ERROR', err.stack || err.message);
	process.exit(1);
}
