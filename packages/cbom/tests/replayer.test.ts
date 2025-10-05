import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createCbomEmitter } from '../src/emitter.js';
import { CbomReplayer } from '../src/replayer.js';
import type { CbomDecision } from '../src/types.js';

async function createDecisionDoc(decisionOverrides: Partial<CbomDecision> = {}) {
	const emitter = createCbomEmitter();
	const doc = emitter.snapshot();
	doc.decisions.push({
		id: 'dec:test',
		name: 'deterministic-step',
		timestamp: new Date().toISOString(),
		determinism: { mode: 'deterministic' },
		outputs: [],
		...decisionOverrides,
	});
	const file = path.join(await mkdtemp(path.join(tmpdir(), 'cbom-replay-')), 'doc.json');
	await writeFile(file, JSON.stringify(doc, null, 2), 'utf8');
	return file;
}

describe('CbomReplayer', () => {
	it('counts deterministic decisions as matched', async () => {
		const file = await createDecisionDoc();
		const replayer = new CbomReplayer();
		const result = await replayer.replay(file);
		expect(result.matched).toBeGreaterThan(0);
	});

	it('skips non-deterministic decisions', async () => {
		const file = await createDecisionDoc({
			id: 'dec:prob',
			determinism: { mode: 'non-deterministic' },
		});
		const replayer = new CbomReplayer();
		const result = await replayer.replay(file);
		expect(result.skipped).toBeGreaterThan(0);
	});
});
