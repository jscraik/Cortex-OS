#!/usr/bin/env tsx

import { runSmoke } from './smoke-shared.js';

async function main() {
	console.log('🔥 Running SimLab smoke tests...');
	const seed = process.env.SIMLAB_SEED
		? parseInt(process.env.SIMLAB_SEED, 10)
		: 12345;
	try {
		await runSmoke({
			scenarioFile: 'sim/scenarios/critical.json',
			count: 5,
			seed,
			maxTurns: 8,
			timeout: 30000,
			gatePassRate: 0.8,
			label: 'smoke',
		});
		console.log('\n✅ Smoke tests passed gate requirements');
	} catch (err) {
		console.error(`\n🚫 ${err instanceof Error ? err.message : String(err)}`);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
