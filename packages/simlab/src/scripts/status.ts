import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { simScenarioSchema } from '../schemas.js';

const scenarioDir = fileURLToPath(
	new URL('../../sim/scenarios', import.meta.url),
);
const files = readdirSync(scenarioDir).filter((f) => f.endsWith('.json'));

let scenarioCount = 0;
for (const file of files) {
	try {
		const data = JSON.parse(readFileSync(join(scenarioDir, file), 'utf-8'));
		const parsed = z.array(simScenarioSchema).parse(data);
		scenarioCount += parsed.length;
	} catch {
		// ignore malformed files
	}
}

console.log(
	JSON.stringify(
		{
			status: 'ok',
			scenarios: scenarioCount,
			files: files.length,
			timestamp: new Date().toISOString(),
		},
		null,
		2,
	),
);
