import { describe, expect, it, vi } from 'vitest';
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
                const fixedNow = new Date('2025-01-01T00:00:00Z');
                vi.useFakeTimers();
                vi.setSystemTime(fixedNow);

                try {
                        const manifest = await loadConnectorsManifest(manifestPath);
                        const serviceMap = buildConnectorServiceMap(manifest);

                        expect(serviceMap).toEqual({
                                id: 'core-connectors',
                                brand: 'brAInwav',
                                generatedAt: '2025-01-01T00:00:00.000Z',
                                ttlSeconds: 300,
                                connectors: [
                                        {
                                                id: 'github-actions',
                                                name: 'GitHub Actions Dispatcher',
                                                version: '0.4.1',
                                                scopes: ['repos:read', 'actions:trigger'],
                                                status: 'disabled',
                                                ttl: 1735690500,
                                                quotas: {
                                                        perMinute: 5,
                                                        perHour: 50,
                                                        perDay: 400,
                                                },
                                                metadata: {
                                                        notes: 'Disabled until SOC2 control review completes',
                                                },
                                                auth: {
                                                        type: 'apiKey',
                                                        headerName: 'X-GitHub-Token',
                                                },
                                        },
                                        {
                                                id: 'perplexity-search',
                                                name: 'Perplexity Search',
                                                version: '1.2.0',
                                                scopes: ['search:query', 'search:insights'],
                                                status: 'enabled',
                                                ttl: 1735693200,
                                                quotas: {
                                                        perMinute: 30,
                                                        perHour: 300,
                                                        perDay: 3000,
                                                },
                                                metadata: {
                                                        owner: 'integrations',
                                                        category: 'search',
                                                },
                                                auth: {
                                                        type: 'bearer',
                                                        headerName: 'Authorization',
                                                },
                                        },
                                        {
                                                id: 'wikidata',
                                                name: 'Wikidata Vector Search',
                                                version: '2024.09.18',
                                                scopes: ['facts:query', 'facts:claims'],
                                                status: 'enabled',
                                                ttl: 1735689900,
                                                metadata: {
                                                        brand: 'brAInwav',
                                                        provider: 'Wikidata',
                                                        snapshot: '2024-09-18',
                                                },
                                                endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
                                                auth: {
                                                        type: 'none',
                                                },
                                        },
                                ],
                        });

                        const signature = signConnectorServiceMap(serviceMap, 'test-secret');
                        expect(signature).toBe('8c3480d3bb6fd96d5fa0e1f408dc191a8c5b9fb59c43583a0cc7f841f0cdb7ff');
                } finally {
                        vi.useRealTimers();
                }
        });
});
