#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Generate a CycloneDX SBOM for Node workspace using Syft.
import { execa } from 'execa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'sbom');
const outFile = path.join(outDir, 'sbom.cdx.json');

async function hasBinary(cmd) {
	try {
		await execa('bash', ['-lc', `command -v ${cmd}`]);
		return true;
	} catch {
		return false;
	}
}

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function generateWithSyft() {
	await ensureDir(outDir);
	// Syft supports dir: and cyclonedx-json
	await execa('syft', ['dir:.', '--output', `cyclonedx-json=${outFile}`], {
		cwd: repoRoot,
		stdio: 'inherit',
	});
	return outFile;
}
async function main() {
	if (!(await hasBinary('syft'))) {
		throw new Error('Syft binary not found. Install from https://github.com/anchore/syft');
	}
	const file = await generateWithSyft();
	console.log(`SBOM written: ${path.relative(repoRoot, file)}`);
}

main().catch((e) => {
	console.error('[generate-sbom] Failed:', e?.message || e);
	process.exit(1);
});
