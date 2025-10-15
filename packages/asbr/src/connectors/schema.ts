import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url));
export const CONNECTORS_MANIFEST_SCHEMA_PATH = resolve(
	MODULE_DIR,
	'../../../../schemas/connectors-manifest.schema.json',
);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const schemaDocument = JSON.parse(
	readFileSync(CONNECTORS_MANIFEST_SCHEMA_PATH, 'utf-8'),
) as Record<string, unknown>;
const validateManifest = ajv.compile(schemaDocument);

export function assertManifestDocument(document: unknown): void {
	if (validateManifest(document)) {
		return;
	}

	const [firstError] = validateManifest.errors ?? [];
	const location = firstError?.instancePath?.replace(/^\//, '').replace(/\//g, '.') ?? '<root>';
	const reason = firstError?.message ?? 'unknown validation error';

	throw new Error(
		`[brAInwav] Connectors manifest schema validation failed at ${
			location || '<root>'
		}: ${reason}`,
	);
}

export function getManifestSchema(): Record<string, unknown> {
	return schemaDocument;
}
