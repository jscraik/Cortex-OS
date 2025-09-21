#!/usr/bin/env node
// Wrapper script that forwards to the prp-runner semantic search demo.
// Usage:
//   node scripts/semantic-search-demo.mjs --dir ./docs --query "What is Cortex-OS?" --topK 5

import { spawn } from 'node:child_process';

function parseArgs(argv) {
	const args = { dir: './docs', query: 'What is this project about?', topK: 5 };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--dir' || a === '-d') args.dir = argv[i + 1] ?? args.dir;
		if (a === '--query' || a === '-q') args.query = argv[i + 1] ?? args.query;
		if (a === '--topK' || a === '-k') args.topK = Number(argv[i + 1] ?? args.topK);
	}
	return args;
}

const { dir, query, topK } = parseArgs(process.argv.slice(2));

const cmd = 'pnpm';
const forwarded = [
	'-s',
	'-C',
	'packages/prp-runner',
	'demo:semsearch',
	'--',
	'--dir',
	dir,
	'--query',
	query,
	'--topK',
	String(topK),
];

const child = spawn(cmd, forwarded, { stdio: 'inherit', shell: false });
child.on('exit', (code) => process.exit(code ?? 0));
