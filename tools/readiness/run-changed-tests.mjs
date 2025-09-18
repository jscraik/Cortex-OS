#!/usr/bin/env node

// Runs tests only for packages affected by the current branch's changes.
// - Detects changed files vs upstream (or origin/main fallback)
// - Maps to nearest package.json (excluding repo root)
// - If only docs/config changed, skip tests and exit 0
// - Otherwise, runs vitest in each changed package (reporter=dot by default)
//   Set PREPUSH_COVERAGE=1 to include coverage reporters.

import fs from 'node:fs';
import path from 'node:path';
import { execa } from 'execa';

function log(msg) {
	// eslint-disable-next-line no-console
	console.log(`[pre-push] ${msg}`);
}

function isFile(pathLike) {
	try {
		return fs.existsSync(pathLike) && fs.statSync(pathLike).isFile();
	} catch {
		return false;
	}
}

async function git(args, opts = {}) {
	const { stdout } = await execa('git', args, {
		stdio: ['ignore', 'pipe', 'pipe'],
		...opts,
	});
	return stdout.trim();
}

async function getRepoRoot() {
	return git(['rev-parse', '--show-toplevel']);
}

async function getUpstreamRef() {
	try {
		const ref = await git([
			'rev-parse',
			'--abbrev-ref',
			'--symbolic-full-name',
			'@{u}',
		]);
		return ref;
	} catch {
		return null;
	}
}

async function _refExists(ref) {
	try {
		await execa(
			'git',
			['show-ref', '--verify', `refs/remotes/${ref.replace('origin/', '')}`],
			{
				stdio: 'ignore',
			},
		);
		return true;
	} catch {
		return false;
	}
}

function isDocsOrConfigFile(fpRel) {
	const p = fpRel.replace(/\\/g, '/');
	if (
		p.startsWith('docs/') ||
		p.startsWith('.github/') ||
		p.startsWith('.changeset/') ||
		p.startsWith('.vscode/') ||
		p.startsWith('a11y/') ||
		p.startsWith('mkdocs/') ||
		p.startsWith('docker/')
	)
		return true;

	const base = path.basename(p).toLowerCase();
	if (['license', 'notice'].includes(base)) return true;
	if (base === 'readme.md' || base === 'changelog.md') return true;
	if (base === 'mkdocs.yml' || base === 'mkdocs.yaml') return true;

	const ext = path.extname(p).toLowerCase().replace(/^\./, '');
	const docExts = new Set(['md', 'mdx', 'markdown', 'txt']);
	const cfgExts = new Set(['yml', 'yaml', 'toml', 'ini', 'cfg']);
	if (docExts.has(ext) || cfgExts.has(ext)) return true;

	// Note: package.json changes are considered code-affecting; do NOT skip
	if (path.basename(p) === 'package.json') return false;

	return false;
}

async function getChangedFiles(repoRoot) {
	// Determine base ref
	let baseRef = null;
	const upstream = await getUpstreamRef();
	if (upstream) {
		try {
			baseRef = await git(['merge-base', 'HEAD', upstream]);
		} catch {
			// ignore
		}
	}
	if (!baseRef) {
		try {
			await execa('git', ['rev-parse', '--verify', 'origin/main'], {
				stdio: 'ignore',
			});
			baseRef = await git(['merge-base', 'HEAD', 'origin/main']);
		} catch {
			throw new Error(
				'Unable to determine base reference; ensure origin/main exists',
			);
		}
	}

	const diff = await git(
		['diff', '--name-only', '--diff-filter=ACMRTUXB', baseRef, 'HEAD'],
		{
			cwd: repoRoot,
		},
	);
	const files = diff.split('\n').filter(Boolean);
	return files;
}

function findNearestPackageDir(repoRoot, filePathRel) {
	const abs = path.resolve(repoRoot, filePathRel);
	let dir = path.dirname(abs);
	const rootPkgJson = path.join(repoRoot, 'package.json');
	while (dir?.startsWith(repoRoot)) {
		const pkgJson = path.join(dir, 'package.json');
		if (pkgJson !== rootPkgJson && isFile(pkgJson)) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

async function runPackageTests(pkgDir, _opts = {}) {
	const useCoverage = process.env.PREPUSH_COVERAGE === '1';
	const args = ['exec', 'vitest', 'run', '--reporter=dot'];
	if (useCoverage)
		args.push(
			'--coverage',
			'--coverage.reporter=json-summary',
			'--coverage.reporter=text-summary',
		);
	log(
		`Testing ${path.relative(process.cwd(), pkgDir)}${useCoverage ? ' (coverage)' : ''}`,
	);
	try {
		await execa('pnpm', args, { cwd: pkgDir, stdio: 'inherit' });
		return true;
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(
			`[pre-push] Tests failed in ${pkgDir}: ${err?.shortMessage || err?.message}`,
		);
		return false;
	}
}

async function main() {
	const repoRoot = await getRepoRoot();
	const argv = new Set(process.argv.slice(2));
	const files = await getChangedFiles(repoRoot);
	if (files.length === 0) {
		log('No changed files detected vs base; running workspace tests.');
		if (argv.has('--dry')) return;
		await execa('pnpm', ['test', '-w'], { stdio: 'inherit' });
		return;
	}

	const docOnly = files.every((f) => isDocsOrConfigFile(f));
	const pkgDirs = Array.from(
		new Set(
			files.map((f) => findNearestPackageDir(repoRoot, f)).filter(Boolean),
		),
	);

	log(
		`Changed files: ${files.length}, mapped packages: ${pkgDirs.length}, doc/config-only: ${docOnly}`,
	);
	if (argv.has('--dry')) {
		const list =
			pkgDirs.map((d) => ` - ${path.relative(repoRoot, d)}`).join('\n') ||
			' (none)';
		log(`Dry run: would test packages ->\n${list}`);
		return;
	}

	if (docOnly && pkgDirs.length === 0) {
		log('Docs/config-only change detected; skipping tests.');
		return;
	}

	if (pkgDirs.length === 0) {
		log(
			'No package dirs mapped but non-doc changes detected; running workspace tests.',
		);
		await execa('pnpm', ['test', '-w'], { stdio: 'inherit' });
		return;
	}

	let anyFailed = false;
	for (const dir of pkgDirs) {
		const ok = await runPackageTests(dir);
		if (!ok) anyFailed = true;
	}
	if (anyFailed) process.exit(1);
}

main().catch((e) => {
	// eslint-disable-next-line no-console
	console.error('[pre-push] Fatal error', e);
	process.exit(1);
});
