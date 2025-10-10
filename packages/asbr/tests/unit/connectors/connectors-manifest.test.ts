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
                        schema_version: '1.0.0',
                        generated_at: '2025-01-01T00:00:00Z',
                        connectors: [
                                {
                                        id: 'github-actions',
                                        version: '0.4.1',
                                        status: 'disabled',
                                        scopes: ['repos:read', 'actions:trigger'],
                                        quotas: {
                                                per_minute: 5,
                                                per_hour: 50,
                                                per_day: 400,
                                        },
                                        ttl_seconds: 900,
                                },
                                {
                                        id: 'perplexity-search',
                                        version: '1.2.0',
                                        status: 'enabled',
                                        scopes: ['search:query', 'search:insights'],
                                        quotas: {
                                                per_minute: 30,
                                                per_hour: 300,
                                                per_day: 3000,
                                        },
                                        ttl_seconds: 3600,
                                },
                        ],
                });

                const signature = signConnectorServiceMap(serviceMap, 'test-secret');
                expect(signature).toBe('b95ae3f836e286c5926b8ca555130bc3dcd3c050372276d8bc59de6c3ef68959');
        });
});
