#!/usr/bin/env -S ts-node --esm
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
	connectorsManifestSchema,
	connectorsServiceMapSchema,
} from '../../packages/asbr/src/types/connectors.ts';

const MODULE_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(MODULE_PATH), '../..');
const SCHEMA_DIR = resolve(REPO_ROOT, 'schemas');

interface SchemaArtifact {
	name: string;
	fileName: string;
	definition: ReturnType<typeof zodToJsonSchema>;
}

function writeSchema({ name, fileName, definition }: SchemaArtifact) {
	const target = resolve(SCHEMA_DIR, fileName);
	mkdirSync(dirname(target), { recursive: true });
	const normalized = { ...definition } as Record<string, unknown>;
	delete normalized.$schema;
	const document = {
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		$title: name,
		...normalized,
	};
	writeFileSync(target, JSON.stringify(document, null, 2), 'utf-8');
	// eslint-disable-next-line no-console
	console.log(`Generated ${fileName}`);
}

const artifacts: SchemaArtifact[] = [
	{
		name: 'ConnectorsManifest',
		fileName: 'connectors-manifest.schema.json',
		definition: zodToJsonSchema(connectorsManifestSchema, 'ConnectorsManifest'),
	},
	{
		name: 'ConnectorsServiceMap',
		fileName: 'connectors-service-map.schema.json',
		definition: zodToJsonSchema(connectorsServiceMapSchema, 'ConnectorsServiceMap'),
	},
];

artifacts.forEach(writeSchema);
