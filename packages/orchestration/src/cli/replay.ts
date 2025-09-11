#!/usr/bin/env node
import { loadCheckpointHistory } from '../lib/checkpoints';

async function main() {
	const runId = process.argv[2];
	if (!runId) {
		console.error('Usage: replay <runId>');
		process.exit(1);
	}
	const history = await loadCheckpointHistory(runId);
	if (history.length === 0) {
		console.log(`No checkpoints for runId=${runId}`);
		process.exit(0);
	}
	for (const cp of history) {
		console.log(`[${cp.ts}] node=${cp.node} state=${JSON.stringify(cp.state)}`);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
