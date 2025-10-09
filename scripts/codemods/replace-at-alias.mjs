#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative as rel, sep } from 'node:path';

const roots = ['packages', 'apps', 'services', 'servers', 'src'];

const exts = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const ignoreDirs = new Set([
	'node_modules',
	'dist',
	'build',
	'coverage',
	'.git',
	'.nx',
	'.pnpm-store',
	'.vitest-tmp-docs',
	'.vitest-tmp-target',
	'.venv',
	'.uv-cache',
	'reports',
]);

function walk(dir, files = []) {
	for (const name of readdirSync(dir)) {
		if (name.startsWith('.')) {
			// allow .cortex, but skip .git/.nx etc via ignoreDirs
		}
		const full = join(dir, name);
		const st = statSync(full);
		if (st.isDirectory()) {
			if (ignoreDirs.has(name)) continue;
			walk(full, files);
		} else {
			const idx = name.lastIndexOf('.');
			const ext = idx >= 0 ? name.slice(idx) : '';
			if (exts.has(ext)) files.push(full);
		}
	}
	return files;
}

function findPackageRoot(start) {
	let cur = start;
	while (cur && cur !== dirname(cur)) {
		try {
			const pkg = join(cur, 'package.json');
			const hasPkg = statSync(pkg).isFile();
			if (hasPkg) return cur;
		} catch {}
		cur = dirname(cur);
	}
	return null;
}

function toPosix(p) {
	return p.split(sep).join(posix.sep);
}

const importRe = /((?:import|export)\s+[^'"\n]*?from\s*["'])([^"']+)(["'])/g;
const importBareRe = /(import\s*["'])([^"']+)(["'])/g; // import 'x'
const requireRe = /(require\(\s*["'])([^"']+)(["']\s*\))/g;
const dynImportRe = /(import\(\s*["'])([^"']+)(["']\s*\))/g;

function replaceSpecifier(file, srcRoot, code) {
	const dir = dirname(file);
	const replacer = (_m, p1, spec, p3) => {
		if (!spec.startsWith('@/')) return _m;
		const rest = spec.slice(2);
		const targetAbs = join(srcRoot, rest);
		let rp = toPosix(rel(dir, targetAbs));
		if (!rp.startsWith('.')) rp = `./${rp}`;
		return `${p1}${rp}${p3}`;
	};
	return code
		.replace(importRe, replacer)
		.replace(importBareRe, replacer)
		.replace(requireRe, replacer)
		.replace(dynImportRe, replacer);
}

let changed = 0;
const allFiles = roots.flatMap((r) => {
	try {
		return walk(r);
	} catch {
		return [];
	}
});
for (const f of allFiles) {
	const pkgRoot = findPackageRoot(f);
	if (!pkgRoot) continue;
	const srcRoot = join(pkgRoot, 'src');
	try {
		if (!statSync(srcRoot).isDirectory()) continue;
	} catch {
		continue;
	}
	const before = readFileSync(f, 'utf8');
	if (!before.includes('@/')) continue;
	const after = replaceSpecifier(f, srcRoot, before);
	if (after !== before) {
		writeFileSync(f, after, 'utf8');
		changed++;
	}
}
console.log(`replace-at-alias: updated ${changed} files`);
