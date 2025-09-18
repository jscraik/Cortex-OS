#!/usr/bin/env -S node
import { readFileSync } from 'node:fs';
import fg from 'fast-glob';

const md = readFileSync('AGENTS.md', 'utf8');
const policy = JSON.parse(readFileSync('.cortex/policy/agents.mandates.json', 'utf8'));

if (!md.startsWith(policy.requiredHeader)) {
	console.error('AGENTS.md: missing required header');
	process.exit(1);
}
if (!md.includes(policy.requiredLine)) {
	console.error('AGENTS.md: missing required line');
	process.exit(1);
}
for (const sec of policy.requiredSections) {
	if (!md.match(new RegExp(`^##\\s+${sec}\\b`, 'm'))) {
		console.error(`AGENTS.md: missing section '${sec}'`);
		process.exit(1);
	}
}
for (const forbid of policy.forbiddenPhrases) {
	if (md.toLowerCase().includes(forbid.toLowerCase())) {
		console.error(`AGENTS.md: forbidden phrase '${forbid}'`);
		process.exit(1);
	}
}

const files = await fg(policy.filesThatMustReferenceAgents, { dot: true });
const offenders: string[] = [];
for (const f of files) {
	const t = readFileSync(f, 'utf8');
	if (!t.includes('AGENTS.md is authoritative')) offenders.push(f);
}
if (offenders.length) {
	console.error(`Files must reference AGENTS.md:\n${offenders.join('\n')}`);
	process.exit(1);
}
console.log('agents OK');
