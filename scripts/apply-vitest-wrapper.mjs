#!/usr/bin/env node
/**
 * Bulk apply memory-safe vitest wrapper across all packages/apps.
 * Converts raw `vitest run` and variants to `node <rel>/scripts/vitest-safe.mjs run`.
 * Disables watch/ui modes. Adds test:safe if missing.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(__dirname);

function log(level, msg) {
	console.log(`[${new Date().toISOString()}] [WRAP] [${level}] ${msg}`);
}

function listPackageJsonFiles() {
	const out = execSync('cat /tmp/all_packages.txt', { encoding: 'utf-8' });
	return out.split(/\n/).filter(Boolean);
}

function computeWrapperPath(pkgJsonPath) {
	const pkgDir = dirname(pkgJsonPath);
	// path from package dir to repo root scripts/vitest-safe.mjs
	const rel = relative(pkgDir, repoRoot).split(sep).join('/');
	return rel.length
		? `${rel}/scripts/vitest-safe.mjs`
		: 'scripts/vitest-safe.mjs';
}

const VITEST_RAW_PATTERNS = [
	/^vitest run( |$)/,
	/^vitest --run( |$)/,
	/^vitest$/,
	/^vitest watch$/,
	/^vitest --watch$/,
	/^vitest run --coverage( |$)/,
	/^vitest run tests\//,
	/^vitest run -c /,
];

function transformScript(cmd, wrapperRel) {
	if (!cmd || typeof cmd !== 'string') return cmd;
	const trimmed = cmd.trim();
	// Already wrapped
	if (trimmed.includes('vitest-safe.mjs')) return cmd;

	// Disallow watch/ui
	if (/vitest.*(--watch|watch|--ui| ui )/.test(trimmed)) {
		return "echo 'DISABLED: watch/UI mode blocked for memory safety'";
	}

	for (const pat of VITEST_RAW_PATTERNS) {
		if (pat.test(trimmed)) {
			// Extract args after 'vitest'
			const after = trimmed.replace(/^vitest\s*/, '');
			// Normalize leading 'run'
			const normalized = after.startsWith('run')
				? after.replace(/^run\s*/, '')
				: after;
			const finalArgs = normalized.length ? normalized : '';
			return `node ${wrapperRel} run ${finalArgs}`.trim();
		}
	}
	return cmd;
}

function processPackage(pkgPath) {
	let json;
	try {
		json = JSON.parse(readFileSync(pkgPath, 'utf-8'));
	} catch (e) {
		log('ERROR', `Failed to parse ${pkgPath}: ${e.message}`);
		return false;
	}
	if (!json.scripts) return false;
	const wrapperRel = computeWrapperPath(pkgPath);
	let changed = false;
	for (const [k, v] of Object.entries(json.scripts)) {
		const newCmd = transformScript(v, wrapperRel);
		if (newCmd !== v) {
			json.scripts[k] = newCmd;
			changed = true;
			log('INFO', `Updated ${pkgPath} script ${k}`);
		}
	}
	if (!json.scripts['test:safe']) {
		json.scripts['test:safe'] = `node ${wrapperRel} run`;
		changed = true;
		log('INFO', `Added test:safe to ${pkgPath}`);
	}
	if (changed) {
		writeFileSync(pkgPath, `${JSON.stringify(json, null, 2)}\n`);
	}
	return changed;
}

function main() {
	log('INFO', 'Starting bulk vitest wrapper application');
	const files = listPackageJsonFiles();
	let touched = 0;
	for (const f of files) {
		if (processPackage(f)) touched++;
	}
	log(
		'INFO',
		`Completed. Modified ${touched}/${files.length} package.json files.`,
	);
	if (touched > 0) {
		log('INFO', 'Run: git add . && git diff --staged | less   (to review)');
	}
}

if (process.argv[1] === __filename) {
	main();
}
