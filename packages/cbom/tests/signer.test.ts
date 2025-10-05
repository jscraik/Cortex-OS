import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createCbomEmitter } from '../src/emitter.js';
import { CbomSigner, verifyCbomBundle } from '../src/signer.js';

async function createCbomFixture(directory: string): Promise<string> {
	const emitter = createCbomEmitter({ runId: 'run:test' });
	const filePath = path.join(directory, 'fixture.cbom.json');
	await emitter.flushToFile(filePath);
	return filePath;
}

describe('CbomSigner', () => {
	it('signs and verifies a CBOM document', async () => {
		const workDir = await mkdtemp(path.join(tmpdir(), 'cbom-signer-'));
		const cbomPath = await createCbomFixture(workDir);
		const bundlePath = path.join(workDir, 'bundle.json');
		const signer = new CbomSigner();
		await signer.sign(cbomPath, { output: bundlePath });
		await signer.verify(bundlePath, { cbomPath });
	});

	it('fails verification when digest mismatches', async () => {
		const workDir = await mkdtemp(path.join(tmpdir(), 'cbom-signer-fail-'));
		const cbomPath = await createCbomFixture(workDir);
		const bundlePath = path.join(workDir, 'bundle.json');
		const signer = new CbomSigner();
		const bundle = await signer.sign(cbomPath, { output: bundlePath });
		const updated = `${await readFile(cbomPath, 'utf8')}\n`;
		await writeFile(cbomPath, updated);
		expect(() => verifyCbomBundle(bundle, cbomPath)).toThrow(
			'CBOM digest mismatch during attestation verification',
		);
	});
});
