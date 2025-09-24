import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { ensureReferenceStubs } from '../sync-docs.js';

const refsDir = join(__dirname, '..', 'docs', 'references');

describe('ensureReferenceStubs', () => {
	beforeEach(async () => {
		// Remove all existing stub files to test recreation
		try {
			const entries = await fs.readdir(refsDir);
			await Promise.all(entries.map((e) => fs.unlink(join(refsDir, e))));
		} catch {
			// ignore
		}
	});

	it('creates stub files for mapped references', async () => {
		const created = await ensureReferenceStubs();
		expect(created).toBeGreaterThan(0);
		const after = await fs.readdir(refsDir);
		expect(after.length).toBeGreaterThan(0);
	});
});
