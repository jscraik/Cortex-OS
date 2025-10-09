#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['.', 'packages', 'apps', 'services'];
const files = [];

function walk(dir) {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		const st = statSync(full);
		if (st.isDirectory()) {
			if (
				name === 'node_modules' ||
				name === 'dist' ||
				name === 'build' ||
				name === '.git' ||
				name === '.nx'
			)
				continue;
			walk(full);
		} else if (name.match(/^tsconfig(\..+)?\.json$/)) {
			files.push(full);
		}
	}
}

for (const r of roots) {
	try {
		walk(r);
	} catch {}
}

let updated = 0;
for (const f of files) {
	let json;
	try {
		json = JSON.parse(readFileSync(f, 'utf8'));
	} catch {
		continue;
	}
	if (!json.compilerOptions) continue;
	const co = json.compilerOptions;
	let changed = false;
	if (co.baseUrl !== undefined) {
		delete co.baseUrl;
		changed = true;
	}
	if (co.paths !== undefined) {
		delete co.paths;
		changed = true;
	}
	if (co.moduleResolution !== 'NodeNext') {
		co.moduleResolution = 'NodeNext';
		changed = true;
	}
	if (!co.ignoreDeprecations) {
		co.ignoreDeprecations = '6.0';
		changed = true;
	}
	if (changed) {
		writeFileSync(f, `${JSON.stringify(json, null, 2)}\n`);
		updated++;
	}
}
console.log(`tsconfig-cleanup: updated ${updated} files`);
