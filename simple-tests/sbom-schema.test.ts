import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(
	__dirname,
	'../tools/schema/cyclonedx-1.5.schema.json',
);
const samplePath = path.join(__dirname, 'fixtures/cyclonedx-sample.json');
const spdxPath = path.join(__dirname, '../tools/schema/spdx.schema.json');
const jsfPath = path.join(__dirname, '../tools/schema/jsf-0.82.schema.json');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
const spdxSchema = JSON.parse(fs.readFileSync(spdxPath, 'utf8'));
const jsfSchema = JSON.parse(fs.readFileSync(jsfPath, 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(spdxSchema, 'spdx.schema.json');
ajv.addSchema(jsfSchema, 'jsf-0.82.schema.json');
const validate = ajv.compile(schema);

describe('CycloneDX SBOM schema', () => {
	it('accepts a valid sample', () => {
		const valid = validate(sample);
		expect(valid).toBe(true);
	});

	it('rejects an invalid sample', () => {
		const invalid = {};
		const valid = validate(invalid);
		expect(valid).toBe(false);
	});
});
