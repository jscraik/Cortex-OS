#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const STORE =
	process.env.CORTEX_HITL_STORE ||
	path.join(process.cwd(), 'data', 'events', 'hitl.jsonl');

async function appendJsonl(file: string, obj: unknown) {
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.appendFile(file, `${JSON.stringify(obj)}\n`, 'utf8');
}

async function main() {
	const [requestId, decisionRaw] = process.argv.slice(2);
	if (!requestId || typeof decisionRaw === 'undefined') {
		console.error('Usage: approve <requestId> <true|false>');
		process.exit(1);
	}
	const approved = /^true$/i.test(decisionRaw);
	const evt = {
		type: 'decision',
		requestId,
		approved,
		ts: new Date().toISOString(),
	};
	await appendJsonl(STORE, evt);
	console.log(`Recorded decision for ${requestId}: ${approved}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
