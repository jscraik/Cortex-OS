#!/usr/bin/env node
/**
 * Pre-build orchestration script
 *
 * Goals:
 * 1. Provide a fast, memory-safe preview of affected projects for a given target (default: build)
 * 2. Optionally pre-warm the Nx cache by running lightweight "noop" or typecheck steps first
 * 3. Enforce memory hygiene before starting heavier build steps
 * 4. Emit a machine-readable summary for other scripts (JSON to stdout with --json)
 *
 * Usage:
 *   node scripts/prebuild-graph.mjs [--target build|test|lint|typecheck] [--json] [--focus pkg1,pkg2] [--dry-run]
 *
 * Integration:
 *   Can be invoked manually or wired as an npm script (e.g., "prebuild:graph").
 *
 * Environment Variables:
 *   NX_BASE / NX_HEAD  Override git base/head (falls back to origin/main and HEAD)
 *   CORTEX_SMART_FOCUS Same semantics as --focus
 *
 * Exit Codes:
 *   0 Success
 *   1 Unexpected error or memory hygiene violation
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function log(level, msg) {
	const ts = new Date().toISOString();
	console.error(`[${ts}] [PREBUILD] [${level}] ${msg}`);
}

function parseArgs() {
	const raw = process.argv.slice(2);
	const opts = { target: 'build', json: false, focus: null, dryRun: false };
	let i = 0;
	while (i < raw.length) {
		const a = raw[i];
		switch (a) {
			case '--target': {
				const v = raw[i + 1];
				if (v) {
					opts.target = v;
					i += 2;
					break;
				}
				i += 1;
				break;
			}
			case '--json':
				opts.json = true;
				i += 1;
				break;
			case '--focus': {
				const v = raw[i + 1];
				if (v) {
					opts.focus = v;
					i += 2;
					break;
				}
				i += 1;
				break;
			}
			case '--dry-run':
				opts.dryRun = true;
				i += 1;
				break;
			case '--help':
			case '-h':
				console.log(
					'Usage: node scripts/prebuild-graph.mjs [--target build|test|lint|typecheck] [--json] [--focus pkga,pkgB] [--dry-run]',
				);
				process.exit(0);
			default:
				i += 1;
				break;
		}
	}
	if (!opts.focus && process.env.CORTEX_SMART_FOCUS) {
		opts.focus = process.env.CORTEX_SMART_FOCUS;
	}
	return opts;
}

function _gitRev(ref) {
	try {
		return execSync(`git rev-parse ${ref}`, { encoding: 'utf8' }).trim();
	} catch {
		return null;
	}
}

function ensureGit() {
	execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
}

function memoryHygieneCheck() {
	try {
		const procList = execSync(
			"ps -Ao pid,rss,comm | grep -E '(vitest|tsc|node)' | grep -v grep | head -25",
			{ encoding: 'utf8' },
		);
		const lines = procList.split(/\n/).filter(Boolean);
		let warnings = 0;
		for (const l of lines) {
			const parts = l.trim().split(/\s+/);
			if (parts.length < 3) continue;
			const rssKB = parseInt(parts[1], 10);
			if (rssKB > 1900000) {
				// ~1.9GB
				warnings++;
				log('WARN', `Process high RSS (${(rssKB / 1024).toFixed(0)}MB): ${l}`);
			}
		}
		if (warnings > 0) {
			log('ERROR', 'Memory hygiene violation detected. Run: pnpm memory:clean:gentle');
			return false;
		}
		return true;
	} catch (err) {
		log('WARN', `Memory hygiene check failed: ${err.message}`);
		return true; // Do not block build if ps fails
	}
}

function computeAffected(target, focus, dryRun) {
	// Use nx print-affected for accuracy; fall back to show projects
	const base = process.env.NX_BASE || 'origin/main';
	const head = process.env.NX_HEAD || 'HEAD';
	const cmd = `npx nx print-affected --base=${base} --head=${head} --target=${target} --select=projects --plain`;
	let projects = [];
	try {
		const out = execSync(cmd, {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		}).trim();
		projects = out ? out.split(/\s+/).filter(Boolean) : [];
	} catch (err) {
		log('WARN', `print-affected failed (${err.message}); falling back to listing all with target`);
		try {
			const fallback = execSync(`npx nx show projects --with-target=${target} --noInteractive`, {
				encoding: 'utf8',
			});
			projects = fallback.split(/\n/).filter(Boolean);
		} catch (e2) {
			log('ERROR', `Unable to determine projects: ${e2.message}`);
			process.exit(1);
		}
	}

	let focused = projects;
	let focusNotice = null;
	if (focus) {
		const focusSet = new Set(
			focus
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean),
		);
		const intersection = projects.filter((p) => focusSet.has(p));
		if (intersection.length > 0) {
			focused = intersection;
			focusNotice = `Applied focus filter (${intersection.length}/${projects.length}).`;
		} else {
			focusNotice = 'Focus filter produced no intersection; using full affected set.';
		}
	}

	// Optionally: pre-warm by running typecheck on focused set if target=build and not dry-run
	let prewarmRan = false;
	if (!dryRun && target === 'build' && focused.length > 0) {
		try {
			log('INFO', `Pre-warming with typecheck for ${focused.length} project(s)`);
			spawnSync(
				'npx',
				['nx', 'run-many', '-t', 'typecheck', '--projects', focused.join(','), '--parallel=1'],
				{ stdio: 'inherit' },
			);
			prewarmRan = true;
		} catch (err) {
			log('WARN', `Pre-warm failed: ${err.message}`);
		}
	}

	return { base, head, projects, focused, focusNotice, prewarmRan };
}

function writeSummary(summary, jsonMode) {
	const outDir = join(rootDir, 'reports');
	try {
		if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	} catch {}
	const file = join(outDir, 'prebuild-summary.json');
	try {
		writeFileSync(file, JSON.stringify(summary, null, 2));
	} catch (e) {
		log('WARN', `Failed to write summary: ${e.message}`);
	}
	if (jsonMode) {
		console.log(JSON.stringify(summary));
	} else {
		log(
			'INFO',
			`Affected projects (${summary.projects.length}): ${summary.projects.join(', ') || '(none)'}`,
		);
		if (summary.focusNotice) log('INFO', summary.focusNotice);
		log(
			'INFO',
			`Focused set (${summary.focused.length}): ${summary.focused.join(', ') || '(none)'}`,
		);
		log('INFO', `Prewarm executed: ${summary.prewarmRan}`);
		log('INFO', `Base=${summary.base} Head=${summary.head}`);
	}
}

function main() {
	const opts = parseArgs();
	ensureGit();
	log('INFO', `Pre-build orchestration start target=${opts.target} dryRun=${opts.dryRun}`);

	if (!memoryHygieneCheck()) {
		process.exit(1);
	}

	const summary = computeAffected(opts.target, opts.focus, opts.dryRun);
	writeSummary(
		{
			timestamp: new Date().toISOString(),
			...summary,
			target: opts.target,
			dryRun: opts.dryRun,
		},
		opts.json,
	);
}

try {
	if (process.argv[1] === fileURLToPath(import.meta.url)) {
		main();
	}
} catch (err) {
	log('ERROR', err.stack || err.message);
	process.exit(1);
}
