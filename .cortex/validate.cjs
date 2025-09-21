#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

function fail(msg) {
	console.error(`[.cortex] ${msg}`);
	process.exit(1);
}

function main() {
	const cfgPath = path.resolve(process.cwd(), '.cortex/config.yml');
	if (!fs.existsSync(cfgPath)) fail('Missing .cortex/config.yml');
	const content = fs.readFileSync(cfgPath, 'utf8');
	const requiredKeys = ['version:', 'validate:', 'boundaries:'];
	for (const key of requiredKeys) {
		if (!content.includes(key)) fail(`Missing key: ${key}`);
	}
	const agentsDoc = fs.existsSync(path.resolve(process.cwd(), 'AGENTS.md'));
	if (!agentsDoc) fail('AGENTS.md not found');
	// Very light sync check: verify key sections present
	const agents = fs.readFileSync(path.resolve(process.cwd(), 'AGENTS.md'), 'utf8');
	for (const section of [
		'## Roles',
		'## Boundaries',
		'## Inputs',
		'## Outputs',
		'## Memory',
		'## Governance',
	]) {
		if (!agents.includes(section)) fail(`AGENTS.md missing section: ${section}`);
	}
	console.log('[.cortex] Validation passed');
}

main();
