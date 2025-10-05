import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createCycloneDxExporter } from '../src/exporters/cyclonedx.js';
import type { CbomDocument } from '../src/types.js';

async function loadSample() {
	const samplePath = path.resolve('packages/cbom/examples/sample.cbom.json');
	const raw = await readFile(samplePath, 'utf8');
	return JSON.parse(raw) as CbomDocument;
}

describe('CycloneDX exporter', () => {
	it('produces components for each decision', async () => {
		const sample = await loadSample();
		const bom = createCycloneDxExporter(sample);
		expect(bom.components).toHaveLength(sample.decisions.length);
		expect(bom.metadata.tools[0]?.name).toBe('cortex-cbom');
	});
});
