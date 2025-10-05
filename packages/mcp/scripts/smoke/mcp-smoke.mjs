#!/usr/bin/env node
import { access, constants } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const brand = 'brAInwav';
const repoRoot = resolve(new URL('../../../../', import.meta.url).pathname);
const checks = [];

async function checkExecutable(relativePath, label) {
	const absolute = resolve(repoRoot, relativePath);
	try {
		await access(absolute, constants.X_OK);
		checks.push({ label, status: 'ok', path: absolute });
	} catch (error) {
		checks.push({ label, status: 'fail', path: absolute, error: error.message });
	}
}

async function main() {
	await checkExecutable('scripts/mcp/guard_port_3024.sh', 'guard-script');
	await checkExecutable('scripts/mcp/health_probe.sh', 'health-probe');

	const summary = {
		brand,
		checks,
		timestamp: new Date().toISOString(),
	};

	const hasFailure = checks.some((item) => item.status !== 'ok');
	const requireFn = createRequire(import.meta.url);
	let prettyJson;
	try {
		const { default: stringify } = requireFn('../../../../tools/json/stringify.js');
		prettyJson = stringify(summary);
	} catch (error) {
		console.warn(`[${brand}] Falling back to JSON.stringify: ${error instanceof Error ? error.message : String(error)}`);
		prettyJson = JSON.stringify(summary, null, 2);
	}

	console.log(prettyJson);
	if (hasFailure) {
		console.error(`[${brand}] MCP smoke check detected issues.`);
		process.exit(1);
	}

	console.log(`[${brand}] MCP smoke check passed.`);
}

main().catch((error) => {
	console.error(`[${brand}] MCP smoke check crashed`, error);
	process.exit(1);
});
