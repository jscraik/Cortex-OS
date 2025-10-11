import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
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
        it('validates the manifest against the JSON schema', async () => {
                const schema = JSON.parse(await readFile(schemaPath, 'utf-8'));
                const validate = ajv.compile(schema);
                const manifestJson = JSON.parse(await readFile(manifestPath, 'utf-8'));

                const isValid = validate(manifestJson);
                if (!isValid && validate.errors) {
                        console.error('Schema validation errors', validate.errors);
                }

                expect(isValid).toBe(true);
        });

        it('builds a deterministic service map and signature', async () => {
                const manifest = await loadConnectorsManifest(manifestPath);
                const serviceMap = buildConnectorServiceMap(manifest);

                expect(serviceMap).toEqual({
                        id: 'brAInwav-connectors',
                        brand: 'brAInwav',
                        generatedAt: '2024-09-18T00:00:00Z',
                        ttlSeconds: 3600,
                        connectors: [
                                {
                                        id: 'wikidata',
                                        version: '2024.09.18',
                                        displayName: 'Wikidata Semantic Search',
                                        endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
                                        auth: { type: 'none' },
                                        scopes: [
                                                'wikidata:vector-search',
                                                'wikidata:claims',
                                                'wikidata:sparql',
                                        ],
                                        ttlSeconds: 3600,
                                        enabled: true,
                                        metadata: {
                                                brand: 'brAInwav',
                                                dumpDate: '2024-09-18',
                                                embeddingDimensions: 1024,
                                                languages: ['en', 'fr', 'ar'],
                                                supportsMatryoshka: true,
                                                vectorModel: 'jina-embeddings-v3',
                                                datasetMd5: 'dd7375a69774324dead6d3ea5abc01b7',
                                        },
                                },
                        ],
                });

                const signature = signConnectorServiceMap({ ...serviceMap, signature: '' }, 'test-secret');
                expect(signature).toBe('3e080d883ac7d57c88fa843c7ca2a59806dfdf2c5e549376b9b809a1d36c252c');
        });
});
