import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import {
	attachSignature,
	buildConnectorServiceMap,
	loadConnectorsManifest,
	signConnectorServiceMap,
} from '../../../src/connectors/manifest.js';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '../../../../../..');
const schemaPath = resolve(repoRoot, 'schemas', 'connectors-manifest.schema.json');
const manifestPath = resolve(repoRoot, 'config', 'connectors.manifest.json');

describe('connectors manifest', () => {
	it('complies with the published JSON schema', async () => {
		const schema = JSON.parse(await readFile(schemaPath, 'utf-8'));
		const validate = ajv.compile(schema);
		const manifestJson = JSON.parse(await readFile(manifestPath, 'utf-8'));

		const isValid = validate(manifestJson);
		if (!isValid && validate.errors) {
			console.error('Schema validation errors', validate.errors);
		}

		expect(isValid).toBe(true);
	});

	it('produces a deterministic service map and signature', async () => {
		const manifest = await loadConnectorsManifest(manifestPath);
		const serviceMap = buildConnectorServiceMap(manifest);

		expect(serviceMap).toEqual({
			id: '01JAG0Y4ZP1XK9YZ2FQ0N3WVCH',
			brand: 'brAInwav',
			generatedAt: '2025-10-10T00:00:00Z',
			ttlSeconds: 900,
			connectors: [
				{
					id: 'github-actions',
					version: '0.4.1',
					displayName: 'GitHub Actions Dispatcher',
					endpoint: 'https://connectors.brainwav.ai/github/actions',
					auth: { type: 'apiKey', headerName: 'X-GitHub-Token' },
					scopes: ['repos:read', 'actions:trigger'],
					ttlSeconds: 900,
					enabled: false,
					metadata: {
						brand: 'brAInwav',
						notes: 'Disabled until SOC2 control review completes',
						category: 'automation',
					},
					quotas: {
						perMinute: 5,
						perHour: 50,
						perDay: 400,
					},
					headers: {
						'X-GitHub-Token': '${GITHUB_TOKEN:provided-at-runtime}',
					},
					description: 'Dispatch GitHub workflow runs after security review completes.',
					tags: ['automation', 'ci'],
				},
				{
					id: 'perplexity-search',
					version: '1.2.0',
					displayName: 'Perplexity Search',
					endpoint: 'https://connectors.brainwav.ai/perplexity/search',
					auth: { type: 'bearer', headerName: 'Authorization' },
					scopes: ['search:query', 'search:insights'],
					ttlSeconds: 3600,
					enabled: true,
					metadata: {
						brand: 'brAInwav',
						owner: 'integrations',
						category: 'search',
					},
					quotas: {
						perMinute: 30,
						perHour: 300,
						perDay: 3000,
						concurrent: 8,
					},
					headers: {
						Authorization: 'Bearer ${PERPLEXITY_API_KEY}',
						'X-Cortex-Connector': 'perplexity-search',
					},
					description:
						'Search aggregation connector that proxies Perplexity Answers without exposing API secrets.',
					tags: ['search', 'knowledge'],
				},
				{
					id: 'wikidata',
					version: '2024.09.18',
					displayName: 'Wikidata Semantic Search',
					endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
					auth: { type: 'none' },
					scopes: ['wikidata:vector-search', 'wikidata:claims', 'wikidata:sparql'],
					ttlSeconds: 1800,
					enabled: true,
					metadata: {
						brand: 'brAInwav',
						dumpDate: '2024-09-18',
						vectorModel: 'jina-embeddings-v3',
						embeddingDimensions: 1024,
						supportsMatryoshka: true,
						languages: ['en', 'fr', 'ar'],
						datasetMd5: 'dd7375a69774324dead6d3ea5abc01b7',
					},
					description:
						'Semantic search over the 2024-09-18 Wikidata snapshot with claims and SPARQL fallbacks.',
					tags: ['knowledge', 'graph'],
				},
			],
		});

		const signature = signConnectorServiceMap(serviceMap, 'test-secret');
		expect(signature).toBe('Gow9oCfRXDJYbTF5q4xRjLLGrwh6J-s_Tynsw9r3pqg');

		const signed = attachSignature(serviceMap, signature);
		expect(signed.signature).toBe(signature);
	});
});
