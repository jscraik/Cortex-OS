import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiOpenApiJson } from './spec.js';

const outputPath = (() => {
	const currentDir = dirname(fileURLToPath(import.meta.url));
	return join(currentDir, '..', '..', 'dist', 'openapi.json');
})();

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, apiOpenApiJson, 'utf8');
console.log(`[brAInwav][openapi-export] spec written to ${outputPath}`);
