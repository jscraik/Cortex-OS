// ESM fast-check fuzz harness that sends randomized payloads to a target HTTP endpoint

import fs from 'node:fs';
import axios from 'axios';
import fc from 'fast-check';
import minimist from 'minimist';

export async function runFuzz({
	target = 'http://localhost:3000/api/test',
	iterations = 100,
	out = 'fuzz-results.txt',
	payloadGenerator,
} = {}) {
	const results = [];
	for (let i = 0; i < iterations; i++) {
		try {
			const payload = payloadGenerator ? payloadGenerator(i) : fc.sample(fc.jsonObject(), 1)[0];
			const res = await axios.post(target, payload, { timeout: 5000 });
			results.push({ i, status: res.status });
		} catch (err) {
			results.push({ i, error: String(err) });
		}
	}
	fs.writeFileSync(out, JSON.stringify(results, null, 2));
	return results;
}

// CLI entry when executed directly
if (process.argv?.[1]?.endsWith?.('run-fuzz.js')) {
	const argv = minimist(process.argv.slice(2));
	const target = argv.target || 'http://localhost:3000/api/test';
	const iterations = parseInt(argv.iterations || '100', 10);
	runFuzz({ target, iterations })
		.then(() => {
			console.log('Fuzzing complete');
		})
		.catch((e) => {
			console.error('Fuzz run failed', e);
			process.exit(2);
		});
}
