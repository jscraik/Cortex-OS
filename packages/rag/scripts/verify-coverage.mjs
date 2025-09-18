#!/usr/bin/env node
// Verify package-local coverage against readiness thresholds and optionally auto-raise them.
import fs from 'node:fs';
import path from 'node:path';

const pkgDir = path.resolve(process.cwd());
const readinessPath = path.join(pkgDir, 'readiness.yml');
const summaryPath = path.join(pkgDir, 'coverage-rag', 'coverage-summary.json');

function parseYamlSimple(yamlText) {
	// A minimal YAML parser for our simple readiness.yml structure
	const obj = {};
	let currentKey = null;
	for (const raw of yamlText.split(/\r?\n/)) {
		const line = raw.trimEnd();
		if (!line || line.startsWith('#')) continue;
		if (!line.startsWith(' ') && line.includes(':')) {
			const [k, ...rest] = line.split(':');
			currentKey = k.trim();
			const val = rest.join(':').trim();
			if (val === '') {
				obj[currentKey] = {};
			} else {
				obj[currentKey] = parseScalar(val);
			}
			continue;
		}
		if (line.startsWith('  ') && currentKey) {
			const l2 = line.slice(2);
			const [k, ...rest] = l2.split(':');
			const val = rest.join(':').trim();
			if (typeof obj[currentKey] !== 'object' || obj[currentKey] === null)
				obj[currentKey] = {};
			obj[currentKey][k.trim()] = parseScalar(val);
		}
	}
	return obj;
}

function parseScalar(v) {
	if (v === 'true') return true;
	if (v === 'false') return false;
	if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
	if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
	if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
	return v;
}

function stringifyYamlSimple(obj) {
	const lines = [];
	for (const [k, v] of Object.entries(obj)) {
		if (v && typeof v === 'object' && !Array.isArray(v)) {
			lines.push(`${k}:`);
			for (const [k2, v2] of Object.entries(v)) {
				lines.push(`  ${k2}: ${v2}`);
			}
		} else {
			lines.push(`${k}: ${v}`);
		}
	}
	return `${lines.join('\n')}\n`;
}

function fail(msg) {
	console.error(`[verify-coverage] ${msg}`);
	process.exit(1);
}

const args = new Set(process.argv.slice(2));
const autoRaise = args.has('--auto-raise');
const dryRun = args.has('--dry-run');

if (!fs.existsSync(summaryPath))
	fail(
		`Missing coverage summary: ${summaryPath}. Run pnpm -C packages/rag test:coverage first.`,
	);
if (!fs.existsSync(readinessPath))
	fail(`Missing readiness file: ${readinessPath}`);

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const readinessText = fs.readFileSync(readinessPath, 'utf8');
const readiness = parseYamlSimple(readinessText);

const totals = summary.total || {};
const current = {
	statements: Math.floor(totals.statements?.pct ?? 0),
	branches: Math.floor(totals.branches?.pct ?? 0),
	functions: Math.floor(totals.functions?.pct ?? 0),
	lines: Math.floor(totals.lines?.pct ?? 0),
};

const thresholds = readiness.thresholds || {};
const required = {
	statements: Number(thresholds.statements ?? 0),
	branches: Number(thresholds.branches ?? 0),
	functions: Number(thresholds.functions ?? 0),
	lines: Number(thresholds.lines ?? 0),
};

const missing = Object.entries(required).filter(([k, req]) => current[k] < req);
if (missing.length) {
	console.error('[verify-coverage] Coverage below thresholds:');
	for (const [k, req] of missing) {
		console.error(`  - ${k}: required ${req}%, current ${current[k]}%`);
	}
	process.exit(2);
}

if (autoRaise) {
	// Only raise, never lower
	const next = { ...readiness };
	next.thresholds = { ...required };
	for (const key of Object.keys(current)) {
		if (current[key] > required[key]) next.thresholds[key] = current[key];
	}
	const out = stringifyYamlSimple(next);
	if (dryRun) {
		console.log('--- readiness.yml (dry-run new thresholds) ---');
		console.log(out);
	} else {
		fs.writeFileSync(readinessPath, out, 'utf8');
		console.log('[verify-coverage] thresholds updated in readiness.yml');
	}
} else {
	console.log('[verify-coverage] OK: coverage meets thresholds');
}
