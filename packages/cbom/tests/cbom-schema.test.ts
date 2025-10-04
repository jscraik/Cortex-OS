import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

function createAjv() {
	const instance = new Ajv2020({ strict: true, allErrors: true });
	addFormats(instance);
	return instance;
}

async function loadSchema(name: string) {
	const schemaPath = path.resolve('schemas', name);
	const raw = await readFile(schemaPath, 'utf8');
	return JSON.parse(raw);
}

async function loadSample() {
	const samplePath = path.resolve('packages/cbom/examples/sample.cbom.json');
	const raw = await readFile(samplePath, 'utf8');
	return JSON.parse(raw);
}

describe('CBOM schema', () => {
	it('accepts the sample CBOM document', async () => {
		const schema = await loadSchema('cbom.schema.json');
		const validate = createAjv().compile(schema);
		const sample = await loadSample();
		expect(validate(sample)).toBe(true);
	});

	it('rejects documents missing required sections', async () => {
		const schema = await loadSchema('cbom.schema.json');
		const validate = createAjv().compile(schema);
		const invalid = { version: '1.0.0' };
		expect(validate(invalid)).toBe(false);
		expect(
			validate.errors?.some((error) => error.instancePath === '' && error.keyword === 'required'),
		).toBe(true);
	});
});
