#!/usr/bin/env node
// Wrapper script that forwards to the prp-runner MCP HTTP demo.
// Usage:
//   node scripts/mcp-http-demo.mjs --port 8081

import { spawn } from 'node:child_process';

function parseArgs(argv) {
	let port = 8081;
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--port' || a === '-p') {
			const p = Number(argv[i + 1]);
			if (!Number.isNaN(p)) port = p;
		}
	}
	return { port };
}

const { port } = parseArgs(process.argv.slice(2));

const cmd = 'pnpm';
const forwarded = [
	'-s',
	'-C',
	'packages/prp-runner',
	'demo:mcp',
	'--',
	'--port',
	String(port),
];

const child = spawn(cmd, forwarded, { stdio: 'inherit', shell: false });
child.on('exit', (code) => process.exit(code ?? 0));
