import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROUTES_DIR = path.resolve(__dirname, '../src/routes');

async function listRouteFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const entryPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await listRouteFiles(entryPath)));
		} else if (entry.isFile() && entry.name.endsWith('.ts')) {
			files.push(entryPath);
		}
	}
	return files;
}

describe('API routing completeness', () => {
	it('does not contain TODO placeholders in route handlers', async () => {
		const routeFiles = await listRouteFiles(ROUTES_DIR);
		expect(routeFiles.length).toBeGreaterThan(0);

		const offenders: Array<{ file: string; line: number; text: string }> = [];
		for (const file of routeFiles) {
			const content = await readFile(file, 'utf-8');
			const lines = content.split(/\r?\n/);
			lines.forEach((line, index) => {
				if (/\bTODO\b/i.test(line)) {
					offenders.push({ file, line: index + 1, text: line.trim() });
				}
			});
		}

		if (offenders.length > 0) {
			const details = offenders
				.map((offender) => `${offender.file}:${offender.line} → ${offender.text}`)
				.join('\n');
			throw new Error(`Detected TODO placeholders in API routes:\n${details}`);
		}
	});
});
