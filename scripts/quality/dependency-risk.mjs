#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

function run(cmd) {
	return execSync(cmd, { encoding: 'utf8' }).trim();
}

function parseLock(lockText) {
	const deps = {};
	// Very lightweight parse: lines like '  name@version:' under packages section
	// minimal parse; not robust but sufficient for diff signal
	lockText.split(/\n/).forEach((line) => {
		const m = line.match(/^ {2}([^:@]+)@([^:]+):$/); // simplistic
		if (m) {
			deps[m[1]] = m[2];
		}
	});
	return deps;
}

function semverDiff(oldV, newV) {
	if (!oldV) return 'new';
	const o = oldV.replace(/^v/, '').split('.').map(Number);
	const n = newV.replace(/^v/, '').split('.').map(Number);
	if (o.length < 3 || n.length < 3) return 'unknown';
	if (n[0] > o[0]) return 'major';
	if (n[0] === o[0] && n[1] > o[1]) return 'minor';
	if (n[0] === o[0] && n[1] === o[1] && n[2] > o[2]) return 'patch';
	if (n[0] === o[0] && n[1] === o[1] && n[2] === o[2]) return 'same';
	return 'downgrade';
}

function riskLevel(diff) {
	switch (diff) {
		case 'major':
			return 'high';
		case 'minor':
			return 'medium';
		case 'patch':
			return 'low';
		case 'new':
			return 'informational';
		case 'downgrade':
			return 'medium';
		default:
			return 'unknown';
	}
}

function main() {
	const prev = run('git rev-parse HEAD~1 || echo') || '';
	if (!prev) {
		console.error('[dep-risk] No previous commit; skipping');
		process.exit(0);
	}
	const prevLock = run('git show HEAD~1:pnpm-lock.yaml');
	const curLock = readFileSync('pnpm-lock.yaml', 'utf8');
	const prevDeps = parseLock(prevLock);
	const curDeps = parseLock(curLock);
	const changes = [];
	Object.keys(curDeps).forEach((name) => {
		const oldV = prevDeps[name];
		const newV = curDeps[name];
		if (oldV !== newV) {
			const diff = semverDiff(oldV, newV);
			changes.push({
				name,
				old: oldV || null,
				new: newV,
				diff,
				risk: riskLevel(diff),
			});
		}
	});
	const summary = {
		totalChanges: changes.length,
		byRisk: changes.reduce((acc, c) => {
			acc[c.risk] = (acc[c.risk] || 0) + 1;
			return acc;
		}, {}),
		changes: changes.slice(0, 200),
	};
	if (!existsSync('reports')) mkdirSync('reports');
	writeFileSync('reports/dependency-risk.json', JSON.stringify(summary, null, 2));
	console.log(`[dep-risk] Summary:\n${JSON.stringify(summary, null, 2)}`);
}

main();
